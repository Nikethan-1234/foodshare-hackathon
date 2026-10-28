import os
import sys

# Ensure backend directory is in python module search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app, db
from app.models import User

flask_app = create_app()

# Auto-initialize and auto-seed ephemeral SQLite database on cold start if empty
with flask_app.app_context():
    try:
        db.create_all()
        if User.query.first() is None:
            print("[Vercel Auto-Seed] Database is empty. Seeding demo data...")
            import seed
            seed.seed()
            print("[Vercel Auto-Seed] Database seeded successfully.")
    except Exception as e:
        print(f"[Vercel Init Warning] Database initialization: {e}")

class PathNormalizerMiddleware:
    """
    Ensures both /api/... and stripped /... paths route correctly
    to Flask blueprints configured with url_prefix='/api'.
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "")
        if path and not path.startswith("/api"):
            environ["PATH_INFO"] = "/api" + path
        return self.wsgi_app(environ, start_response)

app = PathNormalizerMiddleware(flask_app)
