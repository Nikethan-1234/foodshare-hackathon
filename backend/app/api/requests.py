from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import Listing, Request, StatusHistory, User
from app.auth.decorators import role_required, active_user_required
from app.services.expiry_service import check_and_expire_listings

requests_bp = Blueprint("requests", __name__)


@requests_bp.route("/", methods=["POST"])
@role_required("recipient")
def create_request():
    # First run quick expiry check
    check_and_expire_listings()

    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    listing_id = data.get("listing_id")
    if not listing_id:
        return jsonify({"error": "Validation failed", "fields": {"listing_id": "Listing ID is required."}}), 422

    listing = Listing.query.get(listing_id)
    if not listing:
        return jsonify({"error": "Listing not found"}), 404

    if listing.status != "AVAILABLE" or listing.quantity_left <= 0:
        return jsonify({"error": "This listing is no longer available for requests."}), 400

    # Check if recipient already has an active request for this listing
    existing_req = Request.query.filter(
        Request.listing_id == listing_id,
        Request.recipient_id == user_id,
        Request.status.in_(["PENDING", "ACCEPTED"])
    ).first()
    if existing_req:
        return jsonify({
            "error": "You already have an active request for this food listing.",
            "existing_request_id": existing_req.id,
            "status": existing_req.status
        }), 400

    # Validate quantity
    quantity = data.get("quantity")
    if quantity is None or quantity == "":
        return jsonify({"error": "Validation failed", "fields": {"quantity": "Quantity is required."}}), 422
    try:
        qty = int(quantity)
        if qty <= 0:
            return jsonify({"error": "Validation failed", "fields": {"quantity": "Quantity must be at least 1."}}), 422
        if qty > listing.quantity_left:
            return jsonify({
                "error": "Validation failed",
                "fields": {
                    "quantity": f"Requested quantity ({qty}) exceeds available amount ({listing.quantity_left} {listing.unit})."
                }
            }), 422
    except (ValueError, TypeError):
        return jsonify({"error": "Validation failed", "fields": {"quantity": "Quantity must be a valid whole number."}}), 422

    note = data.get("note", "").strip() if data.get("note") else ""

    req = Request(
        listing_id=listing.id,
        recipient_id=user_id,
        quantity=qty,
        status="PENDING",
        note=note,
    )
    db.session.add(req)
    db.session.flush()

    status_entry = StatusHistory(
        entity_type="request",
        entity_id=req.id,
        from_status=None,
        to_status="PENDING",
        actor_id=user_id,
        note="Request submitted by recipient",
    )
    db.session.add(status_entry)
    db.session.commit()

    return jsonify({"request": req.to_dict()}), 201


@requests_bp.route("/mine", methods=["GET"])
@role_required("recipient")
def get_my_requests():
    check_and_expire_listings()
    user_id = int(get_jwt_identity())
    status_filter = request.args.get("status")

    query = Request.query.filter_by(recipient_id=user_id)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter_by(status=status_filter.upper())

    reqs = query.order_by(Request.created_at.desc()).all()
    return jsonify({"requests": [r.to_dict() for r in reqs]}), 200


@requests_bp.route("/donor", methods=["GET"])
@role_required("donor")
def get_donor_requests():
    check_and_expire_listings()
    user_id = int(get_jwt_identity())
    status_filter = request.args.get("status")

    # Get all listings belonging to this donor
    donor_listings = Listing.query.filter_by(donor_id=user_id).all()
    listing_ids = [l.id for l in donor_listings]

    if not listing_ids:
        return jsonify({"requests": []}), 200

    query = Request.query.filter(Request.listing_id.in_(listing_ids))
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter_by(status=status_filter.upper())

    reqs = query.order_by(Request.created_at.desc()).all()
    return jsonify({"requests": [r.to_dict() for r in reqs]}), 200


@requests_bp.route("/<int:request_id>/accept", methods=["POST"])
@role_required("donor")
def accept_request(request_id):
    """
    CRITICAL RULE:
    Accepting a request re-checks quantity_left in one transaction (no double booking).
    """
    user_id = int(get_jwt_identity())

    # Start transactional atomic lock on the listing
    req = Request.query.get_or_404(request_id)
    listing = Listing.query.filter_by(id=req.listing_id).with_for_update().first()

    if not listing:
        return jsonify({"error": "Listing not found"}), 404

    if listing.donor_id != user_id:
        return jsonify({"error": "You do not own this listing"}), 403

    if listing.status != "AVAILABLE":
        return jsonify({"error": f"Cannot accept requests for a listing with status '{listing.status}'"}), 400

    if listing.pickup_end <= datetime.utcnow():
        return jsonify({"error": "Cannot accept request because the pickup window has expired."}), 400

    if req.status != "PENDING":
        return jsonify({"error": f"Cannot accept request with status '{req.status}'. Only PENDING requests can be accepted."}), 400

    # Re-check quantity_left inside the transaction!
    if listing.quantity_left < req.quantity:
        return jsonify({
            "error": "Double booking prevented",
            "message": f"Insufficient quantity remaining to accept this request. Only {listing.quantity_left} {listing.unit} available, but {req.quantity} requested.",
            "quantity_left": listing.quantity_left,
            "quantity_requested": req.quantity
        }), 409

    # Decrement quantity_left
    listing.quantity_left -= req.quantity
    old_req_status = req.status
    req.status = "ACCEPTED"

    # Log request status history
    db.session.add(StatusHistory(
        entity_type="request",
        entity_id=req.id,
        from_status=old_req_status,
        to_status="ACCEPTED",
        actor_id=user_id,
        note=f"Accepted by donor. {req.quantity} {listing.unit} locked.",
    ))

    # If quantity_left reaches 0, transition listing status to RESERVED
    if listing.quantity_left == 0 and listing.status == "AVAILABLE":
        old_listing_status = listing.status
        listing.status = "RESERVED"
        db.session.add(StatusHistory(
            entity_type="listing",
            entity_id=listing.id,
            from_status=old_listing_status,
            to_status="RESERVED",
            actor_id=user_id,
            note="Listing fully reserved after accepting request",
        ))

    db.session.commit()
    return jsonify({
        "request": req.to_dict(),
        "listing": listing.to_dict(),
        "message": "Request accepted successfully. Quantity has been locked."
    }), 200


@requests_bp.route("/<int:request_id>/reject", methods=["POST"])
@active_user_required
def reject_request(request_id):
    """
    Reject request:
    - Donor can reject a PENDING incoming request.
    - Recipient can reject/decline a request they submitted (releasing locked quantity if ACCEPTED).
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    req = Request.query.get_or_404(request_id)
    listing = req.listing

    is_donor = listing and listing.donor_id == user_id
    is_recipient = req.recipient_id == user_id

    if not (is_donor or is_recipient or (user and user.role == "admin")):
        return jsonify({"error": "You do not have permission to reject this request"}), 403

    reason = request.get_json().get("reason", "").strip() if request.get_json() else ""

    if is_donor:
        if req.status != "PENDING":
            return jsonify({"error": f"Cannot reject request with status '{req.status}'. Only PENDING requests can be rejected by donor."}), 400
        old_status = req.status
        req.status = "REJECTED"
        note = f"Rejected by donor. {reason}".strip()
    else:
        # Recipient rejecting/declining request
        if req.status in ["COMPLETED", "REJECTED", "CANCELLED"]:
            return jsonify({"error": f"Cannot reject a request that is already {req.status.lower()}."}), 400
        old_status = req.status
        req.status = "REJECTED"
        note = f"Rejected by recipient. {reason}".strip()

        # If old status was ACCEPTED, return quantity to the listing
        if old_status == "ACCEPTED" and listing:
            listing.quantity_left = min(listing.quantity_left + req.quantity, listing.quantity_total)
            if listing.status == "RESERVED" and listing.quantity_left > 0:
                listing.status = "EXPIRED" if listing.pickup_end <= datetime.utcnow() else "AVAILABLE"

    db.session.add(StatusHistory(
        entity_type="request",
        entity_id=req.id,
        from_status=old_status,
        to_status="REJECTED",
        actor_id=user_id,
        note=note,
    ))

    db.session.commit()
    return jsonify({"request": req.to_dict(), "message": "Request rejected successfully"}), 200


@requests_bp.route("/<int:request_id>/complete", methods=["POST"])
@active_user_required
def complete_request(request_id):
    """
    Pickup Confirmation: Either donor or recipient can confirm pickup.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    req = Request.query.get_or_404(request_id)
    listing = req.listing

    # Must be either the donor who listed it or the recipient who requested it
    is_donor = listing and listing.donor_id == user_id
    is_recipient = req.recipient_id == user_id
    if not (is_donor or is_recipient or user.role == "admin"):
        return jsonify({"error": "You do not have permission to confirm this pickup"}), 403

    if req.status != "ACCEPTED":
        return jsonify({"error": f"Cannot complete a request with status '{req.status}'. Only ACCEPTED requests can be completed."}), 400

    old_status = req.status
    req.status = "COMPLETED"

    actor_label = "donor" if is_donor else ("recipient" if is_recipient else "admin")
    db.session.add(StatusHistory(
        entity_type="request",
        entity_id=req.id,
        from_status=old_status,
        to_status="COMPLETED",
        actor_id=user_id,
        note=f"Pickup confirmed and completed by {actor_label}",
    ))

    # Check if the parent listing should also transition to COMPLETED:
    # If all surplus quantity has been claimed (quantity_left == 0) and
    # all requests on the listing are now finished (none PENDING or ACCEPTED)
    if listing and listing.quantity_left == 0:
        active_remaining = listing.requests.filter(Request.status.in_(["PENDING", "ACCEPTED"])).count()
        if active_remaining == 0 and listing.status != "COMPLETED":
            old_listing_status = listing.status
            listing.status = "COMPLETED"
            db.session.add(StatusHistory(
                entity_type="listing",
                entity_id=listing.id,
                from_status=old_listing_status,
                to_status="COMPLETED",
                actor_id=user_id,
                note="Listing marked completed: all reserved food picked up successfully",
            ))

    db.session.commit()
    return jsonify({"request": req.to_dict(), "message": "Pickup confirmed and marked as completed!"}), 200


@requests_bp.route("/<int:request_id>/cancel", methods=["POST"])
@role_required("recipient")
def cancel_request(request_id):
    user_id = int(get_jwt_identity())
    req = Request.query.get_or_404(request_id)

    if req.recipient_id != user_id:
        return jsonify({"error": "You do not have permission to cancel this request"}), 403

    if req.status in ["COMPLETED", "REJECTED", "CANCELLED"]:
        return jsonify({"error": f"Cannot cancel a request that is already {req.status.lower()}"}), 400

    old_status = req.status
    req.status = "CANCELLED"

    reason = request.get_json().get("reason", "").strip() if request.get_json() else ""
    note = f"Cancelled by recipient. {reason}".strip()
    db.session.add(StatusHistory(
        entity_type="request",
        entity_id=req.id,
        from_status=old_status,
        to_status="CANCELLED",
        actor_id=user_id,
        note=note,
    ))

    # RULE: Cancelling an accepted request returns quantity to the listing
    if old_status == "ACCEPTED":
        listing = req.listing
        listing.quantity_left = min(listing.quantity_left + req.quantity, listing.quantity_total)
        listing_from_status = listing.status
        is_past_expiry = listing.pickup_end <= datetime.utcnow()

        if listing.status == "RESERVED" and listing.quantity_left > 0:
            target_status = "EXPIRED" if is_past_expiry else "AVAILABLE"
            listing.status = target_status
            db.session.add(StatusHistory(
                entity_type="listing",
                entity_id=listing.id,
                from_status=listing_from_status,
                to_status=target_status,
                actor_id=user_id,
                note=f"{req.quantity} {listing.unit} restored to listing after recipient cancelled accepted request" + (
                    " (pickup window ended: marked EXPIRED)" if is_past_expiry else ""
                ),
            ))
        else:
            db.session.add(StatusHistory(
                entity_type="listing",
                entity_id=listing.id,
                from_status=listing_from_status,
                to_status=listing.status,
                actor_id=user_id,
                note=f"{req.quantity} {listing.unit} inventory restored after recipient cancelled accepted request",
            ))

    db.session.commit()
    return jsonify({"request": req.to_dict(), "message": "Request cancelled successfully"}), 200


@requests_bp.route("/<int:request_id>/history", methods=["GET"])
@active_user_required
def get_request_history(request_id):
    req = Request.query.get_or_404(request_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    # Permission check: must be recipient, listing donor, or admin
    is_owner = req.recipient_id == user_id
    is_donor = req.listing and req.listing.donor_id == user_id
    if not (is_owner or is_donor or user.role == "admin"):
        return jsonify({"error": "Unauthorized"}), 403

    history = StatusHistory.query.filter_by(entity_type="request", entity_id=req.id)\
        .order_by(StatusHistory.created_at.asc()).all()

    return jsonify({"history": [h.to_dict() for h in history]}), 200
