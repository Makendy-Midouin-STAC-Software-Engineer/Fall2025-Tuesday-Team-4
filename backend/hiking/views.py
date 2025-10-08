from rest_framework import viewsets, permissions
from rest_framework_gis.filters import InBBoxFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import Trail, Path
from .serializers import TrailSerializer, PathSerializer


class TrailViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Trail.objects.all().order_by('name')
    serializer_class = TrailSerializer
    filter_backends = [DjangoFilterBackend, InBBoxFilter, OrderingFilter]
    filterset_fields = {
        'difficulty': ['exact', 'in'],
        'route': ['exact', 'in'],
        'length': ['gte', 'lte'],
    }
    bbox_filter_field = 'geometry'
    ordering_fields = ['name', 'length']


class PathViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Path.objects.all().order_by('name')
    serializer_class = PathSerializer
    filter_backends = [DjangoFilterBackend, InBBoxFilter, OrderingFilter]
    filterset_fields = {
        'difficulty': ['exact', 'in'],
        'highway': ['exact', 'in'],
        'length': ['gte', 'lte'],
    }
    bbox_filter_field = 'geometry'
    ordering_fields = ['name', 'length']
