from django.urls import path
from .views import test_api, upload_car_csv, list_car_data

urlpatterns = [
    path('test/', test_api),
    path('upload-car-data/', upload_car_csv),
    path('car-data/', list_car_data),
]
