from app import db
from datetime import datetime

class Report(db.Model):
    __tablename__ = "reports"

    STATUSES = ["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"]

    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    listing_id = db.Column(db.Integer, db.ForeignKey("listings.id"))
    reason = db.Column(db.String(100), nullable=False)
    detail = db.Column(db.Text)
    status = db.Column(db.String(20), default="OPEN", nullable=False)
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    reporter = db.relationship("User", foreign_keys=[reporter_id])
    listing = db.relationship("Listing")
    reviewer = db.relationship("User", foreign_keys=[reviewed_by])

    def to_dict(self):
        listing = self.listing
        donor_profile = listing.donor.profile if listing and listing.donor else None
        reporter_profile = self.reporter.profile if self.reporter else None

        return {
            "id": self.id,
            "reporter_id": self.reporter_id,
            "reporter_email": self.reporter.email if self.reporter else None,
            "reporter_name": reporter_profile.organization_name if reporter_profile else (self.reporter.email if self.reporter else None),
            "listing_id": self.listing_id,
            "listing_title": listing.title if listing else None,
            "listing_status": listing.status if listing else None,
            "donor_name": donor_profile.organization_name if donor_profile else None,
            "reason": self.reason,
            "detail": self.detail,
            "status": self.status,
            "reviewed_by": self.reviewed_by,
            "reviewer_email": self.reviewer.email if self.reviewer else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
