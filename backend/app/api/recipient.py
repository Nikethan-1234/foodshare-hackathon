from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import Listing, Request, User
from app.auth.decorators import role_required
from app.services.expiry_service import check_and_expire_listings

recipient_bp = Blueprint("recipient", __name__)


@recipient_bp.route("/dashboard", methods=["GET"])
@role_required("recipient")
def recipient_dashboard():
    check_and_expire_listings()
    user_id = int(get_jwt_identity())

    # All requests by this recipient
    my_requests = Request.query.filter_by(recipient_id=user_id).all()

    pending_count = sum(1 for r in my_requests if r.status == "PENDING")
    accepted_count = sum(1 for r in my_requests if r.status == "ACCEPTED")
    completed_count = sum(1 for r in my_requests if r.status == "COMPLETED")
    total_portions = sum(r.quantity for r in my_requests if r.status == "COMPLETED")

    # Upcoming accepted pickups
    accepted_pickups = [r.to_dict() for r in my_requests if r.status == "ACCEPTED"]
    # Sort upcoming pickups by pickup_start
    accepted_pickups.sort(key=lambda x: x.get("pickup_start") or "")

    # Recent 5 requests
    recent_requests = Request.query.filter_by(recipient_id=user_id)\
        .order_by(Request.created_at.desc()).limit(5).all()

    # Total active surplus listings available across platform
    available_listings_count = Listing.query.filter(
        Listing.status == "AVAILABLE",
        Listing.quantity_left > 0
    ).count()

    return jsonify({
        "metrics": {
            "pending_requests_count": pending_count,
            "accepted_pickups_count": accepted_count,
            "completed_pickups_count": completed_count,
            "total_portions_received": total_portions,
            "available_listings_count": available_listings_count,
        },
        "upcoming_pickups": accepted_pickups,
        "recent_requests": [r.to_dict() for r in recent_requests],
    }), 200
