from rest_framework import viewsets, permissions
from rest_framework_gis.filters import InBBoxFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import Route, Ways
from .serializers import RouteSerializer, WaysSerializer


class RouteViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Route.objects.all().order_by('name')
    serializer_class = RouteSerializer
    filter_backends = [DjangoFilterBackend, InBBoxFilter, OrderingFilter]
    filterset_fields = {
        'osm_id': ['exact', 'in'],
        'difficulty': ['exact', 'in'],
        'route': ['exact', 'in'],
        'length': ['gte', 'lte'],
    }
    bbox_filter_field = 'geometry'
    ordering_fields = ['name', 'length']


class WaysViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Ways.objects.all().order_by('name')
    serializer_class = WaysSerializer
    filter_backends = [DjangoFilterBackend, InBBoxFilter, OrderingFilter]
    filterset_fields = {
        'osm_id': ['exact', 'in'],
        'difficulty': ['exact', 'in'],
        'highway': ['exact', 'in'],
        'length': ['gte', 'lte'],
    }
    bbox_filter_field = 'geometry'
    ordering_fields = ['name', 'length']
