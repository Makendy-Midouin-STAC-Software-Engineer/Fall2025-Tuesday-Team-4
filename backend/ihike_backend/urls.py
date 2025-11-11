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

from django.urls import path
from django.http import JsonResponse
from hiking.views import deprecated_gone
from django.apps import apps
from django.contrib import admin


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", health, name="root-health"),
    path("health/", health, name="health"),
]

if apps.is_installed("django.contrib.admin"):
    urlpatterns.append(path("admin/", admin.site.urls))

for endpoint in ("route", "ways", "trails", "paths"):
    urlpatterns += [
        path(f"api/{endpoint}/", deprecated_gone, name=f"deprecated-{endpoint}"),
        path(
            f"api/{endpoint}/<path:any>",
            deprecated_gone,
            name=f"deprecated-{endpoint}-detail",
        ),
    ]
