from rest_framework import serializers
from rn_forge.django.drf.serializers import BaseModelSerializer

from products.models import Product


class ProductSerializer(BaseModelSerializer):
    # A JSON number, not DRF's default string.
    price = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "price",
            "active",
            *BaseModelSerializer.BASE_MODEL_FIELDS,
        ]
