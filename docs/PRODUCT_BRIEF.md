## iHike — Product Brief

### Project overview / description
iHike is a full‑stack web application for exploring New York hiking trails using real geospatial data. Users can browse an interactive map, view trail details (name, difficulty, length, and links), and follow trails along accurate path geometries.

### Target audience
- Hikers and outdoor enthusiasts in New York
- Visitors planning hikes in New York State
- Trail stewards and local organizations referencing trail metadata

### Primary benefits / features
- Interactive trail map (Mapbox) with hover/click details
- Trail information panel: name, difficulty (sac_scale), length, website
- Search and filtering by difficulty, length, and region
- Follow Trail: navigation‑style guidance along GeoJSON MultiLineString paths
- Fast, reliable API integration serving GeoJSON data

### High‑level tech / architecture
- Frontend: React (Vite) + Tailwind CSS + Mapbox GL JS (render, interactivity)
- Backend: Django + Django REST Framework (API endpoints, GeoJSON serialization)
- Database: PostgreSQL + PostGIS (storage and spatial queries)
- Data source: GeoJSON exported from OpenStreetMap (QGIS + QuickOSM) filtered for NY trails
  - Key fields: `osm_id`, `name`, `route`, `highway`, `sac_scale`, `length`, `website`
- Architecture: Backend provides REST endpoints returning GeoJSON; frontend fetches and renders trails on the map with dynamic UI panels and filters
- Deployment: Backend on AWS Elastic Beanstalk; Frontend on Vercel


