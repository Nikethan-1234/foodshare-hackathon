from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from app.models import Listing, User
from app.auth.decorators import active_user_required, role_required
from app.services.ai_service import (
    analyze_food_image,
    detect_allergens_and_dietary,
    calculate_charity_match,
    compute_esg_metrics,
)

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/scan", methods=["POST"])
@active_user_required
def scan_listing():
    """
    Multimodal AI Food Scanner endpoint:
    Analyzes uploaded image or preset and returns structured listing draft.
    """
    data = request.get_json() or {}
    preset = data.get("preset")
    filename = data.get("filename")
    notes = data.get("notes")

    result = analyze_food_image(preset_key=preset, filename=filename, notes=notes)
    return jsonify({
        "status": "success",
        "draft": result
    }), 200


@ai_bp.route("/screen-allergens", methods=["POST"])
@active_user_required
def screen_allergens():
    """
    NLP Allergen & Dietary Tag Extractor:
    Parses description text to detect allergens and dietary tags.
    """
    data = request.get_json() or {}
    text = data.get("text", "")
    allergens, dietary = detect_allergens_and_dietary(text)

    return jsonify({
        "allergens": allergens,
        "dietary_tags": dietary,
    }), 200


@ai_bp.route("/matchmaking/<int:listing_id>", methods=["GET"])
@role_required("donor", "admin")
def get_charity_matches(listing_id):
    """
    Intelligent Charity Matchmaking:
    Evaluates registered recipient organizations for a listing and ranks them by suitability.
    """
    listing = Listing.query.get_or_404(listing_id)
    recipients = User.query.filter_by(role="recipient", is_active=True).all()

    matches = calculate_charity_match(listing, recipients)
    return jsonify({
        "listing_id": listing.id,
        "listing_title": listing.title,
        "quantity_left": listing.quantity_left,
        "unit": listing.unit,
        "top_matches": matches[:5],
    }), 200


@ai_bp.route("/esg", methods=["GET"])
@active_user_required
def get_esg_report():
    """
    ESG & Carbon Offset Analytics:
    Calculates CO2e avoided, water conserved, and car travel miles eliminated.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user.role == "donor":
        # Calculate donor's completed redistributed portions
        listings = Listing.query.filter_by(donor_id=user.id).all()
        l_ids = [l.id for l in listings]
        from app.models import Request
        completed_reqs = Request.query.filter(Request.listing_id.in_(l_ids), Request.status == "COMPLETED").all() if l_ids else []
        total_portions = sum(r.quantity for r in completed_reqs)
    elif user.role == "recipient":
        from app.models import Request
        completed_reqs = Request.query.filter_by(recipient_id=user.id, status="COMPLETED").all()
        total_portions = sum(r.quantity for r in completed_reqs)
    else:
        # Admin: platform-wide total
        from app.models import Request
        completed_reqs = Request.query.filter_by(status="COMPLETED").all()
        total_portions = sum(r.quantity for r in completed_reqs)

    metrics = compute_esg_metrics(total_portions)
    return jsonify({
        "role": user.role,
        "esg_metrics": metrics
    }), 200
