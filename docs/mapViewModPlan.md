Hi Cursor 👋

My current `MapView.tsx` file is around 600 lines and is handling too many responsibilities — including Mapbox initialization, trail coloring, style toggling, and more. Please modularize it for better structure and scalability.

Use the following guidelines and file structure:

---

### 🧩 Goal
Refactor `MapView.tsx` into smaller, well-organized files while preserving full functionality.
Make the structure ready for future interactive features (hover, click popups, zoom styling).

---

### 🗂️ Target Folder Structure

**components/map/**
- `MapView.tsx` → (Core map setup, container, style toggle, calling external setup functions)
- `LayerToggles.tsx` → (UI for toggling visibility of “Ways” and “Routes” layers)

**utils/map/**
- `initMap.ts` → (Handles initial Mapbox map creation, access token, resize handling)
- `updateBaseStyle.ts` → (Switch between Dark and Outdoors styles cleanly)
- `addTrailSources.ts` → (Creates GeoJSON sources for trails)
- `addTrailLayers.ts` → (Adds the Ways + Routes layers and references the coloring logic)
- `trailColoring.ts` → (Contains all color palettes and functions: hashing, length-based coloring)
- `interactionHandlers.ts` → (For hover highlighting, click popups, zoom-dependent line width adjustments — create file but just leave placeholders for now)

---

### 🧠 Implementation Notes

1. **`MapView.tsx`**
   - Should only initialize the map, toggle base styles, and call modular functions like:
     ```ts
     import { initMap } from '@/utils/map/initMap'
     import { updateBaseStyle } from '@/utils/map/updateBaseStyle'
     import { addTrailSources } from '@/utils/map/addTrailSources'
     import { addTrailLayers } from '@/utils/map/addTrailLayers'
     ```
   - Keep the button for switching styles.
   - Keep `mapRef`, `containerRef`, and relevant React state logic.

2. **`trailColoring.ts`**
   - Move all trail color palettes and functions here.
   - Include:
     - `getWayColor(lengthKm: number, baseStyle: string): string`
     - `getRouteColor(name: string, baseStyle: string): string`
   - Store both light/dark color tuning here for flexibility.

3. **`addTrailLayers.ts`**
   - Import `getWayColor` and `getRouteColor`.
   - Add both “Ways” and “Route” layers with proper opacity, zoom-based width, and layer order.
   - Reference the correct GeoJSON sources.

4. **`interactionHandlers.ts`**
   - Create placeholders for:
     - `addHoverHighlight(map: MapboxMap)`
     - `addClickPopup(map: MapboxMap)`
     - `addZoomDependentStyling(map: MapboxMap)`
   - These will be implemented in the next step (Map Interaction & UX Enhancements).

5. **Ensure imports and TypeScript types are cleanly resolved** across modules.

---

### 🎯 End Goal
- Keep `MapView.tsx` under ~200/300 lines.
- Each helper file focuses on **one responsibility**.
- Everything compiles and runs as before.
- Ready for the next Cursor task: implementing hover, click, and zoom interactions.

---

Please proceed with the full modularization refactor following this structure and maintain clear import paths.
