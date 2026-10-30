from datetime import datetime
from app import db
from app.models import Listing, Request, StatusHistory


def check_and_expire_listings():
    """
    Core rule: Listings past pickup_end auto-expire; their pending requests auto-cancel.
    """
    now = datetime.utcnow()
    expired_listings = Listing.query.filter(
        Listing.status.in_(["AVAILABLE", "RESERVED", "PENDING_APPROVAL"]),
        Listing.pickup_end <= now
    ).all()

    expired_count = 0
    cancelled_requests_count = 0

    for listing in expired_listings:
        old_status = listing.status
        listing.status = "EXPIRED"
        expired_count += 1

        db.session.add(StatusHistory(
            entity_type="listing",
            entity_id=listing.id,
            from_status=old_status,
            to_status="EXPIRED",
            actor_id=None,
            note="Auto-expired: pickup window closed"
        ))

        # Auto-cancel pending requests on this expired listing
        pending_requests = listing.requests.filter_by(status="PENDING").all()
        for req in pending_requests:
            req.status = "CANCELLED"
            cancelled_requests_count += 1
            db.session.add(StatusHistory(
                entity_type="request",
                entity_id=req.id,
                from_status="PENDING",
                to_status="CANCELLED",
                actor_id=None,
                note="Auto-cancelled: food listing expired"
            ))

    if expired_count > 0 or cancelled_requests_count > 0:
        db.session.commit()

    return {
        "expired_listings": expired_count,
        "cancelled_requests": cancelled_requests_count,
        "timestamp": now.isoformat()
    }
