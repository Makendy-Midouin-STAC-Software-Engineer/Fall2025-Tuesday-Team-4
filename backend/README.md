## iHike Backend (Django + PostGIS)

Backend for iHike: a geospatial API serving hiking Trails and Paths with bbox, filtering, and ordering support. Built with Django REST Framework and GeoDjango on PostgreSQL/PostGIS. Deployed on AWS Elastic Beanstalk; designed to integrate with a Vite/React frontend.

### Tech Stack
- Django 5 + Django REST Framework
- GeoDjango + PostGIS (PostgreSQL)
- djangorestframework-gis for GeoJSON output and bbox filtering
- django-filter for query filtering
- django-cors-headers for CORS
- WhiteNoise for static files in containers
- Dockerfile for containerized deploys (EB compatible)

### Project Structure
```
backend/
  ihike_backend/        # Django project (settings, urls, wsgi)
  hiking/               # App with models, serializers, views, management command
  requirements.txt      # Python dependencies
  Dockerfile            # Container build for EB or local Docker
  docker-entrypoint.sh  # Migrate/collectstatic/start gunicorn
  trailsData/           # Example GeoJSON inputs (optional local import)
  env.sample            # Reference env vars (copy to .env locally)
```

### Environment Variables
Use `backend/env.sample` as reference. Do not commit real secrets. For local development, create `backend/.env`:

```
# Minimal local example
DEBUG=True
SECRET_KEY=replace-me
DJANGO_SETTINGS_MODULE=ihike_backend.settings
ALLOWED_HOSTS=localhost,127.0.0.1

# Prefer DATABASE_URL; example with SSL required
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require

# Optional discrete vars if not using DATABASE_URL
# DB_NAME=ihike
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_HOST=localhost
# DB_PORT=5432

# CORS (set your frontend origin; Vite default shown)
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Windows users may need to set GDAL/GEOS paths (see comments in `env.sample`).

### Setup (Local)
Prereqs: Python 3.12, PostgreSQL with PostGIS extension, GDAL/GEOS (see Docker for an easier route).

1) Create and activate a virtualenv (recommended)
```
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: . .venv/Scripts/Activate.ps1
pip install --upgrade pip wheel
pip install -r requirements.txt
```

2) Configure database
- Create a PostgreSQL database and enable PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Set `DATABASE_URL` (or discrete vars) in `backend/.env`.

3) Run migrations
```
python manage.py migrate
```

4) (Optional) Load sample GeoJSON data
Example files are in `backend/trailsData/`. Use the custom management command:
```
python manage.py import_geojson trailsData/hiking_route.geojson trailsData/hiking_ways.geojson --update-existing
```
This will import Trails (routes) and Paths (ways), computing geodesic length (km) when missing.

5) Start the development server
```
python manage.py runserver 0.0.0.0:8000
```

Health check: `GET /health/` → `{ "status": "ok" }`

### API
Base path: `/api/`

- `GET /api/trails/` — GeoJSON features for Trails
  - Filters: `difficulty`, `route`, `length__gte`, `length__lte`
  - BBox filter: `in_bbox=minx,miny,maxx,maxy` (WGS84)
  - Ordering: `?ordering=name` or `?ordering=length`

- `GET /api/paths/` — GeoJSON features for Paths
  - Filters: `difficulty`, `highway`, `length__gte`, `length__lte`
  - BBox filter: `in_bbox=minx,miny,maxx,maxy`
  - Ordering: `?ordering=name` or `?ordering=length`

Responses use `application/geo+json` compatible structures via `djangorestframework-gis`.

### CORS
Configure allowed origins via `CORS_ALLOWED_ORIGINS`. When `DEBUG=True` and no origins are set, all origins are allowed for development.

### Docker (Optional Local Run)
Build and run the backend in a container with system GDAL/GEOS preinstalled.

```
cd backend
docker build -t ihike-backend .
docker run --rm -p 8000:8000 \
  -e PORT=8000 \
  -e DJANGO_SETTINGS_MODULE=ihike_backend.settings \
  -e SECRET_KEY=replace-me \
  -e DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require \
  -e CORS_ALLOWED_ORIGINS=http://localhost:5173 \
  ihike-backend
```

Entry point performs `migrate` and `collectstatic` automatically, then starts Gunicorn.

### Deployment (AWS Elastic Beanstalk)
- Use the included `Dockerfile` and `docker-entrypoint.sh`.
- Configure environment variables in EB (never commit secrets).
- EB health check can hit `/health/`.

### Notes
- Decimal lengths (`length`) are stored in km with 3 decimal places.
- Geo fields use SRID 4326 (WGS84). BBox expects lon/lat bounds in the same SRID.
- If importing OSM-derived data, `sac_scale` values are mapped to difficulty.


