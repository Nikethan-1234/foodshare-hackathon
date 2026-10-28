from app import db
from datetime import datetime

class StatusHistory(db.Model):
    __tablename__ = "status_history"

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(20), nullable=False)  # listing or request
    entity_id = db.Column(db.Integer, nullable=False)
    from_status = db.Column(db.String(20))
    to_status = db.Column(db.String(20), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    actor = db.relationship("User")

    def to_dict(self):
        actor_name = None
        if self.actor:
            actor_name = self.actor.profile.organization_name if self.actor.profile else self.actor.email

        return {
            "id": self.id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity": f"{self.entity_type}:{self.entity_id}",
            "from_status": self.from_status,
            "from": self.from_status,
            "to_status": self.to_status,
            "to": self.to_status,
            "actor_id": self.actor_id,
            "actor": actor_name or "System",
            "note": self.note,
            "timestamp": self.created_at.isoformat(),
            "created_at": self.created_at.isoformat(),
        }
