Create or update backend documentation, then commit and push changes.

Steps:

1) Generate/refresh README
- Ensure `backend/README.md` covers: purpose, stack, structure, local setup, env vars (reference `env.sample`), migrations, data loading via `import_geojson`, dev server run, API endpoints, CORS, and Docker/EB notes.
- Verify sensitive files are ignored (`.env`, caches, venvs). Review root `.gitignore`.

2) Sanity-check backend
```
cd backend
python -m venv .venv && . .venv/Scripts/Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
python manage.py check
```

3) Optional: run migrations and import sample data locally
```
python manage.py migrate
python manage.py import_geojson trailsData/hiking_route.geojson trailsData/hiking_ways.geojson --update-existing
```

4) Commit and push (from repo root)
```
git add backend/README.md backend/env.sample docs/commands/release_backend.md
git add backend  # stage other backend changes as needed (Dockerfile, entrypoint, etc.)
git commit -m "Backend completed."
git push origin main
```

Notes:
- Never commit `.env`, `__pycache__`, `.venv`, or Elastic Beanstalk internal folders per `.gitignore`.
- If deploying to EB, configure env vars in EB console or via `eb setenv`.


