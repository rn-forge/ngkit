from django.db import models
from rn_forge.django.models import BaseModel, VersionedModelMixin


class Product(VersionedModelMixin, BaseModel):
    """`version` backs the `ETag`; `BaseModel` adds the audit fields."""

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    active = models.BooleanField(default=True)

    def natural_keys(self) -> list[str]:
        return ["name"]
