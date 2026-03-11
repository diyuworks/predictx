from django.contrib import admin
from .models import CarSalesData

@admin.register(CarSalesData)
class CarSalesDataAdmin(admin.ModelAdmin):
    list_display = ("date", "brand", "model", "year", "sales", "price")
    list_filter = ("brand", "year")
    search_fields = ("brand", "model")

