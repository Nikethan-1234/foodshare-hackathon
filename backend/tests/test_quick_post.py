"""
Phase 3 tests: Event leftover quick-post feature.
Tests:
- Quick-post creation with valid payload (title, servings, cooked time, address, pickup window).
- Same validation rules: individual min quantity (>=10), max cooked time (<=4 hours).
- Required handling checklist enforcement on quick-posts.
- Trust level check: individual (< 3 completed donations) gets PENDING_APPROVAL; organization or trusted individual gets AVAILABLE.
- Quick-post auto-expiry at the end of the pickup window.
"""
import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing
from app.services.expiry_service import check_and_expire_listings


class EventLeftoverQuickPostTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # Organization donor (restaurant)
            org_donor = User(email="org_donor@demo.local", role="donor")
            org_donor.set_password("pass1234")
            db.session.add(org_donor)
            db.session.flush()
            p_org = Profile(
                user_id=org_donor.id,
                organization_name="Royal Palace Hall",
                contact_name="Sanjay Manager",
                donor_type="INSTITUTION",
                phone="+1-555-0999",
                phone_verified=True,
                address="Hall 4, Ring Road, Hyderabad",
            )
            db.session.add(p_org)

            # Verified individual donor with 0 completed donations (new individual)
            indiv_new = User(email="indiv_new@demo.local", role="donor")
            indiv_new.set_password("pass1234")
            db.session.add(indiv_new)
            db.session.flush()
            p_indiv = Profile(
                user_id=indiv_new.id,
                organization_name="Priya Sharma",
                contact_name="Priya Sharma",
                donor_type="INDIVIDUAL",
                phone="+1-555-0888",
                phone_verified=True,
                address="Flat 402, Sunshine Apartments",
            )
            db.session.add(p_indiv)

            # Trusted individual donor with 3 completed donations
            indiv_trusted = User(email="indiv_trusted@demo.local", role="donor")
            indiv_trusted.set_password("pass1234")
            db.session.add(indiv_trusted)
            db.session.flush()
            p_trusted = Profile(
                user_id=indiv_trusted.id,
                organization_name="Anand Kumar",
                contact_name="Anand Kumar",
                donor_type="INDIVIDUAL",
                phone="+1-555-0777",
                phone_verified=True,
                address="12 Garden Street",
            )
            db.session.add(p_trusted)

            # Seed 3 completed donations for trusted individual
            past = datetime.utcnow() - timedelta(days=2)
            for i in range(3):
                l = Listing(
                    donor_id=indiv_trusted.id,
                    title=f"Past Donation {i+1}",
                    quantity_total=15,
                    quantity_left=0,
                    prepared_at=past,
                    use_by=past + timedelta(hours=6),
                    pickup_location="12 Garden Street",
                    pickup_start=past + timedelta(hours=1),
                    pickup_end=past + timedelta(hours=3),
                    status="COMPLETED",
                )
                db.session.add(l)

            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _login(self, email, password="pass1234"):
        res = self.client.post("/api/auth/login", json={"email": email, "password": password})
        self.assertEqual(res.status_code, 200)
        return res.get_json()["token"]

    def test_quick_post_creation_institution(self):
        """Institution creates event leftover quick-post; goes immediately AVAILABLE with is_event_leftover=True."""
        token = self._login("org_donor@demo.local")
        now = datetime.utcnow()
        payload = {
            "title": "Reception Biryani & Curry Surplus",
            "quantity_total": 45,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=5)).isoformat(),
            "pickup_start": (now + timedelta(minutes=15)).isoformat(),
            "pickup_end": (now + timedelta(hours=3)).isoformat(),
            "pickup_location": "Hall 4, Ring Road, Hyderabad",
            "is_event_leftover": True,
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()["listing"]
        self.assertEqual(data["title"], "Reception Biryani & Curry Surplus")
        self.assertEqual(data["quantity_total"], 45)
        self.assertEqual(data["status"], "AVAILABLE")
        self.assertTrue(data["is_event_leftover"])

    def test_quick_post_individual_pending_approval(self):
        """Individual (< 3 donations) posting quick-post with >=10 servings goes to PENDING_APPROVAL."""
        token = self._login("indiv_new@demo.local")
        now = datetime.utcnow()
        payload = {
            "title": "Family Function Leftovers (Veg Pulao)",
            "quantity_total": 12,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=4)).isoformat(),
            "pickup_start": (now + timedelta(minutes=20)).isoformat(),
            "pickup_end": (now + timedelta(hours=2)).isoformat(),
            "pickup_location": "Flat 402, Sunshine Apartments",
            "is_event_leftover": True,
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()["listing"]
        self.assertEqual(data["status"], "PENDING_APPROVAL")
        self.assertTrue(data["is_event_leftover"])

    def test_quick_post_individual_trusted_auto_approved(self):
        """Trusted individual (3+ completed donations) quick-post goes directly to AVAILABLE."""
        token = self._login("indiv_trusted@demo.local")
        now = datetime.utcnow()
        payload = {
            "title": "Community Gathering Sambar Rice",
            "quantity_total": 20,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=4)).isoformat(),
            "pickup_start": (now + timedelta(minutes=15)).isoformat(),
            "pickup_end": (now + timedelta(hours=2)).isoformat(),
            "pickup_location": "12 Garden Street",
            "is_event_leftover": True,
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()["listing"]
        self.assertEqual(data["status"], "AVAILABLE")
        self.assertTrue(data["is_event_leftover"])

    def test_quick_post_individual_min_quantity_enforced(self):
        """Individual quick-post with < 10 servings is rejected with 422."""
        token = self._login("indiv_new@demo.local")
        now = datetime.utcnow()
        payload = {
            "title": "Small home function leftovers",
            "quantity_total": 5,  # < 10 minimum
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=4)).isoformat(),
            "pickup_start": (now + timedelta(minutes=15)).isoformat(),
            "pickup_end": (now + timedelta(hours=2)).isoformat(),
            "pickup_location": "Flat 402, Sunshine Apartments",
            "is_event_leftover": True,
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 422)
        self.assertIn("at least 10 servings", res.get_json()["fields"]["quantity_total"])

    def test_quick_post_cooked_food_exceeding_4_hours_rejected(self):
        """Quick-post with prepared_at > 4 hours ago is rejected with 422."""
        token = self._login("org_donor@demo.local")
        now = datetime.utcnow()
        payload = {
            "title": "Leftover Lunch Buffet",
            "quantity_total": 30,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=5)).isoformat(),  # 5 hours ago > 4h
            "use_by": (now + timedelta(hours=2)).isoformat(),
            "pickup_start": (now + timedelta(minutes=15)).isoformat(),
            "pickup_end": (now + timedelta(hours=2)).isoformat(),
            "pickup_location": "Hall 4, Ring Road, Hyderabad",
            "is_event_leftover": True,
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 422)
        self.assertIn("prepared_at", res.get_json()["fields"])

    def test_quick_post_handling_checklist_required(self):
        """Quick-post without all 4 handling checklist items checked is rejected with 422."""
        token = self._login("org_donor@demo.local")
        now = datetime.utcnow()
        payload = {
            "title": "Event Curries",
            "quantity_total": 25,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=4)).isoformat(),
            "pickup_start": (now + timedelta(minutes=15)).isoformat(),
            "pickup_end": (now + timedelta(hours=2)).isoformat(),
            "pickup_location": "Hall 4, Ring Road, Hyderabad",
            "is_event_leftover": True,
            "handling_checklist": {
                "covered": True,
                "stored_properly": False,  # Unticked!
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 422)
        self.assertIn("handling_checklist", res.get_json()["fields"])

    def test_quick_post_auto_expires_at_pickup_end(self):
        """Quick-post listings past pickup_end automatically transition to EXPIRED."""
        token = self._login("org_donor@demo.local")
        now = datetime.utcnow()
        payload = {
            "title": "Quick Event Dessert Boxes",
            "quantity_total": 20,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=2)).isoformat(),
            "use_by": (now + timedelta(hours=4)).isoformat(),
            "pickup_start": (now - timedelta(hours=1)).isoformat(),
            "pickup_end": (now - timedelta(minutes=5)).isoformat(),  # Already ended!
            "pickup_location": "Hall 4, Ring Road, Hyderabad",
            "is_event_leftover": True,
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 201)
        listing_id = res.get_json()["listing"]["id"]

        with self.app.app_context():
            result = check_and_expire_listings()
            self.assertGreaterEqual(result["expired_listings"], 1)

            l = Listing.query.get(listing_id)
            self.assertEqual(l.status, "EXPIRED")


if __name__ == "__main__":
    unittest.main()
