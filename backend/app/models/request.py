from app import db
from datetime import datetime

class Request(db.Model):
    __tablename__ = "requests"

    STATUSES = ["PENDING", "ACCEPTED", "COMPLETED", "REJECTED", "CANCELLED"]

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey("listings.id"), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default="PENDING", nullable=False, index=True)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    listing = db.relationship("Listing", back_populates="requests")
    recipient = db.relationship("User", back_populates="requests")

    def to_dict(self):
        listing = self.listing
        donor_profile = listing.donor.profile if listing and listing.donor else None
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "listing_title": listing.title if listing else None,
            "listing_status": listing.status if listing else None,
            "unit": listing.unit if listing else "servings",
            "donor_name": donor_profile.organization_name if donor_profile else None,
            "donor_phone": donor_profile.phone if donor_profile else None,
            "pickup_location": listing.pickup_location if listing else None,
            "pickup_start": listing.pickup_start.isoformat() if listing and listing.pickup_start else None,
            "pickup_end": listing.pickup_end.isoformat() if listing and listing.pickup_end else None,
            "use_by": listing.use_by.isoformat() if listing and listing.use_by else None,
            "recipient_id": self.recipient_id,
            "recipient_name": self.recipient.profile.organization_name if self.recipient.profile else None,
            "quantity": self.quantity,
            "status": self.status,
            "note": self.note,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
