from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User, Profile
from app.auth.decorators import active_user_required

auth_bp = Blueprint("auth", __name__)


def validate_registration(data):
    errors = {}
    if not data.get("email"):
        errors["email"] = "Email is required."
    elif "@" not in data["email"] or "." not in data["email"]:
        errors["email"] = "Enter a valid email address."
    if not data.get("password"):
        errors["password"] = "Password is required."
    elif len(data["password"]) < 8:
        errors["password"] = "Password must be at least 8 characters."
    if not data.get("role") or data["role"] not in ["donor", "recipient"]:
        errors["role"] = "Role must be 'donor' or 'recipient'."
    if not data.get("organization_name"):
        errors["organization_name"] = "Organization name is required."
    if not data.get("contact_name"):
        errors["contact_name"] = "Contact name is required."
    return errors


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    errors = validate_registration(data)
    if errors:
        return jsonify({"error": "Validation failed", "fields": errors}), 422

    if User.query.filter_by(email=data["email"].lower().strip()).first():
        return jsonify({"error": "Validation failed", "fields": {"email": "An account with this email already exists."}}), 422

    user = User(email=data["email"].lower().strip(), role=data["role"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    profile = Profile(
        user_id=user.id,
        organization_name=data["organization_name"].strip(),
        contact_name=data["contact_name"].strip(),
        phone=data.get("phone", "").strip(),
        address=data.get("address", "").strip(),
        description=data.get("description", "").strip(),
    )
    db.session.add(profile)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict(), "profile": profile.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    if not email:
        return jsonify({"error": "Validation failed", "fields": {"email": "Email is required."}}), 422
    if not password:
        return jsonify({"error": "Validation failed", "fields": {"password": "Password is required."}}), 422

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401
    if not user.is_active:
        return jsonify({"error": "This account has been deactivated. Contact support."}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "token": token,
        "user": user.to_dict(),
        "profile": user.profile.to_dict() if user.profile else None,
    }), 200


@auth_bp.route("/me", methods=["GET"])
@active_user_required
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    return jsonify({
        "user": user.to_dict(),
        "profile": user.profile.to_dict() if user.profile else None,
    }), 200
