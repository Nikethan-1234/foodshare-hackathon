import unittest
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile


class AuthAndRBACTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            donor = User(email="donor_rbac@demo.local", role="donor")
            donor.set_password("pass1234")
            db.session.add(donor)

            rec = User(email="rec_rbac@demo.local", role="recipient")
            rec.set_password("pass1234")
            db.session.add(rec)

            admin = User(email="admin_rbac@demo.local", role="admin")
            admin.set_password("pass1234")
            db.session.add(admin)

            db.session.commit()

            self.donor_token = self.client.post("/api/auth/login", json={"email": "donor_rbac@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec_token = self.client.post("/api/auth/login", json={"email": "rec_rbac@demo.local", "password": "pass1234"}).get_json()["token"]
            self.admin_token = self.client.post("/api/auth/login", json={"email": "admin_rbac@demo.local", "password": "pass1234"}).get_json()["token"]

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_unauthenticated_blocked(self):
        """Unauthenticated requests to protected endpoints return 401."""
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)
        res = self.client.get("/api/listings/mine")
        self.assertEqual(res.status_code, 401)

    def test_donor_cannot_access_admin_or_recipient_routes(self):
        """Donor role is restricted from admin routes and recipient request creation."""
        # Donor cannot access admin dashboard
        res = self.client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 403)

        # Donor cannot create recipient requests
        res = self.client.post("/api/requests/", json={"listing_id": 1, "quantity": 5}, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 403)

    def test_recipient_cannot_create_or_edit_listings(self):
        """Recipient role is restricted from donor routes."""
        res = self.client.post("/api/listings/", json={"title": "Test"}, headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(res.status_code, 403)

    def test_admin_has_moderation_access(self):
        """Admin can list all platform users and inspect admin metrics."""
        res = self.client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)

        res = self.client.get("/api/users/", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()["users"]), 3)

    def test_public_impact_metrics(self):
        """Public impact counter endpoint does not require authentication and returns platform metrics."""
        res = self.client.get("/api/impact")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("meals_redistributed", data)
        self.assertIn("portions_available", data)
        self.assertIn("total_donors", data)
        self.assertIn("total_recipients", data)
        self.assertEqual(data["total_donors"], 1)
        self.assertEqual(data["total_recipients"], 1)


if __name__ == "__main__":
    unittest.main()
