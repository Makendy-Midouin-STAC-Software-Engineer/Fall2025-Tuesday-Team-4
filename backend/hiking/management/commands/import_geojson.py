import json
from typing import Any, Dict, Iterable, List, Optional, Tuple
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import DecimalField, Value, FloatField
from django.db.models.expressions import ExpressionWrapper
from django.contrib.gis.db.models.functions import Length as GeomLength
from django.contrib.gis.geos import GEOSGeometry, MultiLineString, LineString

from hiking.models import Route, Ways


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
        raise ValueError("Polygon geometry is not supported for route/ways")
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


def geodesic_km_expr() -> ExpressionWrapper:
    """Database expression: geodesic length of geometry in kilometers as Decimal(9,3)."""
    return ExpressionWrapper(
        GeomLength("geometry", spheroid=True) / Value(1000.0),
        output_field=DecimalField(max_digits=9, decimal_places=3),
    )


class Command(BaseCommand):
    help = (
        "Import GeoJSON into Route and Ways models. Usage:"
        " python manage.py import_geojson hiking_route.geojson hiking_ways.geojson"
        " [--update-existing]"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "files",
            nargs="+",
            help="GeoJSON files. hiking_route.geojson -> Route, hiking_ways.geojson -> Ways",
        )
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help=(
                "Update existing rows (match by osm_id): set sac_scale/difficulty, backfill length, "
                "and optionally website/route/highway if missing; otherwise skip duplicates"
            ),
        )

    def handle(self, *args, **options):
        files: List[str] = options["files"]
        update_existing: bool = bool(options.get("update_existing"))
        if not files:
            raise CommandError("Provide at least one GeoJSON file")

        routes_created = 0
        routes_updated = 0
        ways_created = 0
        ways_updated = 0
        skipped = 0

        for file_path in files:
            lower = file_path.lower()
            if "route" in lower:
                created, updated, skipped_file = self._import_routes(file_path, update_existing)
                routes_created += created
                routes_updated += updated
                skipped += skipped_file
            elif "ways" in lower or "path" in lower:
                created, updated, skipped_file = self._import_ways(file_path, update_existing)
                ways_created += created
                ways_updated += updated
                skipped += skipped_file
            else:
                self.stdout.write(self.style.WARNING(
                    f"Skipping {file_path}: cannot infer model (expects 'route' or 'ways' in filename)"
                ))

        self.stdout.write(self.style.SUCCESS(
            (
                f"Imported Route: {routes_created} (updated {routes_updated}), "
                f"Ways: {ways_created} (updated {ways_updated}), "
                f"Skipped duplicates: {skipped}"
            )
        ))

    @transaction.atomic
    def _import_routes(self, file_path: str, update_existing: bool) -> Tuple[int, int, int]:
        created_count = 0
        updated_count = 0
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
                osm_id = int(osm_id_raw) if osm_id_raw not in (None, "", "null") else None
            except ValueError:
                osm_id = None

            # Parse provided length (km). Treat null/empty/zero as missing. Use Decimal for precision.
            length_raw = props.get("length")
            length_value: Optional[Decimal] = None
            try:
                if length_raw not in (None, "", "null"):
                    candidate = Decimal(str(length_raw))
                    if candidate > 0:
                        length_value = candidate
            except Exception:
                length_value = None

            if osm_id is not None:
                existing = Route.objects.filter(osm_id=osm_id).first()
                if existing:
                    if update_existing:
                        updates: Dict[str, Any] = {}
                        new_sac = (props.get("sac_scale") or None)
                        if new_sac != existing.sac_scale:
                            updates["sac_scale"] = new_sac
                            updates["difficulty"] = map_sac_scale_to_difficulty(new_sac)
                        # Backfill length if missing/zero
                        if (existing.length is None) or (existing.length <= 0):
                            if length_value is not None:
                                updates["length"] = length_value
                            else:
                                updates["length"] = geodesic_km_expr()
                        # Optional: fill website/route if missing
                        new_website = (props.get("website") or "").strip()
                        if new_website and not existing.website:
                            updates["website"] = new_website
                        new_route = (props.get("route") or "").strip()
                        if new_route and not existing.route:
                            updates["route"] = new_route
                        if updates:
                            Route.objects.filter(pk=existing.pk).update(**updates)
                            updated_count += 1
                        else:
                            skipped_dupes += 1
                    else:
                        # If existing record has missing/zero length, backfill using DB geodesic length (km)
                        if (existing.length is None) or (existing.length <= 0):
                            length_km = ExpressionWrapper(
                                GeomLength("geometry", spheroid=True) / Value(1000.0),
                                output_field=FloatField(),
                            )
                            Route.objects.filter(pk=existing.pk).update(length=length_km)
                        skipped_dupes += 1
                    continue

            route_obj = Route(
                osm_id=osm_id,
                name=(props.get("name") or "Unnamed Route"),
                route=(props.get("route") or "hiking"),
                difficulty=map_sac_scale_to_difficulty(props.get("sac_scale")),
                sac_scale=(props.get("sac_scale") or None),
                length=(length_value if length_value is not None else Decimal("0.000")),
                website=(props.get("website") or ""),
                geometry=ml,
            )
            route_obj.save()
            # If no valid length provided, compute geodesic length in km via PostGIS
            if length_value is None:
                Route.objects.filter(pk=route_obj.pk).update(length=geodesic_km_expr())
            created_count += 1
        return created_count, updated_count, skipped_dupes

    @transaction.atomic
    def _import_ways(self, file_path: str, update_existing: bool) -> Tuple[int, int, int]:
        created_count = 0
        updated_count = 0
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
                osm_id = int(osm_id_raw) if osm_id_raw not in (None, "", "null") else None
            except ValueError:
                osm_id = None

            # Parse provided length (km) as Decimal; treat null/empty/zero as missing
            length_raw = props.get("length")
            length_value: Optional[Decimal] = None
            try:
                if length_raw not in (None, "", "null"):
                    candidate = Decimal(str(length_raw))
                    if candidate > 0:
                        length_value = candidate
            except Exception:
                length_value = None

            if osm_id is not None:
                existing = Ways.objects.filter(osm_id=osm_id).first()
                if existing:
                    if update_existing:
                        updates: Dict[str, Any] = {}
                        new_sac = (props.get("sac_scale") or None)
                        if new_sac != existing.sac_scale:
                            updates["sac_scale"] = new_sac
                            updates["difficulty"] = map_sac_scale_to_difficulty(new_sac)
                        if (existing.length is None) or (existing.length <= 0):
                            if length_value is not None:
                                updates["length"] = length_value
                            else:
                                updates["length"] = geodesic_km_expr()
                        new_website = (props.get("website") or "").strip()
                        if new_website and not existing.website:
                            updates["website"] = new_website
                        new_highway = (props.get("highway") or "").strip()
                        if new_highway and not existing.highway:
                            updates["highway"] = new_highway
                        if updates:
                            Ways.objects.filter(pk=existing.pk).update(**updates)
                            updated_count += 1
                        else:
                            skipped_dupes += 1
                    else:
                        if (existing.length is None) or (existing.length <= 0):
                            length_km = ExpressionWrapper(
                                GeomLength("geometry", spheroid=True) / Value(1000.0),
                                output_field=FloatField(),
                            )
                            Ways.objects.filter(pk=existing.pk).update(length=length_km)
                        skipped_dupes += 1
                    continue

            ways = Ways(
                osm_id=osm_id,
                name=(props.get("name") or "Unnamed Ways"),
                highway=(props.get("highway") or "path"),
                difficulty=map_sac_scale_to_difficulty(props.get("sac_scale")),
                sac_scale=(props.get("sac_scale") or None),
                length=(length_value if length_value is not None else Decimal("0.000")),
                website=(props.get("website") or ""),
                geometry=ml,
            )
            ways.save()
            if length_value is None:
                Ways.objects.filter(pk=ways.pk).update(length=geodesic_km_expr())
            created_count += 1
        return created_count, updated_count, skipped_dupes


