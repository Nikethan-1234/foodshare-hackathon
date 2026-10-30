"""
Phase 5 tests: Listing details, photo upload validation, food category tags,
tag filters on browse endpoint, and donor phone reveal upon request acceptance.
"""
import unittest
import io
import base64
from datetime import datetime, timedelta
from app import create_app, db
from app.config import TestConfig
from app.models import User, Profile, Listing, Request


class ListingDetailsTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # Donor
            donor = User(email="donor_details@demo.local", role="donor")
            donor.set_password("pass1234")
            db.session.add(donor)
            db.session.flush()
            p_donor = Profile(
                user_id=donor.id,
                organization_name="Green Kitchen",
                contact_name="Chef Maria",
                donor_type="RESTAURANT",
                phone="+1-555-0911",
                phone_verified=True,
                address="10 Harvest Lane",
            )
            db.session.add(p_donor)

            # Recipient
            rec = User(email="rec_details@demo.local", role="recipient")
            rec.set_password("pass1234")
            db.session.add(rec)
            db.session.flush()
            p_rec = Profile(
                user_id=rec.id,
                organization_name="Community Center",
                contact_name="Alex",
            )
            db.session.add(p_rec)

            db.session.commit()

            self.donor_id = donor.id
            self.rec_id = rec.id

            self.donor_token = self.client.post("/api/auth/login", json={"email": "donor_details@demo.local", "password": "pass1234"}).get_json()["token"]
            self.rec_token = self.client.post("/api/auth/login", json={"email": "rec_details@demo.local", "password": "pass1234"}).get_json()["token"]

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_photo_upload_valid_multipart(self):
        """Donor can upload a valid JPEG/PNG photo within 5MB limit."""
        dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        data = {
            "photo": (io.BytesIO(dummy_png), "food_photo.png")
        }
        res = self.client.post(
            "/api/listings/upload-photo",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": f"Bearer {self.donor_token}"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("image_url", res.get_json())
        self.assertTrue(res.get_json()["image_url"].startswith("data:image/png;base64,"))

    def test_photo_upload_invalid_type_rejected(self):
        """Uploading an invalid file extension (e.g. .exe or .pdf) returns 422."""
        data = {
            "photo": (io.BytesIO(b"fake pdf content"), "document.pdf")
        }
        res = self.client.post(
            "/api/listings/upload-photo",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": f"Bearer {self.donor_token}"}
        )
        self.assertEqual(res.status_code, 422)
        self.assertIn("Invalid file type", res.get_json()["error"])

    def test_photo_upload_size_limit_exceeded(self):
        """Uploading a file exceeding 5MB returns 422."""
        large_bytes = b"0" * (6 * 1024 * 1024)  # 6 MB
        data = {
            "photo": (io.BytesIO(large_bytes), "huge_image.jpg")
        }
        res = self.client.post(
            "/api/listings/upload-photo",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": f"Bearer {self.donor_token}"}
        )
        self.assertEqual(res.status_code, 422)
        self.assertIn("exceeds 5MB", res.get_json()["error"])

    def test_listing_with_category_tags_and_allergen_notes(self):
        """Listing properly stores category_food_type, category_prep_state, and allergen_notes."""
        now = datetime.utcnow()
        payload = {
            "title": "Vegetable Pulao & Raita",
            "quantity_total": 20,
            "unit": "servings",
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "use_by": (now + timedelta(hours=5)).isoformat(),
            "pickup_start": (now + timedelta(minutes=30)).isoformat(),
            "pickup_end": (now + timedelta(hours=3)).isoformat(),
            "pickup_location": "10 Harvest Lane",
            "category_food_type": "VEG",
            "category_prep_state": "COOKED",
            "allergen_notes": "Contains dairy (curd/yogurt in raita)",
            "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "handling_checklist": {
                "covered": True,
                "stored_properly": True,
                "not_reheated": True,
                "packaged_cleanly": True,
            },
        }
        res = self.client.post("/api/listings/", json=payload, headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()["listing"]
        self.assertEqual(data["category_food_type"], "VEG")
        self.assertEqual(data["category_prep_state"], "COOKED")
        self.assertEqual(data["allergen_notes"], "Contains dairy (curd/yogurt in raita)")
        self.assertTrue(data["image_url"].startswith("data:image/png;base64,"))

    def test_browse_filters_by_food_type_and_prep_state(self):
        """Browse endpoint filters listings by food_type (VEG/NON_VEG) and prep_state (COOKED/PACKAGED)."""
        now = datetime.utcnow()
        with self.app.app_context():
            # 1. Veg Cooked
            l1 = Listing(
                donor_id=self.donor_id,
                title="Paneer Butter Masala",
                quantity_total=20,
                quantity_left=20,
                prepared_at=now - timedelta(hours=1),
                use_by=now + timedelta(hours=5),
                pickup_location="10 Harvest Lane",
                pickup_start=now + timedelta(minutes=30),
                pickup_end=now + timedelta(hours=3),
                category_food_type="VEG",
                category_prep_state="COOKED",
                status="AVAILABLE",
            )
            # 2. Non-Veg Cooked
            l2 = Listing(
                donor_id=self.donor_id,
                title="Chicken Curry",
                quantity_total=25,
                quantity_left=25,
                prepared_at=now - timedelta(hours=1),
                use_by=now + timedelta(hours=5),
                pickup_location="10 Harvest Lane",
                pickup_start=now + timedelta(minutes=30),
                pickup_end=now + timedelta(hours=3),
                category_food_type="NON_VEG",
                category_prep_state="COOKED",
                status="AVAILABLE",
            )
            # 3. Veg Packaged
            l3 = Listing(
                donor_id=self.donor_id,
                title="Boxed Cereal & Oat Milk",
                quantity_total=30,
                quantity_left=30,
                prepared_at=now - timedelta(hours=1),
                use_by=now + timedelta(hours=24),
                pickup_location="10 Harvest Lane",
                pickup_start=now + timedelta(minutes=30),
                pickup_end=now + timedelta(hours=12),
                category_food_type="VEG",
                category_prep_state="PACKAGED",
                status="AVAILABLE",
            )
            db.session.add_all([l1, l2, l3])
            db.session.commit()

        # Filter by food_type=VEG
        res_veg = self.client.get("/api/listings/available?food_type=VEG", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(res_veg.status_code, 200)
        items_veg = res_veg.get_json()["listings"]
        self.assertEqual(len(items_veg), 2)
        self.assertTrue(all(i["category_food_type"] == "VEG" for i in items_veg))

        # Filter by food_type=NON_VEG
        res_nonveg = self.client.get("/api/listings/available?food_type=NON_VEG", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(res_nonveg.status_code, 200)
        items_nonveg = res_nonveg.get_json()["listings"]
        self.assertEqual(len(items_nonveg), 1)
        self.assertEqual(items_nonveg[0]["title"], "Chicken Curry")

        # Filter by prep_state=PACKAGED
        res_pkg = self.client.get("/api/listings/available?prep_state=PACKAGED", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(res_pkg.status_code, 200)
        items_pkg = res_pkg.get_json()["listings"]
        self.assertEqual(len(items_pkg), 1)
        self.assertEqual(items_pkg[0]["title"], "Boxed Cereal & Oat Milk")

    def test_donor_phone_hidden_until_request_accepted(self):
        """Donor phone is hidden in PENDING status and revealed when request transitions to ACCEPTED."""
        now = datetime.utcnow()
        with self.app.app_context():
            l = Listing(
                donor_id=self.donor_id,
                title="Fresh Meals",
                quantity_total=15,
                quantity_left=15,
                prepared_at=now - timedelta(hours=1),
                use_by=now + timedelta(hours=5),
                pickup_location="10 Harvest Lane",
                pickup_start=now + timedelta(minutes=30),
                pickup_end=now + timedelta(hours=3),
                status="AVAILABLE",
            )
            db.session.add(l)
            db.session.commit()
            l_id = l.id

        # Recipient creates request -> status is PENDING
        req_res = self.client.post("/api/requests/", json={"listing_id": l_id, "quantity": 10}, headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.get_json()["request"]["id"]

        # Recipient checks request list: donor_phone must be None
        list_res = self.client.get("/api/requests/mine", headers={"Authorization": f"Bearer {self.rec_token}"})
        req_obj = [r for r in list_res.get_json()["requests"] if r["id"] == req_id][0]
        self.assertIsNone(req_obj["donor_phone"])
        self.assertFalse(req_obj["donor_phone_revealed"])

        # Donor accepts request
        accept_res = self.client.post(f"/api/requests/{req_id}/accept", headers={"Authorization": f"Bearer {self.donor_token}"})
        self.assertEqual(accept_res.status_code, 200)

        # Recipient checks request list again: donor_phone is now revealed
        list_res2 = self.client.get("/api/requests/mine", headers={"Authorization": f"Bearer {self.rec_token}"})
        req_obj2 = [r for r in list_res2.get_json()["requests"] if r["id"] == req_id][0]
        self.assertEqual(req_obj2["donor_phone"], "+1-555-0911")
        self.assertTrue(req_obj2["donor_phone_revealed"])


if __name__ == "__main__":
    unittest.main()
