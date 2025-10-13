### iHike - Setup on a New Device

This guide lists only the steps you MUST do to run the project, and clearly marks OPTIONAL steps.

---

### Required

- Clone and choose your branch
```bash
git clone https://github.com/<your-user>/<your-repo>.git
cd <your-repo>
# or clone a specific branch
# git clone -b <your-branch> https://github.com/<your-user>/<your-repo>.git
```

- Backend (Django)
```bash
cd backend
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
```

- Backend environment variables
```bash
# copy template and fill required values
copy env.sample .env   # Windows
# cp env.sample .env   # macOS/Linux
```
Fill at least:
- SECRET_KEY
- Either DATABASE_URL (recommended) OR DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
- ALLOWED_HOSTS for your environment

- Ensure PostgreSQL with PostGIS is installed and your database exists (with PostGIS enabled).

- Apply database migrations
```bash
python manage.py migrate
```

- Run the backend
```bash
python manage.py runserver
```

---

### Optional

- Windows-only GIS libs (only if needed on your machine)
  - If required, set in .env using paths from env.sample:
    - GDAL_LIBRARY_PATH
    - GEOS_LIBRARY_PATH

- Load sample trail/path data (if you want local data)
```bash
python manage.py import_geojson trailsData/hiking_route.geojson trailsData/hiking_ways.geojson
# Update existing rows if they already exist
# python manage.py import_geojson trailsData/hiking_route.geojson trailsData/hiking_ways.geojson --update-existing
```

- Frontend (Vite + React) â€“ only if/when the frontend exists
```bash
cd ../frontend
npm install
# create .env with your Vite env values, e.g.:
# VITE_MAPBOX_TOKEN=your-token
npm run dev
```

- Push your branch to GitHub
```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin <your-branch>
```
