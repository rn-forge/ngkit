from django.urls import path
from rn_forge.django.drf.routers import CustomMethodRouter

from products.views import ProductViewSet, ResetView

router = CustomMethodRouter(trailing_slash=False)
router.register("products", ProductViewSet, basename="products")

urlpatterns = [path("_test/reset", ResetView.as_view()), *router.urls]
