"""
Phase 1 tests: donor_type field on profiles, registration validation,
and donor-type badge propagation through listing API.
"""
import unittest
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing, StatusHistory
from datetime import datetime, timedelta


def _make_listing_payload(donor_id):
    now = datetime.utcnow()
    return dict(
        donor_id=donor_id,
        title="Test Food",
        description="Test",
        quantity_total=20,
        quantity_left=20,
        unit="portions",
        prepared_at=now - timedelta(hours=1),
        use_by=now + timedelta(hours=6),
        pickup_location="123 Test St",
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=3),
        status="AVAILABLE",
        allergens="",
        dietary_tags="",
    )


class DonorTypeTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    # -----------------------------------------------------------------
    # Registration: donor_type required for donors
    # -----------------------------------------------------------------
    def test_donor_registration_requires_donor_type(self):
        """Registering as donor without donor_type returns 422."""
        res = self.client.post("/api/auth/register", json={
            "email": "nodtype@demo.local",
            "password": "pass1234",
            "role": "donor",
            "organization_name": "Org",
            "contact_name": "Person",
        })
        self.assertEqual(res.status_code, 422)
        self.assertIn("donor_type", res.get_json()["fields"])

    def test_donor_registration_invalid_donor_type(self):
        """Registering with an invalid donor_type returns 422."""
        res = self.client.post("/api/auth/register", json={
            "email": "baddtype@demo.local",
            "password": "pass1234",
            "role": "donor",
            "organization_name": "Org",
            "contact_name": "Person",
            "donor_type": "SUPERMARKET",
        })
        self.assertEqual(res.status_code, 422)
        self.assertIn("donor_type", res.get_json()["fields"])

    def test_restaurant_donor_registration(self):
        """RESTAURANT donor registers successfully with org + contact name."""
        res = self.client.post("/api/auth/register", json={
            "email": "rest@demo.local",
            "password": "pass1234",
            "role": "donor",
            "donor_type": "RESTAURANT",
            "organization_name": "Demo Restaurant",
            "contact_name": "Chef Ali",
        })
        self.assertEqual(res.status_code, 201)
        profile = res.get_json()["profile"]
        self.assertEqual(profile["donor_type"], "RESTAURANT")

    def test_institution_donor_registration(self):
        """INSTITUTION donor registers successfully."""
        res = self.client.post("/api/auth/register", json={
            "email": "church@demo.local",
            "password": "pass1234",
            "role": "donor",
            "donor_type": "INSTITUTION",
            "organization_name": "St. Mary's Church",
            "contact_name": "Father Joseph",
        })
        self.assertEqual(res.status_code, 201)
        profile = res.get_json()["profile"]
        self.assertEqual(profile["donor_type"], "INSTITUTION")

    def test_individual_donor_registration_requires_contact_name(self):
        """INDIVIDUAL donor must supply contact_name; organization_name auto-filled."""
        # No contact_name — should fail
        res = self.client.post("/api/auth/register", json={
            "email": "noname@demo.local",
            "password": "pass1234",
            "role": "donor",
            "donor_type": "INDIVIDUAL",
        })
        self.assertEqual(res.status_code, 422)
        self.assertIn("contact_name", res.get_json()["fields"])

    def test_individual_donor_registration_auto_org_name(self):
        """INDIVIDUAL donor: organization_name auto-set to contact_name if blank."""
        res = self.client.post("/api/auth/register", json={
            "email": "indiv@demo.local",
            "password": "pass1234",
            "role": "donor",
            "donor_type": "INDIVIDUAL",
            "contact_name": "Ravi Patel",
        })
        self.assertEqual(res.status_code, 201)
        profile = res.get_json()["profile"]
        self.assertEqual(profile["donor_type"], "INDIVIDUAL")
        self.assertEqual(profile["organization_name"], "Ravi Patel")
        self.assertEqual(profile["contact_name"], "Ravi Patel")

    def test_recipient_registration_no_donor_type(self):
        """Recipients do not need donor_type; it should be null in profile."""
        res = self.client.post("/api/auth/register", json={
            "email": "rec@demo.local",
            "password": "pass1234",
            "role": "recipient",
            "organization_name": "Hope Kitchen",
            "contact_name": "Sandra",
        })
        self.assertEqual(res.status_code, 201)
        profile = res.get_json()["profile"]
        self.assertIsNone(profile["donor_type"])

    # -----------------------------------------------------------------
    # donor_type surfaced in listing API
    # -----------------------------------------------------------------
    def test_listing_includes_donor_type(self):
        """Listing API returns donor_type from donor's profile."""
        with self.app.app_context():
            donor = User(email="inst_list@demo.local", role="donor")
            donor.set_password("pass1234")
            db.session.add(donor)
            db.session.flush()
            p = Profile(
                user_id=donor.id,
                organization_name="Local Temple",
                contact_name="Pandit Ji",
                donor_type="INSTITUTION",
            )
            db.session.add(p)
            payload = _make_listing_payload(donor.id)
            listing = Listing(**payload)
            db.session.add(listing)
            db.session.flush()
            db.session.add(StatusHistory(
                entity_type="listing", entity_id=listing.id,
                from_status=None, to_status="AVAILABLE",
                actor_id=donor.id, note="test",
            ))
            db.session.commit()
            listing_id = listing.id

        token = self.client.post("/api/auth/login", json={
            "email": "inst_list@demo.local", "password": "pass1234"
        }).get_json()["token"]

        res = self.client.get(
            f"/api/listings/{listing_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["listing"]
        self.assertEqual(data["donor_type"], "INSTITUTION")


if __name__ == "__main__":
    unittest.main()
