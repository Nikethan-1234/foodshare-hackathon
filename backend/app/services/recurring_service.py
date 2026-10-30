"""
Service to generate normal listings from active RecurringDonation schedules.
Can be run on-demand or as part of scheduled background jobs.
"""
from datetime import datetime, timedelta, time
from app import db
from app.models import RecurringDonation, Listing, StatusHistory

def generate_listing_from_recurring(recurring, target_date=None):
    """
    Generate a concrete Listing from a RecurringDonation instance.
    If target_date is not provided, defaults to today.
    """
    if recurring.status != "ACTIVE":
        return None

    now = datetime.utcnow()
    date_to_use = target_date or now.date()

    # Parse usual_time HH:MM
    try:
        parts = recurring.usual_time.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
    except Exception:
        hour, minute = 14, 0

    pickup_start = datetime.combine(date_to_use, time(hour, minute))
    pickup_end = pickup_start + timedelta(hours=recurring.pickup_window_hours)
    prepared_at = pickup_start - timedelta(hours=1)
    use_by = pickup_end + timedelta(hours=4)

    # Create listing
    listing = Listing(
        donor_id=recurring.donor_id,
        title=f"{recurring.title}",
        description=f"{recurring.description or ''} (Recurring weekly series: {recurring.DAY_NAMES[recurring.day_of_week]} at {recurring.usual_time})".strip(),
        quantity_total=recurring.expected_servings,
        quantity_left=recurring.expected_servings,
        unit=recurring.unit or "servings",
        prepared_at=prepared_at,
        use_by=use_by,
        pickup_location=recurring.pickup_location,
        pickup_start=pickup_start,
        pickup_end=pickup_end,
        status="AVAILABLE",
        is_covered=True,
        is_stored_properly=True,
        is_not_reheated=True,
        is_packaged_cleanly=True,
    )
    db.session.add(listing)
    db.session.flush()

    # Add audit log
    history = StatusHistory(
        entity_type="listing",
        entity_id=listing.id,
        from_status=None,
        to_status="AVAILABLE",
        actor_id=recurring.donor_id,
        note=f"Automatically generated from active recurring series #{recurring.id} ({recurring.title})",
    )
    db.session.add(history)

    recurring.last_generated_at = now
    db.session.commit()
    return listing


def run_recurring_listings_generator():
    """
    Scans all ACTIVE RecurringDonations.
    Generates a normal listing for upcoming occurrences if one hasn't been generated today.
    Returns list of generated listings.
    """
    now = datetime.utcnow()
    today_weekday = now.weekday()  # 0 = Monday, 6 = Sunday

    # Active recurring donations matching today's weekday
    active_series = RecurringDonation.query.filter_by(status="ACTIVE", day_of_week=today_weekday).all()
    generated = []

    for series in active_series:
        # Avoid generating more than once in the same calendar day
        if series.last_generated_at and series.last_generated_at.date() == now.date():
            continue

        l = generate_listing_from_recurring(series, target_date=now.date())
        if l:
            generated.append(l)

    return generated
