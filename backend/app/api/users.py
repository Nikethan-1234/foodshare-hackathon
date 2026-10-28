from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import User, Profile
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

    db.session.commit()
    return jsonify({"profile": profile.to_dict()}), 200


@users_bp.route("/", methods=["GET"])
@role_required("admin")
def list_users():
    users = User.query.all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200
