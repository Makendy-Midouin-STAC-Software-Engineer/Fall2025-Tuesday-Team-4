from django.contrib import admin
try:
    from django.contrib.gis.admin import OSMGeoAdmin as BaseGeoAdmin
except Exception:
    # Fallback for environments without GeoDjango admin; keeps admin importable
    from django.contrib import admin as _admin

    class BaseGeoAdmin(_admin.ModelAdmin):
        pass
from .models import Trail, Path


@admin.register(Trail)
class TrailAdmin(BaseGeoAdmin):
    list_display = ("name", "route", "length", "difficulty")
    search_fields = ("name", "route")
    list_filter = ("difficulty",)


@admin.register(Path)
class PathAdmin(BaseGeoAdmin):
    list_display = ("name", "highway", "length", "difficulty")
    search_fields = ("name", "highway")
    list_filter = ("highway",)

# Register your models here.
