import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing, Request, StatusHistory


class CancellationRulesTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # Donor
            donor = User(email="donor_cancel@demo.local", role="donor")
            donor.set_password("pass1234")
            db.session.add(donor)
            db.session.flush()
            db.session.add(Profile(user_id=donor.id, organization_name="Bistro Paris", contact_name="Pierre"))

            # Recipient
            rec = User(email="rec_cancel@demo.local", role="recipient")
            rec.set_password("pass1234")
            db.session.add(rec)
            db.session.flush()
            db.session.add(Profile(user_id=rec.id, organization_name="Hope Shelter", contact_name="Sarah"))

            db.session.commit()

            self.donor_token = self.client.post("/api/auth/login", json={"email": "donor_cancel@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec_token = self.client.post("/api/auth/login", json={"email": "rec_cancel@demo.local", "password": "pass1234"}).get_json()["token"]

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_cancelling_accepted_request_restores_quantity_and_availability(self):
        """
        RULE: Cancelling an accepted request returns quantity to the listing.
        If listing was RESERVED, it returns to AVAILABLE.
        """
        now = datetime.utcnow()
        # 1. Create listing for 10 servings
        res = self.client.post("/api/listings/", json={
            "title": "Fresh Quiche — 10 servings",
            "quantity_total": 10,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=6)).isoformat(),
            "pickup_location": "Bistro Side Door",
            "pickup_start": (now + timedelta(hours=1)).isoformat(),
            "pickup_end": (now + timedelta(hours=3)).isoformat(),
        }, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 201)
        lid = res.get_json()["listing"]["id"]

        # 2. Recipient requests ALL 10 servings
        res_req = self.client.post("/api/requests/", json={
            "listing_id": lid,
            "quantity": 10,
            "note": "Breakfast pickup"
        }, headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(res_req.status_code, 201)
        req_id = res_req.get_json()["request"]["id"]

        # 3. Donor accepts -> quantity_left becomes 0, status becomes RESERVED
        res_accept = self.client.post(f"/api/requests/{req_id}/accept", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res_accept.status_code, 200)
        self.assertEqual(res_accept.get_json()["listing"]["quantity_left"], 0)
        self.assertEqual(res_accept.get_json()["listing"]["status"], "RESERVED")

        # 4. Recipient cancels the ACCEPTED request
        res_cancel = self.client.post(f"/api/requests/{req_id}/cancel", json={
            "reason": "Driver vehicle flat tire"
        }, headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(res_cancel.status_code, 200)
        self.assertEqual(res_cancel.get_json()["request"]["status"], "CANCELLED")

        # 5. Check listing state in DB: quantity_left must be 10, status must be AVAILABLE
        with self.app.app_context():
            listing = db.session.get(Listing, lid)
            self.assertEqual(listing.quantity_left, 10)
            self.assertEqual(listing.status, "AVAILABLE")

            # Check audit history
            histories = StatusHistory.query.filter_by(entity_type="listing", entity_id=lid).all()
            transitions = [(h.from_status, h.to_status) for h in histories]
            self.assertIn(("RESERVED", "AVAILABLE"), transitions)

    def test_donor_cancelling_listing_cancels_pending_requests(self):
        """
        RULE: When a donor cancels a listing, its status becomes REMOVED
        and any pending requests are automatically cancelled.
        """
        now = datetime.utcnow()
        res = self.client.post("/api/listings/", json={
            "title": "Vegetable Stir Fry — 15 portions",
            "quantity_total": 15,
            "unit": "portions",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=5)).isoformat(),
            "pickup_location": "Kitchen",
            "pickup_start": (now + timedelta(hours=1)).isoformat(),
            "pickup_end": (now + timedelta(hours=3)).isoformat(),
        }, headers={"Authorization": f"Bearer {self.donor_token}"})
        lid = res.get_json()["listing"]["id"]

        res_req = self.client.post("/api/requests/", json={
            "listing_id": lid,
            "quantity": 5,
        }, headers={"Authorization": f"Bearer {self.rec_token}"})
        req_id = res_req.get_json()["request"]["id"]

        # Donor cancels listing
        res_cancel_listing = self.client.post(f"/api/listings/{lid}/cancel", json={
            "reason": "Power outage in kitchen"
        }, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res_cancel_listing.status_code, 200)
        self.assertEqual(res_cancel_listing.get_json()["listing"]["status"], "REMOVED")

        # Verify request status in DB was automatically set to CANCELLED
        with self.app.app_context():
            req = db.session.get(Request, req_id)
            self.assertEqual(req.status, "CANCELLED")

    def test_cannot_accept_request_on_removed_or_expired_listing(self):
        """Cannot accept request when listing is REMOVED or past its pickup_end."""
        now = datetime.utcnow()
        res = self.client.post("/api/listings/", json={
            "title": "Fresh Bread — 10 loaves",
            "quantity_total": 10,
            "unit": "loaves",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=5)).isoformat(),
            "pickup_location": "Bakery",
            "pickup_start": (now + timedelta(hours=1)).isoformat(),
            "pickup_end": (now + timedelta(hours=3)).isoformat(),
        }, headers={"Authorization": f"Bearer {self.donor_token}"})
        lid = res.get_json()["listing"]["id"]

        res_req = self.client.post("/api/requests/", json={
            "listing_id": lid,
            "quantity": 5,
        }, headers={"Authorization": f"Bearer {self.rec_token}"})
        req_id = res_req.get_json()["request"]["id"]

        # Cancel listing to REMOVED
        self.client.post(f"/api/listings/{lid}/cancel", json={"reason": "Bakery closed"}, headers={"Authorization": f"Bearer {self.donor_token}"})

        # Try to accept: must fail with 400
        res_accept = self.client.post(f"/api/requests/{req_id}/accept", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res_accept.status_code, 400)


if __name__ == "__main__":
    unittest.main()
