from django.urls import path
from django.http import JsonResponse


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", health, name="root-health"),
    path("health/", health, name="health"),
]
