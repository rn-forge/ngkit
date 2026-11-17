from django.urls import include, path
from rn_forge.django.auth import auth_urlpatterns

from ng_demo_api.accounts import config

urlpatterns = [
    *auth_urlpatterns(config, prefix="auth"),
    path("api/", include("products.urls")),
]

handler404 = "rn_forge.django.exceptions.problem_details_handler404"
handler500 = "rn_forge.django.exceptions.problem_details_handler500"
