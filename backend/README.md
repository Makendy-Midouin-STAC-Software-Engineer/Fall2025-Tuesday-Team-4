## iHike Backend (Django + PostGIS)

Backend for iHike. Trails are now rendered from Mapbox vector tiles on the frontend; the legacy trails API has been deprecated and removed.

### Tech Stack
- Django 5 + Django REST Framework
- GeoDjango + PostGIS (PostgreSQL)
- django-filter for query filtering
- django-cors-headers for CORS
- WhiteNoise for static files in containers
- Dockerfile for containerized deploys (EB compatible)

### Project Structure
```
backend/
  ihike_backend/        # Django project (settings, urls, wsgi)
  hiking/               # App scaffolding (models removed)
  requirements.txt      # Python dependencies
  Dockerfile            # Container build for EB or local Docker
  docker-entrypoint.sh  # Migrate/collectstatic/start gunicorn
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

# CORS (set your frontend origin; Vite default shown)
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Trails API deprecation (default true). When true, all trails endpoints return 410.
TRAILS_API_DEPRECATED=true
```

Windows users may need to set GDAL/GEOS paths (see comments in `env.sample`).

### Setup (Local)
Prereqs: Python 3.12. If you no longer use GeoDjango, a plain PostgreSQL is fine.

1) Create and activate a virtualenv (recommended)
```
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: . .venv/Scripts/Activate.ps1
pip install --upgrade pip wheel
pip install -r requirements.txt
```

2) Configure database
- Set `DATABASE_URL` (or discrete vars) in `backend/.env`.

3) Run migrations
```
python manage.py migrate
```

4) Start the development server
```
python manage.py runserver 0.0.0.0:8000
```

Health check: `GET /health/` → `{ "status": "ok" }`

### Trails API status
- Legacy endpoints (`/api/route/`, `/api/ways/`, `/api/trails/`, `/api/paths/`) are deprecated.
- With `TRAILS_API_DEPRECATED=true` (default), requests return HTTP 410 Gone with a JSON message.
- The frontend should use Mapbox vector tiles for trails; no backend trail data is required.

### CORS
Configure allowed origins via `CORS_ALLOWED_ORIGINS`. When `DEBUG=True` and no origins are set, all origins are allowed for development.

### Deployment (AWS Elastic Beanstalk)
- Use the included `Dockerfile` and `docker-entrypoint.sh`.
- Configure environment variables in EB (never commit secrets).
- EB health check can hit `/health/`.

### Notes
- If you previously imported GeoJSON into the database, those tables have been removed by migrations. Keep external copies if needed for archival.


