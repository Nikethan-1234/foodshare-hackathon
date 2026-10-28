from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import Listing, Request, User
from app.auth.decorators import role_required
from app.services.expiry_service import check_and_expire_listings

donor_bp = Blueprint("donor", __name__)


@donor_bp.route("/dashboard", methods=["GET"])
@role_required("donor")
def donor_dashboard():
    check_and_expire_listings()
    user_id = int(get_jwt_identity())
    
    # Donor's listings
    donor_listings = Listing.query.filter_by(donor_id=user_id).all()
    listing_ids = [l.id for l in donor_listings]

    active_listings_count = sum(1 for l in donor_listings if l.status in ["AVAILABLE", "RESERVED"])
    completed_listings_count = sum(1 for l in donor_listings if l.status == "COMPLETED")
    
    # Calculate total portions distributed/completed
    completed_requests = Request.query.filter(
        Request.listing_id.in_(listing_ids),
        Request.status == "COMPLETED"
    ).all() if listing_ids else []
    
    total_portions_completed = sum(r.quantity for r in completed_requests)

    # Pending requests on donor's listings
    pending_requests = Request.query.filter(
        Request.listing_id.in_(listing_ids),
        Request.status == "PENDING"
    ).order_by(Request.created_at.desc()).all() if listing_ids else []

    # Recent 5 listings
    recent_listings = Listing.query.filter_by(donor_id=user_id)\
        .order_by(Listing.created_at.desc()).limit(5).all()

    formatted_recent_listings = []
    for l in recent_listings:
        ld = l.to_dict()
        reqs = l.requests.all()
        ld["requests_count"] = len(reqs)
        ld["pending_requests_count"] = len([r for r in reqs if r.status == "PENDING"])
        formatted_recent_listings.append(ld)

    return jsonify({
        "metrics": {
            "active_listings_count": active_listings_count,
            "total_listings_count": len(donor_listings),
            "pending_requests_count": len(pending_requests),
            "completed_donations_count": completed_listings_count,
            "total_portions_donated": total_portions_completed,
        },
        "recent_listings": formatted_recent_listings,
        "incoming_requests": [r.to_dict() for r in pending_requests[:5]],
    }), 200
