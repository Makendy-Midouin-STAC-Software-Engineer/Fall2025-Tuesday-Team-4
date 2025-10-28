"""
URL configuration for ihike_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from hiking.views import RouteViewSet, WaysViewSet


def health(_request):
    return JsonResponse({"status": "ok"})


router = DefaultRouter()
router.register(r"route", RouteViewSet, basename="route")
router.register(r"ways", WaysViewSet, basename="ways")
# Backward-compatible routes (deprecated): keep old endpoints working
router.register(r"trails", RouteViewSet, basename="trails_legacy")
router.register(r"paths", WaysViewSet, basename="paths_legacy")

urlpatterns = [
    path("", health, name="root-health"),
    path("health/", health, name="health"),
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
]
