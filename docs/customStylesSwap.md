My Concerns / Context:
We previously migrated trail data (Ways and Routes) from backend GeoJSON to Mapbox vector tiles for better performance. However, after uploading the vector tiles to Mapbox Studio and trying to display them using their URLs, the map and trails are not appearing at all when switching to vector tiles.

Currently:

Both vector tilesets (hiking_ways-9hztmf and hiking_route-8tf6l2) are already uploaded and integrated directly into my Mapbox Studio styles.

These styles are:

Dark: mapbox://styles/ultimateboss/cmgvdbjqa001t01s810zbd8cx

Outdoor: mapbox://styles/ultimateboss/cmgvf9l8c005y01rzd1npdwey

Each style already contains the Ways and Routes vector layers configured in Studio.

So, we should not manually declare any new GeoJSON or vector tile sources in the frontend — the styles themselves already reference them internally.

The goal now is to have my React + Mapbox GL JS frontend load and display these tiles from the styles above while preserving all interactivity and UI controls:

Toggles for Ways and Routes layers

Dark/Outdoor style switcher

Sliders for line-width and terrain exaggeration

Hover highlighting on trails by osm_id

Modal popups with backend metadata (fetching details by osm_id)

Trail coloring strategy (gradient by length for Ways, hash palette for Routes)

Additionally:

I want to confirm that my existing Mapbox access token (sk token) can still be used to authenticate and display these Studio styles.

The frontend should no longer reference any direct vector source URLs like mapbox://ultimateboss.3qj3gbcn; instead, it should load the style (mapbox://styles/...) and access the vector layers already embedded inside that style.

Implementation Task

Update the map initialization so it uses the following styles for the style toggle:

Dark → mapbox://styles/ultimateboss/cmgvdbjqa001t01s810zbd8cx

Outdoor → mapbox://styles/ultimateboss/cmgvf9l8c005y01rzd1npdwey

Remove any manual GeoJSON or vector source declarations (e.g., map.addSource('ways', ...)) — the layers are already inside the style.

Update the layer toggling logic to reference the existing layer IDs from these styles (for example, the source layers hiking_ways-9hztmf and hiking_route-8tf6l2).

Keep all interactive features (hover, modal, sliders, color logic) intact and functioning as before, now working with the layers from the loaded style.

Ensure the map loads correctly using my existing Mapbox access token (sk token), and that trails display persistently and consistently across style toggles, zooming, and panning.

Verification / Acceptance Criteria

Map loads successfully using the Studio styles above.

Ways and Routes layers render properly without flickering or disappearing.

Hover highlight and modal popups still function by osm_id.

Toggles, sliders, and style switch work as before.

Performance is smoother and more consistent than the old GeoJSON implementation.