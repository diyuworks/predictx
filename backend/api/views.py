from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import CarSalesData
from .serializers import CarSalesDataSerializer
import pandas as pd


@api_view(['GET'])
def test_api(request):
    return Response({"message": "Backend is working ✅"})


@api_view(['POST', 'GET'])
def upload_car_csv(request):
    if request.method == 'GET':
        return Response({"message": "Upload endpoint is working ✅. Use POST with form-data."})

    file = request.FILES.get('file')

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    df = pd.read_csv(file)

    for _, row in df.iterrows():
        CarSalesData.objects.create(
            date=row['date'],
            sales=row['sales'],
            brand=row['brand'],
            model=row['model'],
            year=row['year'],
            price=row['price']
        )

    return Response({"message": "Car sales data uploaded successfully ✅"})


@api_view(['GET'])
def list_car_data(request):
    qs = CarSalesData.objects.all().order_by('-date')
    serializer = CarSalesDataSerializer(qs, many=True)
    return Response(serializer.data)

