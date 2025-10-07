from django.contrib.gis.db import models


class Trail(models.Model):
    osm_id = models.BigIntegerField()
    name = models.CharField(max_length=255)
    route = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=50)
    length = models.FloatField()
    website = models.URLField(blank=True)
    geometry = models.MultiLineStringField(srid=4326)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Path(models.Model):
    osm_id = models.BigIntegerField()
    name = models.CharField(max_length=255)
    highway = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=50)
    length = models.FloatField()
    website = models.URLField(blank=True)
    geometry = models.MultiLineStringField(srid=4326)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

# Create your models here.
