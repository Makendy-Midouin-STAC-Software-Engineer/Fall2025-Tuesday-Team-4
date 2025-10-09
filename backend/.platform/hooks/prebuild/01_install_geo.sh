#!/usr/bin/env bash
set -euo pipefail

if command -v dnf >/dev/null 2>&1; then
  sudo dnf makecache -y || true

  # Install GEOS/PROJ (generic names exist on AL2023)
  sudo dnf install -y geos geos-devel proj proj-devel || true

  # Ensure repoquery is available (dnf-plugins-core)
  if ! command -v repoquery >/dev/null 2>&1; then
    sudo dnf install -y dnf-plugins-core || true
  fi

  # AL2023 provides versioned GDAL RPMs (e.g., gdal310, gdal310-libs, python3-gdal310)
  # Discover best-match packages via repoquery and install them if available.
  if command -v repoquery >/dev/null 2>&1; then
    GDAL_LIB_PKG=$(dnf -q repoquery --available --latest-limit=1 'gdal*-libs' 2>/dev/null | head -n1 || true)
    GDAL_CORE_PKG=$(dnf -q repoquery --available --latest-limit=1 'gdal[0-9]*' 2>/dev/null | head -n1 || true)
    PY_GDAL_PKG=$(dnf -q repoquery --available --latest-limit=1 'python3-gdal*' 2>/dev/null | head -n1 || true)
  else
    # Fallback: use dnf search output
    GDAL_LIB_PKG=$(dnf -q search gdal 2>/dev/null | awk '/^gdal[0-9]+-libs/{print $1; exit}') || true
    GDAL_CORE_PKG=$(dnf -q search gdal 2>/dev/null | awk '/^gdal[0-9]+\./{print $1; exit}') || true
    PY_GDAL_PKG=$(dnf -q search python3-gdal 2>/dev/null | awk '/^python3-gdal[0-9]+/{print $1; exit}') || true
  fi

  if [ -n "${GDAL_LIB_PKG:-}" ]; then sudo dnf install -y "$GDAL_LIB_PKG" || true; fi
  if [ -n "${GDAL_CORE_PKG:-}" ]; then sudo dnf install -y "$GDAL_CORE_PKG" || true; fi
  # python3-gdal is optional for Django; install if present but don't fail if not
  if [ -n "${PY_GDAL_PKG:-}" ]; then sudo dnf install -y "$PY_GDAL_PKG" || true; fi

  sudo ldconfig || true
else
  sudo yum makecache -y || true
  sudo yum install -y geos geos-devel proj proj-devel gdal-libs || true
  sudo yum install -y gdal || true
  sudo yum install -y gdal-devel || true
  sudo ldconfig || true
fi

# Sanity check: show detected libraries (non-fatal)
command -v gdalinfo >/dev/null 2>&1 && gdalinfo --version || true
command -v geos-config >/dev/null 2>&1 && geos-config --version || true
command -v projinfo >/dev/null 2>&1 && projinfo --version || true
ldconfig -p | grep -E 'gdal|geos|proj' || true
python3 - <<'PY'
import ctypes, ctypes.util
print('GDAL find_library:', ctypes.util.find_library('gdal'))
print('GEOS find_library:', ctypes.util.find_library('geos_c'))
PY

