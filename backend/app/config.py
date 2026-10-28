import os
import tempfile
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if os.environ.get("VERCEL"):
    DEFAULT_DB_PATH = os.path.join(tempfile.gettempdir(), "food_donation.db").replace("\\", "/")
else:
    DEFAULT_DB_PATH = os.path.join(BASE_DIR, "instance", "food_donation.db").replace("\\", "/")

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
