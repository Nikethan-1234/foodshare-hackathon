from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import Listing, Request, StatusHistory, User
from app.auth.decorators import active_user_required, role_required
from app.services.expiry_service import check_and_expire_listings

listings_bp = Blueprint("listings", __name__)


def parse_datetime(val, field_name, errors):
    if not val:
        errors[field_name] = f"{field_name.replace('_', ' ').capitalize()} is required."
        return None
    try:
        # Normalize ISO strings
        s = str(val).strip()
        if s.endswith("Z"):
            s = s[:-1]
        return datetime.fromisoformat(s)
    except Exception:
        errors[field_name] = f"Invalid date format for {field_name.replace('_', ' ')}."
        return None


def validate_listing_payload(data, is_create=True):
    errors = {}
    title = data.get("title", "").strip() if data.get("title") else ""
    if not title:
        errors["title"] = "Title is required."
    elif len(title) > 255:
        errors["title"] = "Title must be 255 characters or fewer."

    quantity_total = data.get("quantity_total")
    if quantity_total is None or quantity_total == "":
        errors["quantity_total"] = "Total quantity is required."
    else:
        try:
            qty = int(quantity_total)
            if qty <= 0:
                errors["quantity_total"] = "Quantity must be greater than 0."
        except (ValueError, TypeError):
            errors["quantity_total"] = "Quantity must be a valid integer."

    pickup_location = data.get("pickup_location", "").strip() if data.get("pickup_location") else ""
    if not pickup_location:
        errors["pickup_location"] = "Pickup location is required."

    prep_at = parse_datetime(data.get("prepared_at"), "prepared_at", errors)
    use_by = parse_datetime(data.get("use_by"), "use_by", errors)
    p_start = parse_datetime(data.get("pickup_start"), "pickup_start", errors)
    p_end = parse_datetime(data.get("pickup_end"), "pickup_end", errors)

    if prep_at and use_by and prep_at > use_by:
        errors["use_by"] = "Use-by date must be after preparation date."

    if p_start and p_end:
        if p_start >= p_end:
            errors["pickup_end"] = "Pickup end time must be after pickup start time."

    if p_end and use_by and p_end > use_by:
        errors["pickup_end"] = "Pickup window cannot end after the food use-by date."

    # Phase 2: Cooked food time limit check
    if is_create and prep_at:
        max_cooked_hours = current_app.config.get("MAX_COOKED_HOURS_BEFORE_LISTING", 4)
        hours_ago = (datetime.utcnow() - prep_at).total_seconds() / 3600.0
        if hours_ago > max_cooked_hours:
            errors["prepared_at"] = f"Cooked food must be listed within {max_cooked_hours} hours of preparation for food safety. (Prepared {round(hours_ago, 1)} hours ago)."

    # Phase 2: Handling safety checklist (all 4 required when provided)
    checklist = data.get("handling_checklist")
    if checklist is not None:
        covered = bool(checklist.get("covered", False))
        stored_properly = bool(checklist.get("stored_properly", False))
        not_reheated = bool(checklist.get("not_reheated", False))
        packaged_cleanly = bool(checklist.get("packaged_cleanly", False))
        if not (covered and stored_properly and not_reheated and packaged_cleanly):
            errors["handling_checklist"] = "All food handling safety checklist boxes must be confirmed (covered, properly stored, not reheated, packaged cleanly)."
    else:
        if any(data.get(k) is False for k in ["is_covered", "is_stored_properly", "is_not_reheated", "is_packaged_cleanly"]):
            errors["handling_checklist"] = "All food handling safety checklist boxes must be confirmed."
        covered = True
        stored_properly = True
        not_reheated = True
        packaged_cleanly = True

    raw_allergens = data.get("allergens")
    raw_dietary = data.get("dietary_tags")
    if raw_allergens is None and raw_dietary is None:
        from app.services.ai_service import detect_allergens_and_dietary
        auto_a, auto_d = detect_allergens_and_dietary(f"{title} {data.get('description', '')}")
        allergens_str = ", ".join(auto_a)
        dietary_str = ", ".join(auto_d)
    else:
        allergens_str = ", ".join(raw_allergens) if isinstance(raw_allergens, list) else (raw_allergens or "")
        dietary_str = ", ".join(raw_dietary) if isinstance(raw_dietary, list) else (raw_dietary or "")

    return errors, {
        "title": title,
        "description": data.get("description", "").strip() if data.get("description") else "",
        "quantity_total": int(quantity_total) if quantity_total and str(quantity_total).isdigit() else None,
        "unit": data.get("unit", "servings").strip() if data.get("unit") else "servings",
        "pickup_location": pickup_location,
        "prepared_at": prep_at,
        "use_by": use_by,
        "pickup_start": p_start,
        "pickup_end": p_end,
        "allergens": allergens_str,
        "dietary_tags": dietary_str,
        "is_covered": covered,
        "is_stored_properly": stored_properly,
        "is_not_reheated": not_reheated,
        "is_packaged_cleanly": packaged_cleanly,
    }


@listings_bp.route("/", methods=["POST"])
@role_required("donor")
def create_listing():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    donor = User.query.get(user_id)
    donor_profile = donor.profile if donor else None

    # Phase 2: Individual Donor Rules
    if donor_profile and donor_profile.donor_type == "INDIVIDUAL":
        # Rule 1: Phone verification check
        if not donor_profile.phone_verified:
            return jsonify({
                "error": "Phone verification is required before individual donors can post listings. Please verify your phone number (Demo OTP code: 123456)."
            }), 403

        # Rule 2: Minimum quantity check
        min_qty = current_app.config.get("INDIVIDUAL_MIN_QUANTITY", 10)
        req_qty = data.get("quantity_total")
        try:
            if req_qty is not None and int(req_qty) < min_qty:
                return jsonify({
                    "error": "Validation failed",
                    "fields": {
                        "quantity_total": f"Individual donors must list at least {min_qty} servings to ensure bulk redistribution efficiency."
                    }
                }), 422
        except (ValueError, TypeError):
            pass

    errors, parsed = validate_listing_payload(data, is_create=True)
    if errors:
        return jsonify({"error": "Validation failed", "fields": errors}), 422

    # Phase 2: Trust level calculation for Individuals
    if donor_profile and donor_profile.donor_type == "INDIVIDUAL":
        completed_donations = Listing.query.filter_by(donor_id=user_id, status="COMPLETED").count()
        if completed_donations < 3:
            initial_status = "PENDING_APPROVAL"
            status_note = f"First-time individual listing submitted for safety approval (Trust level: {completed_donations}/3 completed donations)"
        else:
            initial_status = "AVAILABLE"
            status_note = "Individual listing auto-approved (Trust level: verified donor with 3+ completed donations)"
    else:
        initial_status = "AVAILABLE"
        status_note = "Listing created by verified organization donor"

    listing = Listing(
        donor_id=user_id,
        title=parsed["title"],
        description=parsed["description"],
        quantity_total=parsed["quantity_total"],
        quantity_left=parsed["quantity_total"],
        unit=parsed["unit"],
        prepared_at=parsed["prepared_at"],
        use_by=parsed["use_by"],
        pickup_location=parsed["pickup_location"],
        pickup_start=parsed["pickup_start"],
        pickup_end=parsed["pickup_end"],
        status=initial_status,
        allergens=parsed.get("allergens", ""),
        dietary_tags=parsed.get("dietary_tags", ""),
        is_covered=parsed.get("is_covered", True),
        is_stored_properly=parsed.get("is_stored_properly", True),
        is_not_reheated=parsed.get("is_not_reheated", True),
        is_packaged_cleanly=parsed.get("is_packaged_cleanly", True),
    )
    db.session.add(listing)
    db.session.flush()

    status_entry = StatusHistory(
        entity_type="listing",
        entity_id=listing.id,
        from_status=None,
        to_status=initial_status,
        actor_id=user_id,
        note=status_note,
    )
    db.session.add(status_entry)
    db.session.commit()

    return jsonify({"listing": listing.to_dict()}), 201


@listings_bp.route("/mine", methods=["GET"])
@role_required("donor")
def get_my_listings():
    check_and_expire_listings()
    user_id = int(get_jwt_identity())
    status_filter = request.args.get("status")

    query = Listing.query.filter_by(donor_id=user_id)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter_by(status=status_filter.upper())

    listings = query.order_by(Listing.created_at.desc()).all()

    # Enhance listings with request counts
    result = []
    for l in listings:
        l_dict = l.to_dict()
        requests_list = l.requests.all()
        l_dict["requests_count"] = len(requests_list)
        l_dict["pending_requests_count"] = len([r for r in requests_list if r.status == "PENDING"])
        l_dict["accepted_requests_count"] = len([r for r in requests_list if r.status == "ACCEPTED"])
        result.append(l_dict)

    return jsonify({"listings": result}), 200


@listings_bp.route("/available", methods=["GET"])
@active_user_required
def get_available_listings():
    check_and_expire_listings()
    user_id = int(get_jwt_identity())
    q = request.args.get("q", "").strip().lower()
    unit = request.args.get("unit")

    now = datetime.utcnow()
    query = Listing.query.filter(
        Listing.status == "AVAILABLE",
        Listing.quantity_left > 0,
        Listing.pickup_end > now
    )
    if unit:
        query = query.filter_by(unit=unit)

    listings = query.order_by(Listing.pickup_start.asc()).all()

    result = []
    for l in listings:
        donor_name = l.donor.profile.organization_name if l.donor and l.donor.profile else ""
        if q:
            match_title = q in l.title.lower()
            match_desc = l.description and q in l.description.lower()
            match_loc = q in l.pickup_location.lower()
            match_donor = q in donor_name.lower()
            if not (match_title or match_desc or match_loc or match_donor):
                continue

        l_dict = l.to_dict()
        my_req = l.requests.filter(
            Request.recipient_id == user_id,
            Request.status.in_(["PENDING", "ACCEPTED"])
        ).first()
        l_dict["my_request"] = my_req.to_dict() if my_req else None
        result.append(l_dict)

    return jsonify({"listings": result}), 200


@listings_bp.route("/<int:listing_id>", methods=["GET"])
@active_user_required
def get_listing(listing_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    listing = Listing.query.get_or_404(listing_id)

    l_dict = listing.to_dict()
    # If the user is the owner donor or admin, include associated requests
    if user.id == listing.donor_id or user.role == "admin":
        requests_list = listing.requests.order_by(Request.created_at.desc()).all()
        l_dict["requests"] = [r.to_dict() for r in requests_list]
        l_dict["pending_requests_count"] = len([r for r in requests_list if r.status == "PENDING"])
    elif user.role == "recipient":
        # Recipient can see if they already have an existing request
        my_req = listing.requests.filter_by(recipient_id=user.id).first()
        l_dict["my_request"] = my_req.to_dict() if my_req else None

    # Include status history
    history = StatusHistory.query.filter_by(entity_type="listing", entity_id=listing.id)\
        .order_by(StatusHistory.created_at.asc()).all()
    l_dict["status_history"] = [h.to_dict() for h in history]

    return jsonify({"listing": l_dict}), 200


@listings_bp.route("/<int:listing_id>", methods=["PUT"])
@role_required("donor")
def update_listing(listing_id):
    user_id = int(get_jwt_identity())
    listing = Listing.query.get_or_404(listing_id)

    if listing.donor_id != user_id:
        return jsonify({"error": "You do not have permission to edit this listing"}), 403

    if listing.status in ["COMPLETED", "REMOVED", "EXPIRED"]:
        return jsonify({"error": f"Cannot edit listing with status {listing.status}"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    errors, parsed = validate_listing_payload(data, is_create=False)
    if errors:
        return jsonify({"error": "Validation failed", "fields": errors}), 422

    # Check quantity adjustments
    booked = listing.quantity_total - listing.quantity_left
    new_total = parsed["quantity_total"]
    if new_total < booked:
        return jsonify({
            "error": "Validation failed",
            "fields": {
                "quantity_total": f"Cannot reduce total below {booked} {listing.unit} (already booked by accepted requests)."
            }
        }), 422

    listing.title = parsed["title"]
    listing.description = parsed["description"]
    listing.unit = parsed["unit"]
    listing.pickup_location = parsed["pickup_location"]
    listing.prepared_at = parsed["prepared_at"]
    listing.use_by = parsed["use_by"]
    listing.pickup_start = parsed["pickup_start"]
    listing.pickup_end = parsed["pickup_end"]
    if "allergens" in parsed:
        listing.allergens = parsed["allergens"]
    if "dietary_tags" in parsed:
        listing.dietary_tags = parsed["dietary_tags"]

    # Adjust quantity_left
    listing.quantity_total = new_total
    listing.quantity_left = new_total - booked

    # Update status if needed
    if listing.quantity_left == 0 and listing.status == "AVAILABLE":
        listing.status = "RESERVED"
    elif listing.quantity_left > 0 and listing.status == "RESERVED":
        listing.status = "AVAILABLE"

    db.session.commit()
    return jsonify({"listing": listing.to_dict()}), 200


@listings_bp.route("/<int:listing_id>/cancel", methods=["POST"])
@role_required("donor")
def cancel_listing(listing_id):
    user_id = int(get_jwt_identity())
    listing = Listing.query.get_or_404(listing_id)

    if listing.donor_id != user_id:
        return jsonify({"error": "You do not have permission to cancel this listing"}), 403

    if listing.status in ["COMPLETED", "REMOVED"]:
        return jsonify({"error": f"Listing is already {listing.status.lower()}"}), 400

    old_status = listing.status
    listing.status = "REMOVED"

    # Status history for listing
    reason = request.get_json().get("reason", "").strip() if request.get_json() else ""
    note = f"Listing cancelled by donor. {reason}".strip()
    status_entry = StatusHistory(
        entity_type="listing",
        entity_id=listing.id,
        from_status=old_status,
        to_status="REMOVED",
        actor_id=user_id,
        note=note,
    )
    db.session.add(status_entry)

    # Automatically cancel pending requests
    pending_requests = listing.requests.filter_by(status="PENDING").all()
    for req in pending_requests:
        req.status = "CANCELLED"
        db.session.add(StatusHistory(
            entity_type="request",
            entity_id=req.id,
            from_status="PENDING",
            to_status="CANCELLED",
            actor_id=user_id,
            note="Listing was cancelled by donor",
        ))

    db.session.commit()
    return jsonify({"listing": listing.to_dict(), "message": "Listing cancelled successfully"}), 200
