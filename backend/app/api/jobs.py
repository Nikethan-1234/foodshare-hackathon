from flask import Blueprint, jsonify
from app.services.expiry_service import check_and_expire_listings

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
