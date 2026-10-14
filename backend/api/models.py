from django.db import models


class CarSalesData(models.Model):
    """One sales record. Only date, sales and brand are required, matching the frontend CSV schema."""

    date = models.DateField()
    sales = models.IntegerField()
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50, blank=True, default="")
    year = models.IntegerField(null=True, blank=True)
    price = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.date} - {self.brand} {self.model} - {self.sales}".replace("  ", " ")
