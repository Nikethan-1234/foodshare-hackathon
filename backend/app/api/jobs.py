from flask import Blueprint, jsonify
from app.services.expiry_service import check_and_expire_listings
from app.services.recurring_service import run_recurring_listings_generator

jobs_bp = Blueprint("jobs", __name__)


@jobs_bp.route("/expire", methods=["POST", "GET"])
def trigger_expiry_job():
    """
    Trigger automated expiry job for listings past pickup_end.
    """
    result = check_and_expire_listings()
    return jsonify({
        "status": "success",
        "job": "expiry",
        "result": result
    }), 200


@jobs_bp.route("/generate-recurring", methods=["POST", "GET"])
def trigger_recurring_generation_job():
    """
    Trigger scheduled generation of listings from active recurring series for today.
    """
    generated = run_recurring_listings_generator()
    return jsonify({
        "status": "success",
        "job": "recurring_generation",
        "count": len(generated),
        "listings": [g.to_dict() for g in generated]
    }), 200
