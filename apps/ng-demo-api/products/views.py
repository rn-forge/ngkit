from django.db.models import QuerySet
from rest_framework.filters import BaseFilterBackend
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rn_forge.django.drf import CacheIdempotencyStore, OrderByFilter, etag_for, idempotent
from rn_forge.django.drf.transfer import (
    BatchCreateMixin,
    BatchDeleteMixin,
    ResourceExportMixin,
    ResourceImportMixin,
)
from rn_forge.django.drf.views import BaseModelViewSet

from products.models import Product
from products.resources import ProductResource
from products.seed import reset_products
from products.serializers import ProductSerializer


class ProductFilter(BaseFilterBackend):
    """Per-field query parameters: `name` contains (case-insensitive), `category` exact."""

    def filter_queryset(self, request: Request, queryset: QuerySet, view) -> QuerySet:
        params = request.query_params
        if name := params.get("name"):
            queryset = queryset.filter(name__icontains=name)
        if category := params.get("category"):
            queryset = queryset.filter(category=category)
        return queryset


class ProductViewSet(
    ResourceExportMixin,
    ResourceImportMixin,
    BatchCreateMixin,
    BatchDeleteMixin,
    BaseModelViewSet,
):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [ProductFilter, OrderByFilter]
    ordering_fields = ["id", "name", "category", "price"]
    export_resource_class = ProductResource
    import_resource_class = ProductResource
    export_filename = "products"

    def get_renderers(self):
        renderers = super().get_renderers()
        if getattr(self, "action", None) != "import_template":
            return renderers
        # A browser's default `Accept` (`application/json, ..., */*`) would otherwise pick
        # JSON and send the template as a quoted string.
        return [r for r in renderers if getattr(r, "format", None) in ("csv", "xlsx")]

    @idempotent(CacheIdempotencyStore(), scope="products")
    def create(self, request: Request, *args, **kwargs) -> Response:
        response = super().create(request, *args, **kwargs)
        # The library emits `ETag` on retrieve and PATCH only.
        response["ETag"] = etag_for(Product.objects.get(pk=response.data["id"]))
        return response


class ResetView(APIView):
    """Test-only: restores the seed data."""

    def post(self, request: Request) -> Response:
        reset_products()
        return Response(status=204)
