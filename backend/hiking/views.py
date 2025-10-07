from rest_framework import viewsets
from .models import Trail, Path
from .serializers import TrailSerializer, PathSerializer


class TrailViewSet(viewsets.ModelViewSet):
    queryset = Trail.objects.all().order_by('name')
    serializer_class = TrailSerializer


class PathViewSet(viewsets.ModelViewSet):
    queryset = Path.objects.all().order_by('name')
    serializer_class = PathSerializer
