from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import CarSalesData


def csv_file(text, name="data.csv"):
    return SimpleUploadedFile(name, text.encode(), content_type="text/csv")


class ApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health(self):
        res = self.client.get("/api/test/")
        self.assertEqual(res.status_code, 200)

    def test_upload_minimal_schema_matches_frontend(self):
        """date,sales,brand is all the frontend CSV contains, so it must be accepted."""
        body = "date,sales,brand\n2024-01-01,142,Toyota\n2024-01-02,156,Honda\n"
        res = self.client.post("/api/upload-car-data/", {"file": csv_file(body)}, format="multipart")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["rows"], 2)
        self.assertEqual(CarSalesData.objects.count(), 2)

    def test_upload_with_optional_columns(self):
        body = "date,sales,brand,model,year,price\n2024-01-01,5,Tesla,Model 3,2023,39999.5\n"
        res = self.client.post("/api/upload-car-data/", {"file": csv_file(body)}, format="multipart")
        self.assertEqual(res.status_code, 201)
        row = CarSalesData.objects.get()
        self.assertEqual((row.model, row.year, row.price), ("Model 3", 2023, 39999.5))

    def test_upload_rejects_missing_columns(self):
        res = self.client.post(
            "/api/upload-car-data/", {"file": csv_file("date,units\n2024-01-01,3\n")}, format="multipart"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("brand", res.data["error"])

    def test_bad_row_rolls_back_whole_upload(self):
        body = "date,sales,brand\n2024-01-01,10,A\nnot-a-date,20,B\n"
        res = self.client.post("/api/upload-car-data/", {"file": csv_file(body)}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(CarSalesData.objects.count(), 0)

    def test_upload_without_file(self):
        res = self.client.post("/api/upload-car-data/", {}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_list_returns_newest_first(self):
        CarSalesData.objects.create(date="2024-01-01", sales=1, brand="A")
        CarSalesData.objects.create(date="2024-01-05", sales=2, brand="B")
        res = self.client.get("/api/car-data/")
        self.assertEqual([r["brand"] for r in res.data], ["B", "A"])
