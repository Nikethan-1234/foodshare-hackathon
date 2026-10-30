from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, RecurringDonation
from app.auth.decorators import role_required
from app.services.recurring_service import generate_listing_from_recurring

recurring_bp = Blueprint("recurring", __name__)

@recurring_bp.route("/", methods=["GET"])
@role_required("donor")
def list_donor_recurring():
    """List recurring donation series belonging to the authenticated donor."""
    user_id = int(get_jwt_identity())
    series = RecurringDonation.query.filter_by(donor_id=user_id).order_by(RecurringDonation.created_at.desc()).all()
    return jsonify({"recurring": [s.to_dict() for s in series]}), 200


@recurring_bp.route("/upcoming", methods=["GET"])
@jwt_required()
def get_upcoming_recurring():
    """Recipients and donors can view active upcoming recurring donation commitments."""
    active_series = RecurringDonation.query.filter_by(status="ACTIVE").order_by(RecurringDonation.day_of_week.asc()).all()
    return jsonify({"upcoming": [s.to_dict() for s in active_series]}), 200


@recurring_bp.route("/", methods=["POST"])
@role_required("donor")
def create_recurring():
    """Institutions can create recurring weekly donations."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    profile = user.profile if user else None

    # Role constraint: only INSTITUTION (and optionally RESTAURANT) can create recurring
    if not profile or profile.donor_type not in ["INSTITUTION", "RESTAURANT"]:
        return jsonify({
            "error": "Recurring donation series are reserved for institutions (churches, hostels, canteens) and verified food establishments."
        }), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Validation failed", "fields": {"title": "Title is required"}}), 422

    day_of_week = data.get("day_of_week")
    try:
        day_of_week = int(day_of_week)
        if not (0 <= day_of_week <= 6):
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Validation failed", "fields": {"day_of_week": "Day of week must be between 0 (Monday) and 6 (Sunday)"}}), 422

    expected_servings = data.get("expected_servings")
    try:
        expected_servings = int(expected_servings)
        if expected_servings < 1:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Validation failed", "fields": {"expected_servings": "Expected servings must be at least 1"}}), 422

    usual_time = data.get("usual_time", "14:00").strip()
    pickup_location = data.get("pickup_location", profile.address or "").strip()
    if not pickup_location:
        return jsonify({"error": "Validation failed", "fields": {"pickup_location": "Pickup location address is required"}}), 422

    recurring = RecurringDonation(
        donor_id=user_id,
        title=title,
        description=data.get("description", "").strip(),
        day_of_week=day_of_week,
        usual_time=usual_time,
        expected_servings=expected_servings,
        unit=data.get("unit", "servings").strip(),
        pickup_location=pickup_location,
        pickup_window_hours=int(data.get("pickup_window_hours", 3)),
        status="ACTIVE",
    )
    db.session.add(recurring)
    db.session.commit()

    return jsonify({"recurring": recurring.to_dict()}), 201


@recurring_bp.route("/<int:series_id>", methods=["PUT", "PATCH"])
@role_required("donor")
def update_recurring(series_id):
    """Donor can edit expected servings, usual time, or status (PAUSED / CANCELLED)."""
    user_id = int(get_jwt_identity())
    recurring = RecurringDonation.query.get(series_id)
    if not recurring or recurring.donor_id != user_id:
        return jsonify({"error": "Recurring series not found"}), 404

    data = request.get_json() or {}
    if "expected_servings" in data:
        try:
            servings = int(data["expected_servings"])
            if servings > 0:
                recurring.expected_servings = servings
        except (ValueError, TypeError):
            pass

    if "title" in data and data["title"].strip():
        recurring.title = data["title"].strip()
    if "description" in data:
        recurring.description = data["description"].strip()
    if "usual_time" in data and data["usual_time"].strip():
        recurring.usual_time = data["usual_time"].strip()
    if "pickup_location" in data and data["pickup_location"].strip():
        recurring.pickup_location = data["pickup_location"].strip()
    if "status" in data:
        st = data["status"].strip().upper()
        if st in RecurringDonation.STATUSES:
            recurring.status = st

    db.session.commit()
    return jsonify({"recurring": recurring.to_dict()}), 200


@recurring_bp.route("/<int:series_id>/generate", methods=["POST"])
@role_required("donor")
def generate_now(series_id):
    """On-demand generation of a normal live listing from this recurring series."""
    user_id = int(get_jwt_identity())
    recurring = RecurringDonation.query.get(series_id)
    if not recurring or recurring.donor_id != user_id:
        return jsonify({"error": "Recurring series not found"}), 404

    if recurring.status != "ACTIVE":
        return jsonify({"error": f"Cannot generate listing for series with status {recurring.status}"}), 400

    listing = generate_listing_from_recurring(recurring)
    if not listing:
        return jsonify({"error": "Failed to generate listing"}), 400

    return jsonify({
        "message": "Listing successfully generated from recurring series!",
        "listing": listing.to_dict(),
    }), 201
