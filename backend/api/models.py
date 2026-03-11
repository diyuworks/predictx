from django.db import models

class CarSalesData(models.Model):
    date = models.DateField()
    sales = models.IntegerField()
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    price = models.FloatField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} - {self.brand} {self.model} - {self.sales}"
