"""
Phase 4 tests: Recurring listings for institutions.
Tests:
- Only institutions/restaurants can create recurring donation series; individuals are blocked with 403.
- Creating recurring series with valid fields (day of week, usual time, expected servings, location).
- Donor can view their recurring series.
- Recipients can view the "Upcoming" recurring commitments.
- Donor can edit expected servings, pause, or cancel the recurring series.
- System generates normal listing from recurring series (on-demand and scheduled generator).
"""
import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing, RecurringDonation
from app.services.recurring_service import generate_listing_from_recurring, run_recurring_listings_generator


class RecurringDonationsTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # Institution donor
            inst_donor = User(email="church_rec@demo.local", role="donor")
            inst_donor.set_password("pass1234")
            db.session.add(inst_donor)
            db.session.flush()
            p_inst = Profile(
                user_id=inst_donor.id,
                organization_name="Grace Community Church",
                contact_name="Pastor David",
                donor_type="INSTITUTION",
                phone="+1-555-0444",
                phone_verified=True,
                address="100 Grace Way, City Center",
            )
            db.session.add(p_inst)

            # Individual donor
            indiv_donor = User(email="indiv_rec@demo.local", role="donor")
            indiv_donor.set_password("pass1234")
            db.session.add(indiv_donor)
            db.session.flush()
            p_indiv = Profile(
                user_id=indiv_donor.id,
                organization_name="Kavita Rao",
                contact_name="Kavita Rao",
                donor_type="INDIVIDUAL",
                phone="+1-555-0555",
                phone_verified=True,
                address="45 Rose Villa",
            )
            db.session.add(p_indiv)

            # Recipient
            rec = User(email="soupkitchen_rec@demo.local", role="recipient")
            rec.set_password("pass1234")
            db.session.add(rec)
            db.session.flush()
            p_rec = Profile(
                user_id=rec.id,
                organization_name="St. Jude Meal Program",
                contact_name="Sister Claire",
            )
            db.session.add(p_rec)

            db.session.commit()

            self.inst_id = inst_donor.id
            self.indiv_id = indiv_donor.id

            self.inst_token = self.client.post("/api/auth/login", json={"email": "church_rec@demo.local", "password": "pass1234"}).get_json()["token"]
            self.indiv_token = self.client.post("/api/auth/login", json={"email": "indiv_rec@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec_token = self.client.post("/api/auth/login", json={"email": "soupkitchen_rec@demo.local", "password": "pass1234"}).get_json()["token"]

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_individual_cannot_create_recurring_series(self):
        """Individuals attempting to create recurring series are blocked with 403."""
        payload = {
            "title": "Weekly Leftovers",
            "day_of_week": 6,  # Sunday
            "usual_time": "15:00",
            "expected_servings": 25,
            "pickup_location": "45 Rose Villa",
        }
        res = self.client.post("/api/recurring/", json=payload, headers={"Authorization": f"Bearer {self.indiv_token}"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("reserved for institutions", res.get_json()["error"])

    def test_institution_create_recurring_series(self):
        """Institution creates recurring weekly donation successfully."""
        payload = {
            "title": "Sunday Community Meal Surplus",
            "description": "Weekly prepared rice, curries, and fresh fruit after Sunday service",
            "day_of_week": 6,  # Sunday
            "usual_time": "14:30",
            "expected_servings": 50,
            "unit": "servings",
            "pickup_location": "100 Grace Way, City Center",
            "pickup_window_hours": 3,
        }
        res = self.client.post("/api/recurring/", json=payload, headers={"Authorization": f"Bearer {self.inst_token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()["recurring"]
        self.assertEqual(data["title"], "Sunday Community Meal Surplus")
        self.assertEqual(data["day_of_week"], 6)
        self.assertEqual(data["day_name"], "Sunday")
        self.assertEqual(data["expected_servings"], 50)
        self.assertEqual(data["status"], "ACTIVE")

    def test_recipients_see_upcoming_recurring_section(self):
        """Recipients can fetch active upcoming recurring donations."""
        with self.app.app_context():
            r = RecurringDonation(
                donor_id=self.inst_id,
                title="Weekly Hostel Canteen Batch",
                day_of_week=4,  # Friday
                usual_time="19:00",
                expected_servings=40,
                pickup_location="Hostel Gate 2",
                status="ACTIVE",
            )
            db.session.add(r)
            db.session.commit()

        res = self.client.get("/api/recurring/upcoming", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(res.status_code, 200)
        upcoming = res.get_json()["upcoming"]
        self.assertEqual(len(upcoming), 1)
        self.assertEqual(upcoming[0]["title"], "Weekly Hostel Canteen Batch")
        self.assertEqual(upcoming[0]["day_name"], "Friday")

    def test_donor_edit_pause_and_cancel_series(self):
        """Donor can edit expected servings, pause, and cancel the recurring series."""
        with self.app.app_context():
            r = RecurringDonation(
                donor_id=self.inst_id,
                title="Weekly Soup Kitchen Surplus",
                day_of_week=2,  # Wednesday
                usual_time="13:00",
                expected_servings=30,
                pickup_location="100 Grace Way",
                status="ACTIVE",
            )
            db.session.add(r)
            db.session.commit()
            r_id = r.id

        # 1. Edit servings
        res = self.client.put(f"/api/recurring/{r_id}", json={"expected_servings": 45}, headers={"Authorization": f"Bearer {self.inst_token}"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["recurring"]["expected_servings"], 45)

        # 2. Pause
        res = self.client.put(f"/api/recurring/{r_id}", json={"status": "PAUSED"}, headers={"Authorization": f"Bearer {self.inst_token}"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["recurring"]["status"], "PAUSED")

        # 3. Cancel
        res = self.client.put(f"/api/recurring/{r_id}", json={"status": "CANCELLED"}, headers={"Authorization": f"Bearer {self.inst_token}"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["recurring"]["status"], "CANCELLED")

    def test_on_demand_and_scheduled_listing_generation(self):
        """Generating a concrete listing from an active series creates an AVAILABLE listing with audit trail."""
        with self.app.app_context():
            now = datetime.utcnow()
            r = RecurringDonation(
                donor_id=self.inst_id,
                title="Weekly Bread & Pastry Batch",
                description="Surplus loaves and buns",
                day_of_week=now.weekday(),  # Match today for generator test
                usual_time="16:00",
                expected_servings=35,
                pickup_location="100 Grace Way",
                pickup_window_hours=2,
                status="ACTIVE",
            )
            db.session.add(r)
            db.session.commit()
            r_id = r.id

        # On-demand generation via API
        res = self.client.post(f"/api/recurring/{r_id}/generate", headers={"Authorization": f"Bearer {self.inst_token}"})
        self.assertEqual(res.status_code, 201)
        listing_data = res.get_json()["listing"]
        self.assertEqual(listing_data["title"], "Weekly Bread & Pastry Batch")
        self.assertEqual(listing_data["quantity_total"], 35)
        self.assertEqual(listing_data["quantity_left"], 35)
        self.assertEqual(listing_data["status"], "AVAILABLE")

        # Scheduled generator runs without duplicate generation on the same day
        with self.app.app_context():
            generated = run_recurring_listings_generator()
            self.assertEqual(len(generated), 0)  # already generated today!


if __name__ == "__main__":
    unittest.main()
