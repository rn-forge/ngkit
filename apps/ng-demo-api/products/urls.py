from django.urls import path
from rn_forge.django.drf.routers import CustomMethodRouter

from products.views import ProductViewSet, ResetView

router = CustomMethodRouter(trailing_slash=False)
router.register("products", ProductViewSet, basename="products")

reset_view = ResetView.as_view()
reset_view.csrf_exempt = False

urlpatterns = [path("_test/reset", reset_view), *router.urls]
