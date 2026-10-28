from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models import User


def role_required(*roles):
    """Decorator to restrict endpoint access to specific roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id)) if user_id else None
            if not user or not user.is_active:
                return jsonify({"error": "Account not found or inactive"}), 401
            if user.role not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def active_user_required(fn):
    """Decorator to ensure user is authenticated and active."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user or not user.is_active:
            return jsonify({"error": "Account not found or inactive"}), 401
        return fn(*args, **kwargs)
    return wrapper
