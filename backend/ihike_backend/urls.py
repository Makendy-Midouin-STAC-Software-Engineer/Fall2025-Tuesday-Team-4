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
from django.conf import settings
from hiking.views import deprecated_gone


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", health, name="root-health"),
    path("health/", health, name="health"),
    path("admin/", admin.site.urls),
]

if not getattr(settings, "TRAILS_API_DEPRECATED", False):
    # Import viewsets only when not deprecated to avoid hard dependency
    from hiking.views import RouteViewSet, WaysViewSet  # type: ignore

    router = DefaultRouter()
    router.register(r"route", RouteViewSet, basename="route")
    router.register(r"ways", WaysViewSet, basename="ways")
    # Backward-compatible routes (deprecated): keep old endpoints working
    router.register(r"trails", RouteViewSet, basename="trails_legacy")
    router.register(r"paths", WaysViewSet, basename="paths_legacy")
    urlpatterns += [path("api/", include(router.urls))]
else:
    urlpatterns += [
        path("api/route/", deprecated_gone),
        path("api/route/<path:any>", deprecated_gone),
        path("api/ways/", deprecated_gone),
        path("api/ways/<path:any>", deprecated_gone),
        path("api/trails/", deprecated_gone),
        path("api/trails/<path:any>", deprecated_gone),
        path("api/paths/", deprecated_gone),
        path("api/paths/<path:any>", deprecated_gone),
    ]
