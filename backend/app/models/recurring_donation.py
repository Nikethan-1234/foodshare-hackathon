from app import db
from datetime import datetime

class RecurringDonation(db.Model):
    __tablename__ = "recurring_donations"

    STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"]
    # Days of week: 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday, 5 = Saturday, 6 = Sunday
    DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0 to 6
    usual_time = db.Column(db.String(10), nullable=False, default="14:00")  # HH:MM format
    expected_servings = db.Column(db.Integer, nullable=False, default=20)
    unit = db.Column(db.String(50), default="servings")
    pickup_location = db.Column(db.Text, nullable=False)
    pickup_window_hours = db.Column(db.Integer, default=3, nullable=False)
    status = db.Column(db.String(20), default="ACTIVE", nullable=False, index=True)  # ACTIVE, PAUSED, CANCELLED
    last_generated_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    donor = db.relationship("User", backref=db.backref("recurring_donations", lazy="dynamic"))

    def to_dict(self):
        donor_profile = self.donor.profile if self.donor else None
        day_str = self.DAY_NAMES[self.day_of_week] if 0 <= self.day_of_week <= 6 else f"Day {self.day_of_week}"
        return {
            "id": self.id,
            "donor_id": self.donor_id,
            "donor_name": donor_profile.organization_name if donor_profile else None,
            "donor_type": donor_profile.donor_type if donor_profile else None,
            "title": self.title,
            "description": self.description,
            "day_of_week": self.day_of_week,
            "day_name": day_str,
            "usual_time": self.usual_time,
            "expected_servings": self.expected_servings,
            "unit": self.unit,
            "pickup_location": self.pickup_location,
            "pickup_window_hours": self.pickup_window_hours,
            "status": self.status,
            "last_generated_at": self.last_generated_at.isoformat() if self.last_generated_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
