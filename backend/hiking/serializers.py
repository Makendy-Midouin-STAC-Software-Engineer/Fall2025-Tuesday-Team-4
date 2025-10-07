from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Trail, Path


class TrailSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Trail
        fields = (
            'id', 'osm_id', 'name', 'route', 'difficulty', 'length', 'website', 'geometry'
        )
        geo_field = 'geometry'


class PathSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Path
        fields = (
            'id', 'osm_id', 'name', 'highway', 'difficulty', 'length', 'website', 'geometry'
        )
        geo_field = 'geometry'

