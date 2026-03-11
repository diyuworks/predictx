from rest_framework import serializers
from .models import CarSalesData

class CarSalesDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarSalesData
        fields = '__all__'
