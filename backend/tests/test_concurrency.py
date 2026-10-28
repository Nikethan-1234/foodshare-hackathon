import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing, Request, StatusHistory


class ConcurrencyAndDoubleBookingTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            # Create donor
            donor = User(email="donor_test@demo.local", role="donor")
            donor.set_password("pass1234")
            db.session.add(donor)
            db.session.flush()
            db.session.add(Profile(user_id=donor.id, organization_name="Test Kitchen", contact_name="Chef Dave"))

            # Create recipient 1
            rec1 = User(email="rec1_test@demo.local", role="recipient")
            rec1.set_password("pass1234")
            db.session.add(rec1)
            db.session.flush()
            db.session.add(Profile(user_id=rec1.id, organization_name="Shelter One", contact_name="Alice"))

            # Create recipient 2
            rec2 = User(email="rec2_test@demo.local", role="recipient")
            rec2.set_password("pass1234")
            db.session.add(rec2)
            db.session.flush()
            db.session.add(Profile(user_id=rec2.id, organization_name="Shelter Two", contact_name="Bob"))

            # Create recipient 3
            rec3 = User(email="rec3_test@demo.local", role="recipient")
            rec3.set_password("pass1234")
            db.session.add(rec3)
            db.session.flush()
            db.session.add(Profile(user_id=rec3.id, organization_name="Shelter Three", contact_name="Carol"))

            db.session.commit()

            # Retrieve JWTs
            self.donor_token = self.client.post("/api/auth/login", json={"email": "donor_test@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec1_token = self.client.post("/api/auth/login", json={"email": "rec1_test@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec2_token = self.client.post("/api/auth/login", json={"email": "rec2_test@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec3_token = self.client.post("/api/auth/login", json={"email": "rec3_test@demo.local", "password": "pass1234"}).get_json()["token"]

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_double_booking_prevention(self):
        """
        Verify that multiple requests competing for limited quantity cannot overbook the listing.
        """
        now = datetime.utcnow()
        # 1. Donor creates listing with 25 portions total
        res = self.client.post("/api/listings/", json={
            "title": "Fresh Beef Lasagna — 25 portions",
            "quantity_total": 25,
            "unit": "portions",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=8)).isoformat(),
            "pickup_location": "Kitchen Back Door",
            "pickup_start": (now + timedelta(hours=1)).isoformat(),
            "pickup_end": (now + timedelta(hours=4)).isoformat(),
        }, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 201)
        listing_id = res.get_json()["listing"]["id"]

        # 2. Recipient 1 requests 15 portions
        res1 = self.client.post("/api/requests/", json={
            "listing_id": listing_id,
            "quantity": 15,
            "note": "Shelter One dinner"
        }, headers={"Authorization": f"Bearer {self.rec1_token}"})
        self.assertEqual(res1.status_code, 201)
        req1_id = res1.get_json()["request"]["id"]

        # 3. Recipient 2 requests 15 portions (15 + 15 = 30 > 25 total)
        res2 = self.client.post("/api/requests/", json={
            "listing_id": listing_id,
            "quantity": 15,
            "note": "Shelter Two dinner"
        }, headers={"Authorization": f"Bearer {self.rec2_token}"})
        self.assertEqual(res2.status_code, 201)
        req2_id = res2.get_json()["request"]["id"]

        # 4. Donor accepts Recipient 1's request for 15 portions
        res_accept1 = self.client.post(f"/api/requests/{req1_id}/accept", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res_accept1.status_code, 200)
        listing_data = res_accept1.get_json()["listing"]
        self.assertEqual(listing_data["quantity_left"], 10)
        self.assertEqual(listing_data["status"], "AVAILABLE")

        # 5. Donor attempts to accept Recipient 2's request for 15 portions (only 10 remaining)
        res_accept2 = self.client.post(f"/api/requests/{req2_id}/accept", headers={"Authorization": f"Bearer {self.donor_token}"})
        # MUST fail with 409 Conflict
        self.assertEqual(res_accept2.status_code, 409)
        err_data = res_accept2.get_json()
        self.assertIn("Double booking prevented", err_data["error"])
        self.assertEqual(err_data["quantity_left"], 10)
        self.assertEqual(err_data["quantity_requested"], 15)

        # 6. Recipient 3 requests the exact remaining 10 portions
        res3 = self.client.post("/api/requests/", json={
            "listing_id": listing_id,
            "quantity": 10,
        }, headers={"Authorization": f"Bearer {self.rec3_token}"})
        self.assertEqual(res3.status_code, 201)
        req3_id = res3.get_json()["request"]["id"]

        # 7. Donor accepts Recipient 3's request -> quantity_left drops to 0, status transitions to RESERVED
        res_accept3 = self.client.post(f"/api/requests/{req3_id}/accept", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res_accept3.status_code, 200)
        final_listing = res_accept3.get_json()["listing"]
        self.assertEqual(final_listing["quantity_left"], 0)
        self.assertEqual(final_listing["status"], "RESERVED")

        # 8. Verify audit history records
        with self.app.app_context():
            histories = StatusHistory.query.filter_by(entity_type="listing", entity_id=listing_id).all()
            status_transitions = [h.to_status for h in histories]
            self.assertIn("AVAILABLE", status_transitions)
            self.assertIn("RESERVED", status_transitions)


if __name__ == "__main__":
    unittest.main()
