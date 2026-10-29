"""
Phase 2 tests: Trust and safety rules for individual donors,
simulated phone OTP verification, handling checklist enforcement,
time-window limits, and admin approval workflows.
"""
import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing, Request, StatusHistory, Report


class TrustAndSafetyTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # 1. Admin
            admin = User(email="admin_safety@demo.local", role="admin")
            admin.set_password("pass1234")
            db.session.add(admin)

            # 2. Restaurant donor (already phone verified)
            rest_donor = User(email="rest_safety@demo.local", role="donor")
            rest_donor.set_password("pass1234")
            db.session.add(rest_donor)
            db.session.flush()
            p_rest = Profile(
                user_id=rest_donor.id,
                organization_name="Green Leaf",
                contact_name="Marco",
                donor_type="RESTAURANT",
                phone="+1-555-0101",
                phone_verified=True,
            )
            db.session.add(p_rest)

            # 3. Individual donor (unverified phone, 0 completed donations)
            indiv_unverified = User(email="indiv_unverified@demo.local", role="donor")
            indiv_unverified.set_password("pass1234")
            db.session.add(indiv_unverified)
            db.session.flush()
            p_indiv1 = Profile(
                user_id=indiv_unverified.id,
                organization_name="Ravi Patel",
                contact_name="Ravi Patel",
                donor_type="INDIVIDUAL",
                phone="+1-555-0401",
                phone_verified=False,
            )
            db.session.add(p_indiv1)

            # 4. Individual donor (phone verified, 0 completed donations)
            indiv_verified = User(email="indiv_verified@demo.local", role="donor")
            indiv_verified.set_password("pass1234")
            db.session.add(indiv_verified)
            db.session.flush()
            p_indiv2 = Profile(
                user_id=indiv_verified.id,
                organization_name="Meena K",
                contact_name="Meena K",
                donor_type="INDIVIDUAL",
                phone="+1-555-0402",
                phone_verified=True,
            )
            db.session.add(p_indiv2)

            # 5. Recipient
            rec = User(email="rec_safety@demo.local", role="recipient")
            rec.set_password("pass1234")
            db.session.add(rec)
            db.session.flush()
            p_rec = Profile(
                user_id=rec.id,
                organization_name="Hope Kitchen",
                contact_name="Sandra",
            )
            db.session.add(p_rec)

            db.session.commit()

            # Store tokens
            self.admin_token = self.client.post("/api/auth/login", json={"email": "admin_safety@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rest_token = self.client.post("/api/auth/login", json={"email": "rest_safety@demo.local", "password": "pass1234"}).get_json()["token"]
            self.unverified_token = self.client.post("/api/auth/login", json={"email": "indiv_unverified@demo.local", "password": "pass1234"}).get_json()["token"]
            self.verified_token = self.client.post("/api/auth/login", json={"email": "indiv_verified@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec_token = self.client.post("/api/auth/login", json={"email": "rec_safety@demo.local", "password": "pass1234"}).get_json()["token"]

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _valid_payload(self, qty=15, hours_ago=1):
        now = datetime.utcnow()
        return {
            "title": "Fresh Surplus Meals",
            "description": "Vegetable fried rice with paneer",
            "quantity_total": qty,
            "unit": "servings",
            "pickup_location": "123 Main St",
            "prepared_at": (now - timedelta(hours=hours_ago)).isoformat(),
            "use_by": (now + timedelta(hours=6)).isoformat(),
            "pickup_start": (now + timedelta(minutes=30)).isoformat(),
            "pickup_end": (now + timedelta(hours=3)).isoformat(),
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }

    # -------------------------------------------------------------
    # 1. Phone OTP Verification
    # -------------------------------------------------------------
    def test_send_and_verify_phone_otp(self):
        """Individual requests demo OTP, fails with bad code, and succeeds with demo code 123456."""
        # Request OTP
        res = self.client.post("/api/users/phone/send-otp", headers={"Authorization": f"Bearer {self.unverified_token}"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["otp_code"], "123456")

        # Verify with wrong code
        res_fail = self.client.post("/api/users/phone/verify-otp", json={"otp": "999999"}, headers={"Authorization": f"Bearer {self.unverified_token}"})
        self.assertEqual(res_fail.status_code, 422)

        # Verify with valid demo code
        res_ok = self.client.post("/api/users/phone/verify-otp", json={"otp": "123456"}, headers={"Authorization": f"Bearer {self.unverified_token}"})
        self.assertEqual(res_ok.status_code, 200)
        self.assertTrue(res_ok.get_json()["phone_verified"])

    def test_individual_cannot_post_without_phone_verification(self):
        """Unverified individual is blocked from creating listings with 403."""
        payload = self._valid_payload()
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.unverified_token}"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("Phone verification is required", res.get_json()["error"])

    # -------------------------------------------------------------
    # 2. Minimum Quantity for Individual Listings
    # -------------------------------------------------------------
    def test_individual_minimum_quantity_enforced(self):
        """Individual posting fewer than 10 servings gets a 422 error."""
        payload = self._valid_payload(qty=5)
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.verified_token}"})
        self.assertEqual(res.status_code, 422)
        self.assertIn("quantity_total", res.get_json()["fields"])

    def test_restaurant_not_restricted_by_individual_min_quantity(self):
        """Restaurant donor can post smaller quantities (e.g. 5 servings)."""
        payload = self._valid_payload(qty=5)
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.rest_token}"})
        self.assertEqual(res.status_code, 201)

    # -------------------------------------------------------------
    # 3. Cooked Food Max 4 Hours Since Preparation
    # -------------------------------------------------------------
    def test_cooked_food_exceeding_4_hours_rejected(self):
        """Food prepared more than 4 hours ago is rejected for food safety."""
        payload = self._valid_payload(qty=20, hours_ago=5)
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.verified_token}"})
        self.assertEqual(res.status_code, 422)
        self.assertIn("prepared_at", res.get_json()["fields"])

    # -------------------------------------------------------------
    # 4. Required Handling Checklist
    # -------------------------------------------------------------
    def test_handling_checklist_all_boxes_must_be_checked(self):
        """If any handling checklist item is False or missing, listing is rejected with 422."""
        payload = self._valid_payload()
        payload["handling_checklist"]["not_reheated"] = False

        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.verified_token}"})
        self.assertEqual(res.status_code, 422)
        self.assertIn("handling_checklist", res.get_json()["fields"])

    # -------------------------------------------------------------
    # 5. Trust Level: First Listing PENDING_APPROVAL vs 3+ COMPLETED
    # -------------------------------------------------------------
    def test_individual_first_listing_pending_approval(self):
        """Individual with < 3 completed donations gets PENDING_APPROVAL status."""
        payload = self._valid_payload(qty=15, hours_ago=1)
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.verified_token}"})
        self.assertEqual(res.status_code, 201)
        listing = res.get_json()["listing"]
        self.assertEqual(listing["status"], "PENDING_APPROVAL")

    def test_individual_auto_approved_after_3_completed_donations(self):
        """After 3 completed donations, individual listings are auto-approved (AVAILABLE)."""
        with self.app.app_context():
            user = User.query.filter_by(email="indiv_verified@demo.local").first()
            now = datetime.utcnow()
            for i in range(3):
                l = Listing(
                    donor_id=user.id,
                    title=f"Past Donation #{i}",
                    quantity_total=10,
                    quantity_left=0,
                    prepared_at=now - timedelta(days=i+1),
                    use_by=now - timedelta(days=i),
                    pickup_location="Home",
                    pickup_start=now - timedelta(days=i+1),
                    pickup_end=now - timedelta(days=i),
                    status="COMPLETED",
                )
                db.session.add(l)
            db.session.commit()

        payload = self._valid_payload(qty=15, hours_ago=1)
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.verified_token}"})
        self.assertEqual(res.status_code, 201)
        listing = res.get_json()["listing"]
        self.assertEqual(listing["status"], "AVAILABLE")

    # -------------------------------------------------------------
    # 6. Admin Approve / Reject Moderation Actions
    # -------------------------------------------------------------
    def test_admin_approve_and_reject_actions(self):
        """Admin can approve or reject a listing with PENDING_APPROVAL status."""
        payload = self._valid_payload(qty=15, hours_ago=1)
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.verified_token}"})
        listing_id = res.get_json()["listing"]["id"]

        # Admin approves
        res_approve = self.client.post(f"/api/admin/listings/{listing_id}/approve", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_approve.status_code, 200)
        self.assertEqual(res_approve.get_json()["listing"]["status"], "AVAILABLE")

        # Create another listing to test reject
        res2 = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.verified_token}"})
        listing2_id = res2.get_json()["listing"]["id"]

        res_reject = self.client.post(
            f"/api/admin/listings/{listing2_id}/reject",
            json={"reason": "Improper container packaging"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res_reject.status_code, 200)
        self.assertEqual(res_reject.get_json()["listing"]["status"], "REMOVED")


if __name__ == "__main__":
    unittest.main()
