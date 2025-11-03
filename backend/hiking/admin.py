from django.contrib import admin

try:
	from django.contrib.gis.admin import OSMGeoAdmin as BaseGeoAdmin
except Exception:
	# Fallback for environments without GeoDjango admin; keeps admin importable
	from django.contrib import admin as _admin

	class BaseGeoAdmin(_admin.ModelAdmin):
		pass


# Trails models removed; admin registrations pruned
