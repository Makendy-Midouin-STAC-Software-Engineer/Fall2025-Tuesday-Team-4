import json
from typing import Any, Dict, Iterable, List, Optional, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import FloatField, Value
from django.db.models.expressions import ExpressionWrapper
from django.contrib.gis.db.models.functions import Length as GeomLength
from django.contrib.gis.geos import GEOSGeometry, MultiLineString, LineString

from hiking.models import Trail, Path


def coerce_multilinestring(geom: GEOSGeometry) -> MultiLineString:
    """Ensure geometry is a MultiLineString and has SRID 4326."""
    if geom.srid is None:
        geom.srid = 4326
    if isinstance(geom, MultiLineString):
        if geom.srid is None:
            geom.srid = 4326
        return geom
    if isinstance(geom, LineString):
        ml = MultiLineString(geom)
        ml.srid = geom.srid or 4326
        return ml
    # Some GeoJSON may come as GeometryCollection or others; try to coerce
    if geom.geom_type == 'GeometryCollection':
        lines: List[LineString] = [g for g in geom if isinstance(g, LineString)]
        if not lines:
            raise ValueError("GeometryCollection contains no LineString geometry")
        ml = MultiLineString(*lines)
        ml.srid = geom.srid or 4326
        return ml
    if geom.geom_type == 'Polygon':
        raise ValueError("Polygon geometry is not supported for trails/paths")
    raise ValueError(f"Unsupported geometry type: {geom.geom_type}")


def map_sac_scale_to_difficulty(value: Optional[str]) -> str:
    """Map OSM sac_scale to our difficulty field.

    sac_scale values: hiking, mountain_hiking, demanding_mountain_hiking,
    alpine_hiking, demanding_alpine_hiking, difficult_alpine_hiking
    """
    if not value:
        return "unknown"
    mapping = {
        "hiking": "easy",
        "mountain_hiking": "moderate",
        "demanding_mountain_hiking": "challenging",
        "alpine_hiking": "hard",
        "demanding_alpine_hiking": "very_hard",
        "difficult_alpine_hiking": "expert",
    }
    return mapping.get(str(value).strip(), "unknown")


def parse_geojson(path: str) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if data.get("type") == "FeatureCollection":
        for feature in data.get("features", []):
            yield feature
    elif data.get("type") == "Feature":
        yield data
    else:
        raise CommandError("Input file must be a FeatureCollection or Feature GeoJSON")


class Command(BaseCommand):
    help = (
        "Import GeoJSON into Trail and Path models. Usage:"
        " python manage.py import_geojson hiking_route.geojson hiking_ways.geojson"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "files",
            nargs="+",
            help="GeoJSON files. hiking_route.geojson -> Trail, hiking_ways.geojson -> Path",
        )

    def handle(self, *args, **options):
        files: List[str] = options["files"]
        if not files:
            raise CommandError("Provide at least one GeoJSON file")

        trails_count = 0
        paths_count = 0
        skipped = 0

        for file_path in files:
            lower = file_path.lower()
            if "route" in lower:
                created, skipped_file = self._import_trails(file_path)
                trails_count += created
                skipped += skipped_file
            elif "ways" in lower or "path" in lower:
                created, skipped_file = self._import_paths(file_path)
                paths_count += created
                skipped += skipped_file
            else:
                self.stdout.write(self.style.WARNING(
                    f"Skipping {file_path}: cannot infer model (expects 'route' or 'ways' in filename)"
                ))

        self.stdout.write(self.style.SUCCESS(
            f"Imported Trails: {trails_count}, Paths: {paths_count}, Skipped duplicates: {skipped}"
        ))

    @transaction.atomic
    def _import_trails(self, file_path: str) -> Tuple[int, int]:
        created_count = 0
        skipped_dupes = 0
        for feature in parse_geojson(file_path):
            props: Dict[str, Any] = feature.get("properties") or {}
            geometry_json = feature.get("geometry")
            if not geometry_json:
                continue
            try:
                geom = GEOSGeometry(json.dumps(geometry_json))
                ml = coerce_multilinestring(geom)
            except Exception as e:
                raise CommandError(f"Invalid geometry in {file_path}: {e}")

            osm_id_raw = props.get("osm_id")
            try:
                osm_id = int(osm_id_raw) if osm_id_raw is not None else None
            except ValueError:
                osm_id = None

            # Parse provided length if present; treat null/empty/zero as missing
            length_raw = props.get("length")
            length_value: Optional[float] = None
            try:
                if length_raw not in (None, "", "null"):
                    parsed = float(length_raw)
                    if parsed > 0:
                        length_value = parsed
            except (TypeError, ValueError):
                length_value = None

            if osm_id is not None:
                existing = Trail.objects.filter(osm_id=osm_id).first()
                if existing:
                    # If existing record has missing/zero length, backfill using DB geodesic length (km)
                    if (existing.length is None) or (existing.length <= 0):
                        length_km = ExpressionWrapper(
                            GeomLength("geometry", spheroid=True) / Value(1000.0),
                            output_field=FloatField(),
                        )
                        Trail.objects.filter(pk=existing.pk).update(length=length_km)
                    skipped_dupes += 1
                    continue

            trail = Trail(
                osm_id=osm_id or 0,
                name=(props.get("name") or "Unnamed Trail"),
                route=(props.get("route") or "hiking"),
                difficulty=map_sac_scale_to_difficulty(props.get("sac_scale")),
                length=float(length_value or 0.0),
                website=(props.get("website") or ""),
                geometry=ml,
            )
            trail.save()
            # If no valid length provided, compute geodesic length in km via PostGIS
            if length_value is None:
                length_km = ExpressionWrapper(
                    GeomLength("geometry", spheroid=True) / Value(1000.0),
                    output_field=FloatField(),
                )
                Trail.objects.filter(pk=trail.pk).update(length=length_km)
            created_count += 1
        return created_count, skipped_dupes

    @transaction.atomic
    def _import_paths(self, file_path: str) -> Tuple[int, int]:
        created_count = 0
        skipped_dupes = 0
        for feature in parse_geojson(file_path):
            props: Dict[str, Any] = feature.get("properties") or {}
            geometry_json = feature.get("geometry")
            if not geometry_json:
                continue
            try:
                geom = GEOSGeometry(json.dumps(geometry_json))
                ml = coerce_multilinestring(geom)
            except Exception as e:
                raise CommandError(f"Invalid geometry in {file_path}: {e}")

            osm_id_raw = props.get("osm_id")
            try:
                osm_id = int(osm_id_raw) if osm_id_raw is not None else None
            except ValueError:
                osm_id = None

            # Parse provided length if present; treat null/empty/zero as missing
            length_raw = props.get("length")
            length_value: Optional[float] = None
            try:
                if length_raw not in (None, "", "null"):
                    parsed = float(length_raw)
                    if parsed > 0:
                        length_value = parsed
            except (TypeError, ValueError):
                length_value = None

            if osm_id is not None:
                existing = Path.objects.filter(osm_id=osm_id).first()
                if existing:
                    if (existing.length is None) or (existing.length <= 0):
                        length_km = ExpressionWrapper(
                            GeomLength("geometry", spheroid=True) / Value(1000.0),
                            output_field=FloatField(),
                        )
                        Path.objects.filter(pk=existing.pk).update(length=length_km)
                    skipped_dupes += 1
                    continue

            path = Path(
                osm_id=osm_id or 0,
                name=(props.get("name") or "Unnamed Path"),
                highway=(props.get("highway") or "path"),
                difficulty=map_sac_scale_to_difficulty(props.get("sac_scale")),
                length=float(length_value or 0.0),
                website=(props.get("website") or ""),
                geometry=ml,
            )
            path.save()
            if length_value is None:
                length_km = ExpressionWrapper(
                    GeomLength("geometry", spheroid=True) / Value(1000.0),
                    output_field=FloatField(),
                )
                Path.objects.filter(pk=path.pk).update(length=length_km)
            created_count += 1
        return created_count, skipped_dupes


