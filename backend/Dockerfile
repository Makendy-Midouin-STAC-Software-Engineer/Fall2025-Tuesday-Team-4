# syntax=docker/dockerfile:1

# Use Debian-based Python image where GDAL packages are available
FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# System deps: build tools and geo libs (GDAL/GEOS/PROJ)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
       build-essential \
       gdal-bin libgdal-dev \
       libgeos-dev \
       proj-bin proj-data libproj-dev \
       ca-certificates \
       curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt /app/requirements.txt

# Upgrade pip and install Python deps
RUN python -m pip install --upgrade pip wheel \
  && python -m pip install -r /app/requirements.txt

# Set envs that Django/GeoDjango respect (Debian paths)
ENV GEOS_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgeos_c.so \
    GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgdal.so \
    DJANGO_SETTINGS_MODULE=ihike_backend.settings

# Copy application source
COPY . /app

# Ensure entrypoint is executable
RUN chmod +x /app/docker-entrypoint.sh

# Create non-root user
RUN useradd -m appuser \
  && chown -R appuser:appuser /app

USER appuser

# Expose gunicorn port
EXPOSE 8000

# Healthcheck for EB/containers – uses existing /health/ endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT:-8000}/health/ || exit 1

# Entrypoint will handle migrations, collectstatic, then start gunicorn
ENTRYPOINT ["/app/docker-entrypoint.sh"]


