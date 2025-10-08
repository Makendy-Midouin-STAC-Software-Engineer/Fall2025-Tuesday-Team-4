## iHike Backend Code Review — 001

Scope: Review of Django + DRF(+GIS) backend per docs/commands/code_review.md (L3–L10): plan alignment, bugs, data alignment, over‑engineering, and style. Findings include concrete, minimal actions.

### Plan alignment
- Interactive GeoJSON API: Implemented via `GeoFeatureModelSerializer` and `/api/trails`, `/api/paths` endpoints. Geometry SRID 4326 is correct for Mapbox.
- Data model fields: `osm_id`, `name`, `route`/`highway`, `length`, `website`, and derived `difficulty` present. Original `sac_scale` not stored.
- Import workflow: Provided management command to ingest both `hiking_route.geojson` and `hiking_ways.geojson` with validation and geodesic length computation.

Gaps vs brief:
- Filtering/search (difficulty, length, region/bbox) not implemented.
- CORS for frontend (Vercel) not configured.
- Public write operations currently enabled.

### Critical issues (fix first)
1) Public write access on API
- Current: `ModelViewSet` exposes create/update/delete with default DRF permissions (effectively open).
- Risk: Accidental or malicious data changes.
- Action: Switch to `ReadOnlyModelViewSet` or enforce permissions.
```python
from rest_framework import viewsets, permissions

class TrailViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]  # or IsAuthenticatedOrReadOnly
    queryset = Trail.objects.all().order_by('name')
    serializer_class = TrailSerializer

class PathViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Path.objects.all().order_by('name')
    serializer_class = PathSerializer
```

2) CORS not configured
- Current: No `django-cors-headers`. Frontend hosted on Vercel will be blocked.
- Action: Add dependency and settings.
  - requirements: `django-cors-headers`
  - settings: add `corsheaders` to `INSTALLED_APPS`, `CorsMiddleware` near top of `MIDDLEWARE`, and set `CORS_ALLOWED_ORIGINS` or `CORS_ALLOWED_ORIGIN_REGEXES` for Vercel domain(s).

3) GeoJSON serializer configuration
- Current: `GeoFeatureModelSerializer` `fields` include `'geometry'` alongside `geo_field = 'geometry'`.
- Risk: Geometry may appear twice or in the wrong place depending on drf‑gis version (root `geometry` plus duplicate in `properties`).
- Action: Remove `'geometry'` from `fields`; keep `geo_field = 'geometry'` only.

### High‑priority improvements
4) Filtering, search, and spatial queries
- Current: No filtering; spec calls for difficulty/length filters and regional (bbox) queries.
- Action:
  - Install `django-filter`; set DRF `DEFAULT_FILTER_BACKENDS`.
  - Add filters: `difficulty`, `route`/`highway`, `length_min/length_max` (custom filter), and spatial `in_bbox` via `drf_gis.filter.InBBoxFilter`.
  - Consider pagination defaults (`PAGE_SIZE`) for large result sets.

5) Data alignment: difficulty vs `sac_scale`
- Current: Import maps `sac_scale` to categorical `difficulty` and drops original.
- Risk: Frontend or analytics may need raw `sac_scale` values; product brief mentions difficulty (sac_scale).
- Actions (pick one):
  - Store original `sac_scale` as a nullable `CharField` on both models and expose in serializers, keeping mapped `difficulty` for UI.
  - Or expose a computed `sac_scale` or `difficultySource` field in serializers from original data.

6) Uniqueness and indexing for `osm_id`
- Current: No DB uniqueness; importer dedupes in Python; `osm_id` set to 0 when missing.
- Risks: Silent duplicates if data imported outside the command; multiple "0" rows when `osm_id` absent.
- Actions:
  - Add `UniqueConstraint` on `osm_id` per model and `db_index=True`.
  - Change model fields to `osm_id = models.BigIntegerField(null=True, blank=True, db_index=True)` and adjust importer to leave `None` (not `0`).

### Medium/low improvements
7) REST framework hardening
- Add `REST_FRAMEWORK` defaults: `DEFAULT_PERMISSION_CLASSES = ['rest_framework.permissions.AllowAny']` plus view‑level `ReadOnlyModelViewSet` (above), `DEFAULT_PAGINATION_CLASS` and `PAGE_SIZE`.

8) Numeric precision and validation
- Consider `DecimalField(max_digits=9, decimal_places=3)` for `length` (km) to avoid FP artifacts; add MinValueValidator(0).

9) Import command maintainability
- Minor duplication between trails/paths import. Extract common subroutines (parse props, compute/update length) for clarity.

10) Admin polish
- Add `list_filter = ("difficulty",)` for `PathAdmin` to match `TrailAdmin` filtering.

### Style/readability
- Code is concise and consistent; functions and variable names are clear. Good use of transactions and SRID handling. Windows GDAL/GEOS fallbacks are pragmatic.

### Deployment readiness
- Static files configured (`STATIC_ROOT`). EB ready with `gunicorn` present. PostGIS engine switching via `dj_database_url` is correct. Ensure EB environment has PostGIS enabled and GDAL/GEOS libs available via system packages (not Python wheels).

### Action checklist
- [ ] Make API read‑only for public usage (or add appropriate permissions)
- [ ] Add `django-cors-headers` and configure allowed origins (Vercel)
- [ ] Fix GeoJSON serializer fields (remove `'geometry'` from `fields`)
- [ ] Implement filters: difficulty, route/highway, length range, bbox
- [ ] Decide on storing/exposing original `sac_scale`
- [ ] Add unique+indexed `osm_id`; allow null instead of `0`
- [ ] Add DRF pagination defaults
- [ ] Optional: switch `length` to `DecimalField` and validate non‑negative
- [ ] Optional: refactor import command shared logic
- [ ] Optional: add `difficulty` filter to `PathAdmin`

### Notes for frontend consumers
- GeoJSON feature output uses SRID 4326 (WGS84) suitable for Mapbox.
- Properties are snake_case (`osm_id`, `sac_scale` not currently present, `difficulty` is mapped value). Confirm UI expects snake_case; if camelCase is preferred, transform at the client edge.


