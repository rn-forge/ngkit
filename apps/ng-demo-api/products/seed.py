"""The five products ng-demo's mock API serves (`SEED_PRODUCTS` in `mock-api.interceptor.ts`)."""

from decimal import Decimal

from django.core.cache import cache
from django.db import connection

from products.models import Product

SEED_PRODUCTS = [
    (1, "Widget A", "Widgets", "9.99", True),
    (2, "Widget B", "Widgets", "14.99", True),
    (3, "Gadget X", "Gadgets", "49.99", False),
    (4, "Gadget Y", "Gadgets", "79.99", True),
    (5, "Doohickey", "Other", "4.99", True),
]


def reset_products() -> None:
    """Restore the seed data, the id sequence and the stored idempotency keys."""
    Product.objects.all().delete()
    with connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM sqlite_sequence WHERE name = %s", [Product._meta.db_table]
        )
    Product.objects.bulk_create(
        Product(
            id=id_,
            name=name,
            category=category,
            price=Decimal(price),
            active=active,
            created_by="seed",
            updated_by="seed",
        )
        for id_, name, category, price, active in SEED_PRODUCTS
    )
    cache.clear()
