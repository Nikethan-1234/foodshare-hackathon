import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing


class AIFeaturesTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            donor = User(email="donor_ai@demo.local", role="donor")
            donor.set_password("pass1234")
            db.session.add(donor)
            db.session.flush()
            db.session.add(Profile(user_id=donor.id, organization_name="Green Kitchen", contact_name="Alex"))

            rec = User(email="rec_ai@demo.local", role="recipient")
            rec.set_password("pass1234")
            db.session.add(rec)
            db.session.flush()
            db.session.add(Profile(user_id=rec.id, organization_name="Community Hope Shelter", contact_name="Elena", description="Regional emergency shelter serving 50 hot meals nightly."))

            db.session.commit()

            self.donor_token = self.client.post("/api/auth/login", json={"email": "donor_ai@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec_token = self.client.post("/api/auth/login", json={"email": "rec_ai@demo.local", "password": "pass1234"}).get_json()["token"]

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_ai_scan_listing(self):
        """AI Food Scanner drafts food details, portions, allergens, and safe pickup times."""
        res = self.client.post("/api/ai/scan", json={"preset": "pastry"}, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["draft"]
        self.assertIn("Sourdough", data["title"])
        self.assertEqual(data["unit"], "loaves")
        self.assertIn("Gluten / Wheat", data["allergens"])
        self.assertIn("prepared_at", data["suggested_times"])
        self.assertIn("use_by", data["suggested_times"])

    def test_ai_screen_allergens(self):
        """AI NLP correctly identifies allergens and dietary classification from text."""
        res = self.client.post("/api/ai/screen-allergens", json={
            "text": "Creamy mushroom penne pasta with garlic parmesan and chopped walnuts. Suitable for vegetarians."
        }, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("Gluten / Wheat", data["allergens"])
        self.assertIn("Dairy / Milk", data["allergens"])
        self.assertIn("Tree Nuts", data["allergens"])
        self.assertIn("Vegetarian", data["dietary_tags"])

    def test_ai_charity_matchmaking(self):
        """AI Matchmaker evaluates registered charities and ranks them with scores."""
        now = datetime.utcnow()
        res_listing = self.client.post("/api/listings/", json={
            "title": "Fresh Pasta Trays — 40 portions",
            "quantity_total": 40,
            "unit": "portions",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=6)).isoformat(),
            "pickup_location": "Kitchen",
            "pickup_start": (now + timedelta(hours=1)).isoformat(),
            "pickup_end": (now + timedelta(hours=4)).isoformat(),
        }, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res_listing.status_code, 201)
        lid = res_listing.get_json()["listing"]["id"]

        res_match = self.client.get(f"/api/ai/matchmaking/{lid}", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res_match.status_code, 200)
        matches = res_match.get_json()["top_matches"]
        self.assertTrue(len(matches) > 0)
        self.assertIn("match_score", matches[0])
        self.assertTrue(matches[0]["match_score"] >= 60)
        self.assertTrue(len(matches[0]["match_reasons"]) > 0)

    def test_ai_esg_metrics(self):
        """ESG analytics calculates carbon offset and water conservation."""
        res = self.client.get("/api/ai/esg", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 200)
        esg = res.get_json()["esg_metrics"]
        self.assertIn("co2_emissions_prevented_kg", esg)
        self.assertIn("water_conserved_liters", esg)
        self.assertIn("car_miles_equivalent", esg)
        self.assertIn("esg_rating", esg)


if __name__ == "__main__":
    unittest.main()
