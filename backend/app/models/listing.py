from app import db
from datetime import datetime

class Listing(db.Model):
    __tablename__ = "listings"

    STATUSES = ["PENDING_APPROVAL", "AVAILABLE", "RESERVED", "COMPLETED", "EXPIRED", "REMOVED"]

    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    quantity_total = db.Column(db.Integer, nullable=False)
    quantity_left = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(50), default="servings")
    prepared_at = db.Column(db.DateTime, nullable=False)
    use_by = db.Column(db.DateTime, nullable=False)
    pickup_location = db.Column(db.Text, nullable=False)
    pickup_start = db.Column(db.DateTime, nullable=False)
    pickup_end = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default="AVAILABLE", nullable=False, index=True)
    allergens = db.Column(db.String(255), default="")
    dietary_tags = db.Column(db.String(255), default="")
    # Handling checklist (all required to be True)
    is_covered = db.Column(db.Boolean, default=True, nullable=False)
    is_stored_properly = db.Column(db.Boolean, default=True, nullable=False)
    is_not_reheated = db.Column(db.Boolean, default=True, nullable=False)
    is_packaged_cleanly = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    donor = db.relationship("User", back_populates="listings")
    requests = db.relationship("Request", back_populates="listing", lazy="dynamic")

    def to_dict(self):
        donor_profile = self.donor.profile if self.donor else None
        return {
            "id": self.id,
            "donor_id": self.donor_id,
            "donor_name": donor_profile.organization_name if donor_profile else None,
            "donor_type": donor_profile.donor_type if donor_profile else None,
            "title": self.title,
            "description": self.description,
            "quantity_total": self.quantity_total,
            "quantity_left": self.quantity_left,
            "unit": self.unit,
            "prepared_at": self.prepared_at.isoformat(),
            "use_by": self.use_by.isoformat(),
            "pickup_location": self.pickup_location,
            "pickup_start": self.pickup_start.isoformat(),
            "pickup_end": self.pickup_end.isoformat(),
            "status": self.status,
            "allergens": [a.strip() for a in self.allergens.split(",") if a.strip()] if self.allergens else [],
            "dietary_tags": [t.strip() for t in self.dietary_tags.split(",") if t.strip()] if self.dietary_tags else [],
            "handling_checklist": {
                "covered": self.is_covered,
                "stored_properly": self.is_stored_properly,
                "not_reheated": self.is_not_reheated,
                "packaged_cleanly": self.is_packaged_cleanly,
            },
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
