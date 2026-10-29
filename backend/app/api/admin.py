from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import Listing, Request, StatusHistory, User, Report
from app.auth.decorators import role_required, active_user_required
from app.services.expiry_service import check_and_expire_listings

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/dashboard", methods=["GET"])
@role_required("admin")
def get_admin_dashboard():
    check_and_expire_listings()

    total_users = User.query.count()
    donors_count = User.query.filter_by(role="donor").count()
    recipients_count = User.query.filter_by(role="recipient").count()

    total_listings = Listing.query.count()
    active_listings = Listing.query.filter(Listing.status.in_(["AVAILABLE", "RESERVED"])).count()
    completed_listings = Listing.query.filter_by(status="COMPLETED").count()

    completed_requests = Request.query.filter_by(status="COMPLETED").all()
    total_portions_distributed = sum(r.quantity for r in completed_requests)

    open_reports_count = Report.query.filter_by(status="OPEN").count()

    # Listings breakdown by status
    statuses = ["PENDING_APPROVAL", "AVAILABLE", "RESERVED", "COMPLETED", "EXPIRED", "REMOVED"]
    listings_by_status = {
        s: Listing.query.filter_by(status=s).count() for s in statuses
    }

    recent_listings = Listing.query.order_by(Listing.created_at.desc()).limit(5).all()
    recent_reports = Report.query.order_by(Report.created_at.desc()).limit(5).all()

    return jsonify({
        "metrics": {
            "total_users": total_users,
            "donors_count": donors_count,
            "recipients_count": recipients_count,
            "total_listings": total_listings,
            "active_listings": active_listings,
            "completed_listings": completed_listings,
            "total_portions_distributed": total_portions_distributed,
            "open_reports_count": open_reports_count,
            "listings_by_status": listings_by_status,
        },
        "recent_listings": [l.to_dict() for l in recent_listings],
        "recent_reports": [r.to_dict() for r in recent_reports],
    }), 200


@admin_bp.route("/listings", methods=["GET"])
@role_required("admin")
def get_all_listings():
    check_and_expire_listings()
    status_filter = request.args.get("status")
    q = request.args.get("q", "").strip().lower()

    query = Listing.query
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter_by(status=status_filter.upper())

    listings = query.order_by(Listing.created_at.desc()).all()

    result = []
    for l in listings:
        donor_name = l.donor.profile.organization_name if l.donor and l.donor.profile else ""
        if q:
            match_title = q in l.title.lower()
            match_donor = q in donor_name.lower()
            match_loc = q in l.pickup_location.lower()
            if not (match_title or match_donor or match_loc):
                continue

        ld = l.to_dict()
        reqs = l.requests.all()
        ld["requests_count"] = len(reqs)
        ld["pending_requests_count"] = len([r for r in reqs if r.status == "PENDING"])
        ld["accepted_requests_count"] = len([r for r in reqs if r.status == "ACCEPTED"])
        result.append(ld)

    return jsonify({"listings": result}), 200


@admin_bp.route("/listings/<int:listing_id>/remove", methods=["POST"])
@role_required("admin")
def remove_listing(listing_id):
    """
    Moderator action: Admin removes any listing (e.g. hygiene concern, TOS violation).
    """
    admin_id = int(get_jwt_identity())
    listing = Listing.query.get_or_404(listing_id)

    if listing.status == "REMOVED":
        return jsonify({"error": "Listing is already removed"}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "A removal reason is required for administrative moderation."}), 422

    old_status = listing.status
    listing.status = "REMOVED"

    # Log to status history
    db.session.add(StatusHistory(
        entity_type="listing",
        entity_id=listing.id,
        from_status=old_status,
        to_status="REMOVED",
        actor_id=admin_id,
        note=f"Administrative removal: {reason}",
    ))

    # Auto-cancel any pending requests on this listing
    pending_reqs = listing.requests.filter_by(status="PENDING").all()
    for req in pending_reqs:
        req.status = "CANCELLED"
        db.session.add(StatusHistory(
            entity_type="request",
            entity_id=req.id,
            from_status="PENDING",
            to_status="CANCELLED",
            actor_id=admin_id,
            note="Auto-cancelled: Listing was removed by platform moderator",
        ))

    db.session.commit()
    return jsonify({
        "listing": listing.to_dict(),
        "message": f"Listing #{listing.id} has been removed by admin moderation."
    }), 200


@admin_bp.route("/listings/<int:listing_id>/approve", methods=["POST"])
@role_required("admin")
def approve_listing(listing_id):
    """
    Moderator action: Approve a PENDING_APPROVAL listing from a new individual donor.
    """
    admin_id = int(get_jwt_identity())
    listing = Listing.query.get_or_404(listing_id)

    if listing.status != "PENDING_APPROVAL":
        return jsonify({"error": f"Cannot approve listing with status '{listing.status}'. Only PENDING_APPROVAL listings can be approved."}), 400

    listing.status = "AVAILABLE"
    db.session.add(StatusHistory(
        entity_type="listing",
        entity_id=listing.id,
        from_status="PENDING_APPROVAL",
        to_status="AVAILABLE",
        actor_id=admin_id,
        note="Approved by platform moderator. Listing is now public.",
    ))
    db.session.commit()

    return jsonify({
        "listing": listing.to_dict(),
        "message": f"Listing #{listing.id} approved successfully and is now available to recipients."
    }), 200


@admin_bp.route("/listings/<int:listing_id>/reject", methods=["POST"])
@role_required("admin")
def reject_listing(listing_id):
    """
    Moderator action: Reject a PENDING_APPROVAL listing from an individual donor.
    """
    admin_id = int(get_jwt_identity())
    listing = Listing.query.get_or_404(listing_id)

    if listing.status != "PENDING_APPROVAL":
        return jsonify({"error": f"Cannot reject listing with status '{listing.status}'. Only PENDING_APPROVAL listings can be rejected."}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "").strip() or "Did not meet food safety or quality criteria."

    listing.status = "REMOVED"
    db.session.add(StatusHistory(
        entity_type="listing",
        entity_id=listing.id,
        from_status="PENDING_APPROVAL",
        to_status="REMOVED",
        actor_id=admin_id,
        note=f"Rejected by platform moderator: {reason}",
    ))
    db.session.commit()

    return jsonify({
        "listing": listing.to_dict(),
        "message": f"Listing #{listing.id} has been rejected and removed."
    }), 200


@admin_bp.route("/reports", methods=["GET"])
@role_required("admin")
def get_reports():
    status_filter = request.args.get("status")
    query = Report.query
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter_by(status=status_filter.upper())

    reports = query.order_by(Report.created_at.desc()).all()
    return jsonify({"reports": [r.to_dict() for r in reports]}), 200


@admin_bp.route("/reports/<int:report_id>", methods=["PUT"])
@role_required("admin")
def update_report(report_id):
    admin_id = int(get_jwt_identity())
    report = Report.query.get_or_404(report_id)

    data = request.get_json() or {}
    new_status = data.get("status", "").upper()
    if new_status not in ["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"]:
        return jsonify({"error": "Status must be OPEN, REVIEWED, RESOLVED, or DISMISSED."}), 422

    report.status = new_status
    report.reviewed_by = admin_id

    # If action requested is to remove the listing
    action = data.get("action")
    listing_removed = False
    if action == "remove_listing" and report.listing and report.listing.status != "REMOVED":
        old_status = report.listing.status
        report.listing.status = "REMOVED"
        listing_removed = True
        db.session.add(StatusHistory(
            entity_type="listing",
            entity_id=report.listing.id,
            from_status=old_status,
            to_status="REMOVED",
            actor_id=admin_id,
            note=f"Administrative removal via report #{report.id}: {report.reason}",
        ))
        # Cancel pending requests
        for req in report.listing.requests.filter_by(status="PENDING").all():
            req.status = "CANCELLED"
            db.session.add(StatusHistory(
                entity_type="request",
                entity_id=req.id,
                from_status="PENDING",
                to_status="CANCELLED",
                actor_id=admin_id,
                note="Auto-cancelled: listing removed via report resolution",
            ))

    db.session.commit()
    return jsonify({
        "report": report.to_dict(),
        "listing_removed": listing_removed,
        "message": f"Report updated to {new_status}."
    }), 200


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["POST"])
@role_required("admin")
def toggle_user_active(user_id):
    admin_id = int(get_jwt_identity())
    if admin_id == user_id:
        return jsonify({"error": "Cannot deactivate your own administrator account"}), 400

    target_user = User.query.get_or_404(user_id)
    target_user.is_active = not target_user.is_active
    db.session.commit()

    state = "activated" if target_user.is_active else "deactivated"
    return jsonify({
        "user": target_user.to_dict(),
        "message": f"User {target_user.email} has been {state}."
    }), 200


# Public/Authenticated Reporting Endpoint for any user
reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/", methods=["POST"])
@active_user_required
def submit_report():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    listing_id = data.get("listing_id")
    reason = data.get("reason", "").strip()
    detail = data.get("detail", "").strip()

    if not listing_id:
        return jsonify({"error": "Validation failed", "fields": {"listing_id": "Listing ID is required."}}), 422
    if not reason:
        return jsonify({"error": "Validation failed", "fields": {"reason": "Please select a reason for the report."}}), 422

    listing = Listing.query.get(listing_id)
    if not listing:
        return jsonify({"error": "Listing not found"}), 404

    report = Report(
        reporter_id=user_id,
        listing_id=listing_id,
        reason=reason,
        detail=detail,
        status="OPEN",
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({
        "report": report.to_dict(),
        "message": "Report submitted. Platform moderators will review this listing."
    }), 201
