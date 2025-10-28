My concerns/Context:
Previously, we fetched trail data (Ways and Routes) from the backend and displayed it on the frontend map. While this works, the performance is inconsistent:
- Trails are slow to load initially.
- Reloading or switching map styles causes reloading of all trails.
- Panning within the same area sometimes makes trails disappear temporarily before re-rendering.
- Sometimes all trails won't load, even when doing nothing it could occasionally flicker, disappear or render.
- Zooming in very close on a single trail can cause flickering.
- Occasionally, some trails fail to load at first, but appear after a short delay.
- Basically it doesn't feel persistent and consistent?

In contrast, tools like https://geojson.io display the same large GeoJSON files smoothly, without flickering or missing features, suggesting the problem is with real-time frontend rendering of large GeoJSON and caching/optimization. 

The goal is to improve performance and visual consistency while preserving all existing interactivity (toggles for Ways and Routes, dark/outdoors style, line-width and terrain exaggeration sliders, hover highlighting, and modal metadata from the backend). Using Mapbox vector tiles is being considered as the solution because it is optimized for rendering large datasets efficiently on the frontend.

Solution:
I have a React + Vite frontend with Mapbox GL JS, already fully implementing:
- Toggles for Ways and Routes layers
- Dark/Outdoors style toggle
- Sliders for line-width and terrain exaggeration
- Hover highlight on trails by osm_id
- Modal popups with metadata fetched from backend
- Trails coloring strategy (gradient by length for Ways, hash palette for Routes)

I want to switch the trail geometry from backend GeoJSON to Mapbox vector tiles **without breaking any existing interactivity**.  

Implement the following:

1. Replace the current GeoJSON sources for Ways and Routes with vector tile sources from Mapbox Studio:
   - Ways → mapbox://ultimateboss.3qj3gbcn
   - Routes → mapbox://ultimateboss.5vu1gtzj
   - Ensure the `source-layer` properties in layers match the vector tile layers.
2. Make any minimal necessary code adjustments so hover and highlight continue to work using the `osm_id` property from the tiles.
3. Keep all existing interactivity, toggles, sliders, trails color strategy, and modals completely intact. Modal popups fetch full metadata from the backend as before.
4. Make code adjustments where necessary to have everything running smoothly, following the principle of file/folder modularity.
5. Maintain existing trail coloring logic: (gradient by length for Ways, hash palette for Routes)

Verification / Acceptance Criteria
- Layers render correctly from vector tiles
- Colors, line-width, and opacity remain the same
- Hover highlights and modal metadata fetching work as before.
- Toggles for Ways / Routes and style switching still function normally.
- erformance and visual consistency are improved compared to GeoJSON sources.

Notes
- Vector tiles store geometry and essential properties (osm_id, name) only. Full metadata remains in the backend.
- This migration is focused solely on replacing the data source with vector tiles without changing frontend interactivity logic.