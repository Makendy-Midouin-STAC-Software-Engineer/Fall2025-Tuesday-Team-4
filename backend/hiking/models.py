from django.contrib.gis.db import models
from django.core.validators import MinValueValidator
from django.contrib.postgres.indexes import GistIndex


class Route(models.Model):
    osm_id = models.BigIntegerField(null=True, blank=True, unique=True, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    route = models.CharField(max_length=100, db_index=True)
    difficulty = models.CharField(max_length=50, db_index=True)
    sac_scale = models.CharField(max_length=100, null=True, blank=True)
    length = models.DecimalField(
        max_digits=9, decimal_places=3, validators=[MinValueValidator(0)], db_index=True
    )
    website = models.URLField(blank=True)
    geometry = models.MultiLineStringField(srid=4326)

    class Meta:
        ordering = ["name"]
        indexes = [
            GistIndex(fields=["geometry"], name="trail_geometry_gix"),
        ]

    def __str__(self) -> str:
        return self.name


class Ways(models.Model):
    osm_id = models.BigIntegerField(null=True, blank=True, unique=True, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    highway = models.CharField(max_length=100, db_index=True)
    difficulty = models.CharField(max_length=50, db_index=True)
    sac_scale = models.CharField(max_length=100, null=True, blank=True)
    length = models.DecimalField(
        max_digits=9, decimal_places=3, validators=[MinValueValidator(0)], db_index=True
    )
    website = models.URLField(blank=True)
    geometry = models.MultiLineStringField(srid=4326)

    class Meta:
        ordering = ["name"]
        indexes = [
            GistIndex(fields=["geometry"], name="path_geometry_gix"),
        ]

    def __str__(self) -> str:
        return self.name


# Create your models here.
