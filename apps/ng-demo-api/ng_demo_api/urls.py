from django.urls import include, path

urlpatterns = [path("api/", include("products.urls"))]

handler404 = "rn_forge.django.exceptions.problem_details_handler404"
handler500 = "rn_forge.django.exceptions.problem_details_handler500"
