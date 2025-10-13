## iHike Backend Code Review — 002

Scope: Full review of Django + DRF(+GIS) backend and deployment (Docker + Elastic Beanstalk). This follows `docs/commands/code_review.md` by checking plan alignment, bugs, data alignment, over‑engineering, and style. Includes prioritized actions and environment guidance.

### What’s Good
- Clean, minimal Django setup with DRF, DRF‑GIS, GeoDjango.
- Robust DB config: prefers `DATABASE_URL`, upgrades engine to PostGIS when needed.
- Read‑only API via `ReadOnlyModelViewSet` and explicit filters/bbox support.
- Spatial indexes added via `GistIndex`; filterable columns are indexed.
- Import command validates/coerces geometry, calculates geodesic length in km when absent, and supports idempotent updates.
- Dockerfile installs system GDAL/GEOS/PROJ and uses a non‑root user. Entrypoint automates migrate/collectstatic and starts gunicorn.
- Healthcheck endpoint (`/health/`) and router with `/api/trails`, `/api/paths`.

### Risks and Issues
1) Secrets in committed artifacts (tempEnv.sample)
- Observed real‑looking `DATABASE_URL`, `SECRET_KEY` values in `backend/tempEnv.sample` (not tracked, but visible in workspace). These must never be committed.
- Action: Ensure any sensitive sample files remain out of git, rotate credentials if ever pushed. Keep `backend/env.sample` generic (no secrets).

2) Memory/latency on t3.micro leading to 504s
- Likely due to GDAL/GEOS/CPU throttling and constrained RAM under gunicorn load.
- Action: Staying on t3.small (as you did) is appropriate. Additionally, tune gunicorn workers/timeouts via env vars (see below).

3) CORS origins default to closed in production
- `CORS_ALLOWED_ORIGINS` env not set by default; with DEBUG=False, requests from Vercel will be blocked.
- Action: Set `CORS_ALLOWED_ORIGINS` in EB env (comma‑separated) to your frontend URL(s).

4) Length precision and validation
- `length` uses `FloatField`. For km values and consistent sorting/pagination, a `DecimalField(9,3)` would avoid FP artifacts.
- Action: Optional migration to `DecimalField` with non‑negative validation if precision matters for UI filters.

5) Importer duplicate logic
- Trails/Paths code is mostly duplicated. Not a bug, but maintenance can be improved.
- Action: Optional refactor to shared helpers for mapping props and computing length.

### Data Alignment Checks
- Serializers use snake_case and `GeoFeatureModelSerializer` with `geo_field='geometry'` (no duplicate geometry in properties). Good.
- `sac_scale` stored as nullable field and `difficulty` stored as mapped category; both exposed to clients. Good for analytics + UI.
- BBOX, difficulty, highway/route, and length range filters implemented and match indexed fields.

### Security and Hardening
- Default permission `AllowAny` with read‑only viewsets is safe for public data. If admin actions are exposed separately, keep staff‑auth only.
- `ALLOWED_HOSTS` is configurable via env; set EB domain and any custom domains.
- Secrets are loaded from env; `SECRET_KEY` must be set in EB. Do not rely on defaults.

### Deployment Review
- Docker: Debian slim with GDAL/GEOS/PROJ is correct for GeoDjango.
- Entrypoint: runs migrations and collectstatic; respects `PORT` and gunicorn env vars.
- EB: `.ebextensions/django.config` sets minimal envs. Use EB console for DB URL, secrets, CORS, and gunicorn tuning.

### Environment Variables (recommended)
- Django
  - `DEBUG=False`
  - `SECRET_KEY=<set in EB>`
  - `DJANGO_SETTINGS_MODULE=ihike_backend.settings`
  - `ALLOWED_HOSTS=.elasticbeanstalk.com,<your-domain>`
- Database
  - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require`
  - Optional discrete vars if not using URL: `DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT=5432, DB_SSLMODE=require`
- CORS
  - `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.your-domain.com`
  - `CORS_ALLOW_CREDENTIALS=false` (or true if needed)
- Gunicorn (tune to instance size and traffic)
  - `PORT=8000` (EB sets this; keep locally for parity)
  - `GUNICORN_WORKERS=2` (t3.small ok; raise to 3–4 if CPU allows)
  - `GUNICORN_TIMEOUT=90`
  - `GUNICORN_MAX_REQUESTS=500`
  - `GUNICORN_MAX_REQUESTS_JITTER=50`
- Geo (local Windows only)
  - `GDAL_LIBRARY_PATH`, `GEOS_LIBRARY_PATH`, `GDAL_BIN_DIR`, `OSGEO4W_ROOT` as needed

### Prioritized Action List
1) In EB console, set `CORS_ALLOWED_ORIGINS` to your Vercel/frontend origin(s).
2) Keep `GUNICORN_*` envs as in `env.sample` and adjust based on load; monitor memory.
3) Confirm `SECRET_KEY` and `DATABASE_URL` are set only in EB (not committed). If any secrets were exposed, rotate immediately.
4) Optional: Switch `length` to `DecimalField(9,3)` with non‑negative validation if precise filters are needed.
5) Optional: Refactor importer shared logic.

### Verification Checklist
- [x] Read‑only endpoints: `/api/trails`, `/api/paths` with bbox + filters
- [x] DRF + DRF‑GIS configured; pagination set to `PAGE_SIZE` env (default 200)
- [x] PostGIS engine selected when using PostgreSQL; SRID 4326
- [x] GIST indexes on geometry; btree indexes on filter fields
- [x] Docker image includes GDAL/GEOS/PROJ; gunicorn runs as non‑root
- [x] Healthcheck route (`/health/`) for container health

No code changes required for functionality. Environment guidance added in `backend/env.sample` for safer EB config and operational stability.


