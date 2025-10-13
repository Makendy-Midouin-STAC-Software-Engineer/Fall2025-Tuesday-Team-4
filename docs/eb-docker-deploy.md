# EB Docker deploy quick reference

- Ensure EB env vars are set in Console or via CLI (no secrets in repo): SECRET_KEY, DATABASE_URL (or DB_*), ALLOWED_HOSTS, DEBUG=False
- Build context: backend/ (Dockerfile lives here)
- Healthcheck hits /health/ which already exists in ihike_backend/urls.py

## Commands

```bash
# set envs (example)
eb setenv SECRET_KEY=... DEBUG=False ALLOWED_HOSTS=your-env.elasticbeanstalk.com DATABASE_URL=...

# deploy current commit
eb deploy
```

## Notes
- .ebextensions/.platform removed; Docker image controls runtime.
- .env is only for local dev in backend/.env and is auto-loaded by settings.py.
