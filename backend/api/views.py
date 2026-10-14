import pandas as pd
from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import CarSalesData
from .serializers import CarSalesDataSerializer

REQUIRED_COLUMNS = {"date", "sales", "brand"}
MAX_ROWS = 50_000


@api_view(["GET"])
def test_api(request):
    return Response({"message": "Backend is operational."})


@api_view(["POST", "GET"])
def upload_car_csv(request):
    """Ingest a CSV with columns date, sales, brand (optional: model, year, price).

    The whole upload is validated first and written in one transaction,
    so a bad file never leaves the database half-populated.
    """
    if request.method == "GET":
        return Response({"message": "Upload endpoint is active. Use POST with form-data (field: file)."})

    file = request.FILES.get("file")
    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:
        df = pd.read_csv(file)
    except Exception:
        return Response({"error": "Could not parse file as CSV."}, status=400)

    df.columns = [str(c).strip().lower() for c in df.columns]
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        return Response(
            {"error": f"Missing required column(s): {', '.join(sorted(missing))}"}, status=400
        )
    if df.empty:
        return Response({"error": "CSV contains no data rows."}, status=400)
    if len(df) > MAX_ROWS:
        return Response({"error": f"CSV too large (max {MAX_ROWS} rows)."}, status=400)

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["sales"] = pd.to_numeric(df["sales"], errors="coerce")
    bad = df[df["date"].isna() | df["sales"].isna() | (df["sales"] < 0)]
    if not bad.empty:
        # +2 = 1-based numbering plus the header row
        rows = ", ".join(str(i + 2) for i in bad.index[:10])
        return Response({"error": f"Invalid date or sales value on CSV row(s): {rows}"}, status=400)

    def opt_int(v):
        return None if pd.isna(v) else int(v)

    def opt_float(v):
        return None if pd.isna(v) else float(v)

    records = [
        CarSalesData(
            date=r["date"].date(),
            sales=int(r["sales"]),
            brand=str(r["brand"]).strip(),
            model=str(r["model"]).strip() if "model" in df.columns and not pd.isna(r["model"]) else "",
            year=opt_int(r["year"]) if "year" in df.columns else None,
            price=opt_float(r["price"]) if "price" in df.columns else None,
        )
        for _, r in df.iterrows()
    ]
    with transaction.atomic():
        CarSalesData.objects.bulk_create(records)

    return Response({"message": "Car sales data uploaded successfully.", "rows": len(records)}, status=201)


@api_view(["GET"])
def list_car_data(request):
    qs = CarSalesData.objects.all().order_by("-date", "-id")
    return Response(CarSalesDataSerializer(qs, many=True).data)
