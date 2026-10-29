from app import db
from datetime import datetime

# Valid donor sub-types. Stored on Profile so recipients and admins also have None.
DONOR_TYPES = ["RESTAURANT", "INSTITUTION", "INDIVIDUAL"]


class Profile(db.Model):
    __tablename__ = "profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    organization_name = db.Column(db.String(255), nullable=False)
    contact_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(30))
    address = db.Column(db.Text)
    description = db.Column(db.Text)
    # donor_type: RESTAURANT | INSTITUTION | INDIVIDUAL (null for recipients/admins)
    donor_type = db.Column(db.String(20), nullable=True)
    phone_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = db.relationship("User", back_populates="profile")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "organization_name": self.organization_name,
            "contact_name": self.contact_name,
            "phone": self.phone,
            "address": self.address,
            "description": self.description,
            "donor_type": self.donor_type,
            "phone_verified": self.phone_verified,
            "created_at": self.created_at.isoformat(),
        }
