from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework_gis.fields import GeometryField
from .models import Route, Ways


class RouteSerializer(GeoFeatureModelSerializer):
    # Ensure geometry is rendered as a GeoJSON geometry object, not WKT
    geometry = GeometryField()
    class Meta:
        model = Route
        fields = (
            'id', 'osm_id', 'name', 'route', 'difficulty', 'sac_scale', 'length', 'website'
        )
        geo_field = 'geometry'


class WaysSerializer(GeoFeatureModelSerializer):
    # Ensure geometry is rendered as a GeoJSON geometry object, not WKT
    geometry = GeometryField()
    class Meta:
        model = Ways
        fields = (
            'id', 'osm_id', 'name', 'highway', 'difficulty', 'sac_scale', 'length', 'website'
        )
        geo_field = 'geometry'

