#!/usr/bin/env bash
set -euo pipefail

# Resolve project root as the directory two levels up from this script
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

STAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="ihike-backend-eb-${STAMP}.zip"

BACKEND_DIR="${PROJECT_ROOT}/backend"
ZIP_PATH="${PROJECT_ROOT}/${ZIP_NAME}"
TEST_DIR="${PROJECT_ROOT}/__bundle_test"

rm -f "${ZIP_PATH}"
rm -rf "${TEST_DIR}"

python3 - <<'PY'
import os, sys, zipfile, stat
from pathlib import Path

project_root = Path(os.environ.get('PROJECT_ROOT', os.getcwd()))
backend_dir = project_root / 'backend'
zip_path = project_root / os.environ['ZIP_NAME']

exclude_dirs = {
    '.git', '.hg', '.svn', '__pycache__', '.mypy_cache', '.pytest_cache', '.ruff_cache',
    'node_modules', '.venv', 'venv', '.idea', '.vscode', '.DS_Store',
}
exclude_globs = { '*.pyc', '*.pyo', '*.pyd', '.DS_Store', 'Thumbs.db' }

def should_exclude(path: Path) -> bool:
    parts = set(path.parts)
    if parts & exclude_dirs: return True
    name = path.name
    for pattern in exclude_globs:
        if path.match(pattern):
            return True
    return False

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(backend_dir):
        root_path = Path(root)
        # prune excluded dirs in-place for performance
        dirs[:] = [d for d in dirs if not should_exclude(root_path / d)]
        for f in files:
            p = root_path / f
            if should_exclude(p):
                continue
            # archive name should be relative to backend root (no top-level backend/ folder)
            arcname = p.relative_to(backend_dir)
            zf.write(p, arcname)

print(zip_path)
PY

mkdir -p "${TEST_DIR}"
python3 - <<'PY'
import os, sys, zipfile
from pathlib import Path

project_root = Path(os.environ.get('PROJECT_ROOT', os.getcwd()))
zip_path = project_root / os.environ['ZIP_NAME']
test_dir = project_root / '__bundle_test'

with zipfile.ZipFile(zip_path, 'r') as zf:
    zf.extractall(test_dir)

required = ['manage.py','requirements.txt','.ebextensions','.platform','ihike_backend','hiking']
missing = [name for name in required if not (test_dir / name).exists()]
if missing:
    print('Missing at bundle root:', ', '.join(missing))
    sys.exit(1)
print('Bundle root looks OK')
PY

echo "Bundle: ${ZIP_PATH}"
ls -la "${TEST_DIR}"

echo "OK"

