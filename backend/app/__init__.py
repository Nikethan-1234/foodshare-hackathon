from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from .config import Config

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)

    from .models import User, Profile, Listing, Request, StatusHistory, Report

    from .auth.routes import auth_bp
    from .api.users import users_bp
    from .api.listings import listings_bp
    from .api.donor import donor_bp
    from .api.requests import requests_bp
    from .api.recipient import recipient_bp
    from .api.jobs import jobs_bp
    from .api.admin import admin_bp, reports_bp
    from .api.ai import ai_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(listings_bp, url_prefix="/api/listings")
    app.register_blueprint(donor_bp, url_prefix="/api/donor")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(recipient_bp, url_prefix="/api/recipient")
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "Food Donation Platform API"}

    @app.route("/api/impact")
    def get_public_impact():
        from .services.expiry_service import check_and_expire_listings
        check_and_expire_listings()

        completed_requests = Request.query.filter_by(status="COMPLETED").all()
        meals_distributed = sum(r.quantity for r in completed_requests)
        donors_count = User.query.filter_by(role="donor").count()
        recipients_count = User.query.filter_by(role="recipient").count()
        active_listings = Listing.query.filter(Listing.status.in_(["AVAILABLE", "RESERVED"])).all()
        portions_available = sum(l.quantity_left for l in active_listings)

        return {
            "meals_redistributed": meals_distributed,
            "total_donors": donors_count,
            "total_recipients": recipients_count,
            "active_listings_count": len(active_listings),
            "portions_available": portions_available,
        }

    return app
