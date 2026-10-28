import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing, Request, StatusHistory
from app.services.expiry_service import check_and_expire_listings


class AutoExpiryTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            donor = User(email="donor_exp@demo.local", role="donor")
            donor.set_password("pass1234")
            db.session.add(donor)
            db.session.flush()
            db.session.add(Profile(user_id=donor.id, organization_name="Bakery One", contact_name="Tom"))

            rec = User(email="rec_exp@demo.local", role="recipient")
            rec.set_password("pass1234")
            db.session.add(rec)
            db.session.flush()
            db.session.add(Profile(user_id=rec.id, organization_name="Shelter One", contact_name="Eva"))

            db.session.commit()

            self.donor_id = donor.id
            self.rec_id = rec.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_auto_expiry_job(self):
        """
        RULE: Listings past pickup_end auto-expire; their pending requests auto-cancel.
        Future listings must remain untouched.
        """
        now = datetime.utcnow()
        with self.app.app_context():
            # 1. Create an expired listing (pickup_end was 2 hours ago)
            past_listing = Listing(
                donor_id=self.donor_id,
                title="Past Pastries — 30 units",
                quantity_total=30,
                quantity_left=30,
                unit="pastries",
                prepared_at=now - timedelta(hours=8),
                use_by=now - timedelta(hours=1),
                pickup_location="Back counter",
                pickup_start=now - timedelta(hours=4),
                pickup_end=now - timedelta(hours=2),
                status="AVAILABLE",
            )
            db.session.add(past_listing)
            db.session.flush()

            # Attach a PENDING request to this past listing
            pending_req = Request(
                listing_id=past_listing.id,
                recipient_id=self.rec_id,
                quantity=10,
                status="PENDING",
                note="Wanted for afternoon tea",
            )
            db.session.add(pending_req)

            # 2. Create a future listing (pickup_end is 3 hours from now)
            future_listing = Listing(
                donor_id=self.donor_id,
                title="Future Sandwiches — 20 units",
                quantity_total=20,
                quantity_left=20,
                unit="sandwiches",
                prepared_at=now - timedelta(hours=1),
                use_by=now + timedelta(hours=6),
                pickup_location="Front desk",
                pickup_start=now + timedelta(hours=1),
                pickup_end=now + timedelta(hours=3),
                status="AVAILABLE",
            )
            db.session.add(future_listing)
            db.session.commit()

            past_lid = past_listing.id
            future_lid = future_listing.id
            req_id = pending_req.id

            # Run the expiry service
            result = check_and_expire_listings()
            self.assertGreaterEqual(result["expired_listings"], 1)
            self.assertGreaterEqual(result["cancelled_requests"], 1)

            # Verify past listing expired
            db.session.expire_all()
            l_past = db.session.get(Listing, past_lid)
            self.assertEqual(l_past.status, "EXPIRED")

            # Verify pending request auto-cancelled
            r_past = db.session.get(Request, req_id)
            self.assertEqual(r_past.status, "CANCELLED")

            # Verify future listing was NOT expired
            l_future = db.session.get(Listing, future_lid)
            self.assertEqual(l_future.status, "AVAILABLE")

            # Verify audit trail for listing and request
            histories = StatusHistory.query.filter_by(entity_type="listing", entity_id=past_lid).all()
            self.assertTrue(any(h.to_status == "EXPIRED" for h in histories))

            req_histories = StatusHistory.query.filter_by(entity_type="request", entity_id=req_id).all()
            self.assertTrue(any(h.to_status == "CANCELLED" for h in req_histories))


if __name__ == "__main__":
    unittest.main()
