from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import User, Profile
from app.models.profile import DONOR_TYPES
from app.auth.decorators import active_user_required, role_required

users_bp = Blueprint("users", __name__)

@users_bp.route("/profile", methods=["GET"])
@active_user_required
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    return jsonify({
        "user": user.to_dict(),
        "profile": user.profile.to_dict() if user.profile else None,
    }), 200


@users_bp.route("/profile", methods=["PUT"])
@active_user_required
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    errors = {}
    if "organization_name" in data and not data["organization_name"].strip():
        errors["organization_name"] = "Organization name cannot be empty."
    if "contact_name" in data and not data["contact_name"].strip():
        errors["contact_name"] = "Contact name cannot be empty."
    if "donor_type" in data and data["donor_type"] is not None:
        if data["donor_type"] not in DONOR_TYPES:
            errors["donor_type"] = f"donor_type must be one of: {', '.join(DONOR_TYPES)}."
    if errors:
        return jsonify({"error": "Validation failed", "fields": errors}), 422

    profile = user.profile
    if not profile:
        profile = Profile(user_id=user.id)
        db.session.add(profile)

    allowed_fields = ["organization_name", "contact_name", "phone", "address", "description"]
    for field in allowed_fields:
        if field in data:
            setattr(profile, field, data[field].strip() if isinstance(data[field], str) else data[field])

    # Only donors can update donor_type
    if "donor_type" in data and user.role == "donor":
        profile.donor_type = data["donor_type"]

    db.session.commit()
    return jsonify({"profile": profile.to_dict()}), 200


@users_bp.route("/phone/send-otp", methods=["POST"])
@active_user_required
def send_phone_otp():
    """
    Simulated phone OTP verification for individual donors.
    Returns fixed demo code clearly labeled as demo.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    profile = user.profile
    if not profile or not profile.phone:
        return jsonify({
            "error": "Phone number not found in profile. Please enter your phone number first."
        }), 400

    DEMO_OTP = "123456"
    return jsonify({
        "message": f"Demo OTP sent to {profile.phone}. Enter demo code {DEMO_OTP} to verify.",
        "otp_code": DEMO_OTP,
        "is_demo": True,
        "phone": profile.phone,
    }), 200


@users_bp.route("/phone/verify-otp", methods=["POST"])
@active_user_required
def verify_phone_otp():
    """
    Verify phone using simulated OTP.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    profile = user.profile
    if not profile:
        return jsonify({"error": "Profile not found."}), 404

    data = request.get_json() or {}
    otp = str(data.get("otp", "")).strip()

    DEMO_OTP = "123456"
    if otp != DEMO_OTP:
        return jsonify({
            "error": f"Invalid verification code. Please enter the demo code: {DEMO_OTP}"
        }), 422

    profile.phone_verified = True
    db.session.commit()

    return jsonify({
        "message": "Phone number verified successfully (Demo verification).",
        "phone_verified": True,
        "profile": profile.to_dict(),
    }), 200


@users_bp.route("/", methods=["GET"])
@role_required("admin")
def list_users():
    users = User.query.all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200
