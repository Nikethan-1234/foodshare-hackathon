"""
DEMO DATA SCRIPT — for development only.
This data is fictitious. This platform is not a food-safety certification system.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from app import create_app, db
from app.models import User, Profile, Listing, Request, StatusHistory

DEMO_DISCLAIMER = "DEMO DATA — not for production use"

DONORS = [
    {
        "email": "donor@demo.local",
        "password": "demo1234",
        "role": "donor",
        "organization_name": "Green Leaf Restaurant",
        "contact_name": "Marco Rossi",
        "phone": "+1-555-0101",
        "address": "42 Maple St, Springfield, IL 62701",
        "description": "Family restaurant specializing in Mediterranean cuisine. We regularly have surplus prepared meals at end of service.",
    },
    {
        "email": "donor2@demo.local",
        "password": "demo1234",
        "role": "donor",
        "organization_name": "City Catering Co.",
        "contact_name": "Priya Nair",
        "phone": "+1-555-0102",
        "address": "18 Oak Ave, Springfield, IL 62702",
        "description": "Corporate catering company with frequent event surpluses.",
    },
    {
        "email": "donor3@demo.local",
        "password": "demo1234",
        "role": "donor",
        "organization_name": "Sunrise Bakery",
        "contact_name": "James Okafor",
        "phone": "+1-555-0103",
        "address": "7 Elm Rd, Springfield, IL 62703",
        "description": "Artisan bakery. End-of-day bread and pastry surplus available most days.",
    },
]

RECIPIENTS = [
    {
        "email": "recipient@demo.local",
        "password": "demo1234",
        "role": "recipient",
        "organization_name": "Hope Community Kitchen",
        "contact_name": "Sandra Brooks",
        "phone": "+1-555-0201",
        "address": "100 Main St, Springfield, IL 62704",
        "description": "Community kitchen serving hot meals to 150+ residents daily.",
    },
    {
        "email": "recipient2@demo.local",
        "password": "demo1234",
        "role": "recipient",
        "organization_name": "Springfield Food Bank",
        "contact_name": "Tom Harrigan",
        "phone": "+1-555-0202",
        "address": "55 River Blvd, Springfield, IL 62705",
        "description": "Regional food bank distributing to 30 partner agencies.",
    },
    {
        "email": "recipient3@demo.local",
        "password": "demo1234",
        "role": "recipient",
        "organization_name": "Shelter First Network",
        "contact_name": "Aisha Mohammed",
        "phone": "+1-555-0203",
        "address": "22 Pine Lane, Springfield, IL 62706",
        "description": "Network of emergency shelters across three counties.",
    },
]

ADMIN = {
    "email": "admin@demo.local",
    "password": "demo1234",
    "role": "admin",
    "organization_name": "Platform Administration",
    "contact_name": "Admin User",
    "phone": "",
    "address": "",
    "description": "Platform moderator account.",
}

now = datetime.utcnow()

LISTINGS_DATA = [
    {
        "title": "Grilled chicken and rice — 40 portions",
        "description": "Freshly prepared grilled chicken breast with steamed rice and salad. Packaged in individual containers. Halal-certified kitchen.",
        "quantity_total": 40,
        "unit": "portions",
        "prepared_at": now - timedelta(hours=2),
        "use_by": now + timedelta(hours=6),
        "pickup_location": "42 Maple St, Springfield — side entrance, ring bell",
        "pickup_start": now + timedelta(hours=1),
        "pickup_end": now + timedelta(hours=3),
        "status": "AVAILABLE",
        "donor_index": 0,
    },
    {
        "title": "Vegetable pasta — 60 portions",
        "description": "Penne with roasted vegetables in marinara sauce. Suitable for vegetarians. Allergen: gluten, dairy.",
        "quantity_total": 60,
        "unit": "portions",
        "prepared_at": now - timedelta(hours=1),
        "use_by": now + timedelta(hours=8),
        "pickup_location": "42 Maple St, Springfield — kitchen loading bay",
        "pickup_start": now + timedelta(hours=2),
        "pickup_end": now + timedelta(hours=5),
        "status": "AVAILABLE",
        "donor_index": 0,
    },
    {
        "title": "Mixed sandwich platter — 80 units",
        "description": "Assorted sandwiches from a cancelled corporate lunch. Ham, turkey, and veggie options. Individually wrapped.",
        "quantity_total": 80,
        "unit": "sandwiches",
        "prepared_at": now - timedelta(hours=3),
        "use_by": now + timedelta(hours=5),
        "pickup_location": "18 Oak Ave, Springfield — reception desk",
        "pickup_start": now + timedelta(minutes=30),
        "pickup_end": now + timedelta(hours=2),
        "status": "AVAILABLE",
        "donor_index": 1,
    },
    {
        "title": "Sourdough loaves — 25 loaves",
        "description": "Fresh-baked sourdough. Baked this morning, cooling complete. No preservatives. Best consumed today.",
        "quantity_total": 25,
        "unit": "loaves",
        "prepared_at": now - timedelta(hours=4),
        "use_by": now + timedelta(hours=10),
        "pickup_location": "7 Elm Rd, Springfield — front of bakery, ask for James",
        "pickup_start": now + timedelta(hours=1),
        "pickup_end": now + timedelta(hours=4),
        "status": "AVAILABLE",
        "donor_index": 2,
    },
    {
        "title": "Croissants and pastries — 120 units",
        "description": "Day-old croissants, pain au chocolat, and cinnamon rolls. Perfectly good, not sold today.",
        "quantity_total": 120,
        "unit": "pastries",
        "prepared_at": now - timedelta(hours=6),
        "use_by": now + timedelta(hours=8),
        "pickup_location": "7 Elm Rd, Springfield — back door, after 4pm",
        "pickup_start": now + timedelta(hours=2),
        "pickup_end": now + timedelta(hours=6),
        "status": "AVAILABLE",
        "donor_index": 2,
    },
    {
        "title": "Beef stew — 35 portions",
        "description": "Slow-cooked beef stew with root vegetables. Contains gluten (thickener). Not suitable for vegetarians.",
        "quantity_total": 35,
        "unit": "portions",
        "prepared_at": now - timedelta(hours=2),
        "use_by": now + timedelta(hours=6),
        "pickup_location": "42 Maple St, Springfield — kitchen loading bay",
        "pickup_start": now + timedelta(hours=1),
        "pickup_end": now + timedelta(hours=4),
        "status": "RESERVED",
        "donor_index": 0,
    },
    {
        "title": "Fruit salad cups — 50 units",
        "description": "Pre-portioned fresh fruit cups. Mixed seasonal fruit, no added sugar. Best consumed within 4 hours.",
        "quantity_total": 50,
        "unit": "cups",
        "prepared_at": now - timedelta(hours=1),
        "use_by": now + timedelta(hours=4),
        "pickup_location": "18 Oak Ave, Springfield — cold storage room B",
        "pickup_start": now + timedelta(minutes=45),
        "pickup_end": now + timedelta(hours=2, minutes=30),
        "status": "AVAILABLE",
        "donor_index": 1,
    },
    {
        "title": "Lentil soup — 45 portions",
        "description": "Red lentil soup, vegan, no allergens declared. Packaged in sealed containers, still warm.",
        "quantity_total": 45,
        "unit": "portions",
        "prepared_at": now - timedelta(hours=1, minutes=30),
        "use_by": now + timedelta(hours=7),
        "pickup_location": "42 Maple St, Springfield — side entrance",
        "pickup_start": now + timedelta(hours=1),
        "pickup_end": now + timedelta(hours=4),
        "status": "AVAILABLE",
        "donor_index": 0,
    },
    {
        "title": "Corporate lunch boxes — 30 boxes",
        "description": "Bento-style lunch boxes from a cancelled meeting. Rice, grilled salmon, pickled vegetables. Contains fish.",
        "quantity_total": 30,
        "unit": "boxes",
        "prepared_at": now - timedelta(hours=2),
        "use_by": now + timedelta(hours=5),
        "pickup_location": "18 Oak Ave, Springfield — loading dock",
        "pickup_start": now + timedelta(hours=1),
        "pickup_end": now + timedelta(hours=3),
        "status": "AVAILABLE",
        "donor_index": 1,
    },
    {
        "title": "Whole grain rolls — 90 units",
        "description": "Seeded whole grain dinner rolls, baked this morning. Suitable for vegans. No nuts.",
        "quantity_total": 90,
        "unit": "rolls",
        "prepared_at": now - timedelta(hours=5),
        "use_by": now + timedelta(hours=9),
        "pickup_location": "7 Elm Rd, Springfield — side window",
        "pickup_start": now + timedelta(hours=3),
        "pickup_end": now + timedelta(hours=6),
        "status": "AVAILABLE",
        "donor_index": 2,
    },
]


def seed():
    app = create_app()
    with app.app_context():
        print("Dropping existing tables...")
        db.drop_all()
        print("Creating tables...")
        db.create_all()

        print("Seeding users...")
        donor_users = []
        for d in DONORS:
            u = User(email=d["email"], role=d["role"])
            u.set_password(d["password"])
            db.session.add(u)
            db.session.flush()
            p = Profile(
                user_id=u.id,
                organization_name=d["organization_name"],
                contact_name=d["contact_name"],
                phone=d["phone"],
                address=d["address"],
                description=d["description"],
            )
            db.session.add(p)
            donor_users.append(u)

        recipient_users = []
        for r in RECIPIENTS:
            u = User(email=r["email"], role=r["role"])
            u.set_password(r["password"])
            db.session.add(u)
            db.session.flush()
            p = Profile(
                user_id=u.id,
                organization_name=r["organization_name"],
                contact_name=r["contact_name"],
                phone=r["phone"],
                address=r["address"],
                description=r["description"],
            )
            db.session.add(p)
            recipient_users.append(u)

        admin_u = User(email=ADMIN["email"], role=ADMIN["role"])
        admin_u.set_password(ADMIN["password"])
        db.session.add(admin_u)
        db.session.flush()
        admin_p = Profile(
            user_id=admin_u.id,
            organization_name=ADMIN["organization_name"],
            contact_name=ADMIN["contact_name"],
        )
        db.session.add(admin_p)

        print("Seeding listings...")
        listing_objs = []
        for ld in LISTINGS_DATA:
            donor = donor_users[ld["donor_index"]]
            listing = Listing(
                donor_id=donor.id,
                title=ld["title"],
                description=ld["description"],
                quantity_total=ld["quantity_total"],
                quantity_left=ld["quantity_total"],
                unit=ld["unit"],
                prepared_at=ld["prepared_at"],
                use_by=ld["use_by"],
                pickup_location=ld["pickup_location"],
                pickup_start=ld["pickup_start"],
                pickup_end=ld["pickup_end"],
                status=ld["status"],
            )
            from app.services.ai_service import detect_allergens_and_dietary
            auto_a, auto_d = detect_allergens_and_dietary(f"{ld['title']} {ld['description']}")
            listing.allergens = ", ".join(auto_a)
            listing.dietary_tags = ", ".join(auto_d)

            db.session.add(listing)
            db.session.flush()
            sh = StatusHistory(
                entity_type="listing",
                entity_id=listing.id,
                from_status=None,
                to_status=listing.status,
                actor_id=donor.id,
                note="Created via seed script (demo data)",
            )
            db.session.add(sh)
            listing_objs.append(listing)

        print("Seeding sample requests...")
        # One accepted request on the RESERVED listing (listing index 5)
        reserved_listing = listing_objs[5]
        req1 = Request(
            listing_id=reserved_listing.id,
            recipient_id=recipient_users[0].id,
            quantity=20,
            status="ACCEPTED",
            note="We can pick up between 2-3pm. Will bring our own containers.",
        )
        db.session.add(req1)
        db.session.flush()
        reserved_listing.quantity_left = reserved_listing.quantity_total - 20
        db.session.add(StatusHistory(
            entity_type="request",
            entity_id=req1.id,
            from_status=None,
            to_status="PENDING",
            actor_id=recipient_users[0].id,
            note="Demo request",
        ))
        db.session.add(StatusHistory(
            entity_type="request",
            entity_id=req1.id,
            from_status="PENDING",
            to_status="ACCEPTED",
            actor_id=donor_users[0].id,
            note="Demo acceptance",
        ))

        # Pending request on an AVAILABLE listing
        req2 = Request(
            listing_id=listing_objs[0].id,
            recipient_id=recipient_users[1].id,
            quantity=15,
            status="PENDING",
            note="Would like to pick up for our Thursday dinner service.",
        )
        db.session.add(req2)
        db.session.flush()
        db.session.add(StatusHistory(
            entity_type="request",
            entity_id=req2.id,
            from_status=None,
            to_status="PENDING",
            actor_id=recipient_users[1].id,
            note="Demo request",
        ))

        db.session.commit()
        print("\n" + "="*60)
        print("DEMO DATA SEEDED SUCCESSFULLY")
        print("="*60)
        print("\nDISCLAIMER: This is demo data for development only.")
        print("This platform is NOT a food-safety certification system.\n")
        print("Demo credentials (password: demo1234 for all):")
        print(f"  Admin:     admin@demo.local")
        print(f"  Donor 1:   donor@demo.local     (Green Leaf Restaurant)")
        print(f"  Donor 2:   donor2@demo.local    (City Catering Co.)")
        print(f"  Donor 3:   donor3@demo.local    (Sunrise Bakery)")
        print(f"  Recipient 1: recipient@demo.local  (Hope Community Kitchen)")
        print(f"  Recipient 2: recipient2@demo.local (Springfield Food Bank)")
        print(f"  Recipient 3: recipient3@demo.local (Shelter First Network)")
        print("="*60)


if __name__ == "__main__":
    seed()
