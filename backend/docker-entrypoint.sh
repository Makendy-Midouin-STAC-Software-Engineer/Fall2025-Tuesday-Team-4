#!/usr/bin/env bash
set -euo pipefail

# Resolve app root
APP_DIR="/app"
cd "$APP_DIR"

# Ensure virtualenv-like behavior even without venv by preferring user site-packages
export PYTHONUNBUFFERED=1
export PATH="${HOME}/.local/bin:${PATH}"

# Best-effort: if GDAL not found at expected path, try to discover
if [ ! -e "${GDAL_LIBRARY_PATH:-/usr/lib64/libgdal.so}" ]; then
  CANDIDATE=$(python3 - <<'PY'
import ctypes.util
print(ctypes.util.find_library('gdal') or '', end='')
PY
)
  if [ -n "$CANDIDATE" ]; then
    export GDAL_LIBRARY_PATH="$CANDIDATE"
  fi
fi

export LD_LIBRARY_PATH="/usr/lib64:/lib64:${LD_LIBRARY_PATH:-}"

echo "== Running Django checks =="
python3 manage.py check || true

echo "== Applying migrations =="
python3 manage.py migrate --noinput

echo "== Collecting static =="
python3 manage.py collectstatic --noinput --clear

PORT="${PORT:-8000}"
echo "== Starting gunicorn on port ${PORT} =="
exec gunicorn ihike_backend.wsgi:application \
  --bind 0.0.0.0:${PORT} \
  --workers ${GUNICORN_WORKERS:-3} \
  --timeout ${GUNICORN_TIMEOUT:-60} \
  --access-logfile '-' --error-logfile '-'


