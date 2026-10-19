# BLACKOUT // Developer Map Studio V1
Implemented October 19, 2026. A private Three.js map-authoring interface at `/games/blackout/dev-editor.html`, launched with **MAP STUDIO · DEV** in the BLACKOUT main menu.

## V4 — Separate, editable rectangular bomb zones
The V1–V3 editor used one circular plant radius around each bomb, which could unintentionally extend into surrounding rooms. V4 replaces circles with multiple independently editable **3D rectangular plant volumes** per Bomb A or B. The `blackout-editor-v1` JSON file format is intentionally maintained; the exported per-bomb `plantZones[]` array is an additive field.

- In **BOMB SITE PAIRS**, select A or B, then choose the box using **SELECT ZONE BOX**. Click `+ BOX` to allocate another *separate* box for the same bomb (up to 32 per bomb). Use **DELETE BOX** to remove one (at least one box must remain per bomb).
- Select a colored translucent box directly in the 3D viewport. **W** exposes X/Y/Z move handles. **R** exposes one-sided X/Z width/depth and Y-height resizing handles. The opposite edge remains fixed.
- Set exact `X`, `Y`, `Z`, `WIDTH`, `HEIGHT`, `DEPTH` values in the right inspector, or select **PLACE / MOVE BOX** and click a snapped grid position on the selected build level.
- Zones cannot overlap or touch other boxes in the active bomb-site pair, even if those boxes belong to Bomb B. The editor enforces **0.15m minimum clearance** for zones that overlap vertically. Boxes on separate floors may share X/Z locations when their vertical volumes don't intersect.
- The union of separate boxes **does not turn into one giant circle or bounding rectangle** for planting. The `canPlantAt` portable map helper checks membership in *any individual 3D volume*; gaps between them remain illegal plant positions.
- Bomb placement is independent of planting-zone placement. The **defuse interaction range** remains a separate numeric distance measured from the planted defuser, displayed next to the bomb marker.
- Existing saved V1–V3 maps with only `plantRadius` are converted into one selectable, editable rectangular box per bomb when loaded. The original `plantRadius` is retained for older consumers, but newly authored `plantZones` take precedence. Existing exported maps remain importable.
- **CHECK MAP SETUP** warns about overlapping boxes or boxes without a floor beneath them. Overlapping edits are rejected rather than silently merging the boxes. The imported portable file, not this editor itself, still needs conversion to live BLACKOUT collision and bomb logic before multiplayer use.

**V4 editor assets:** `blackout-editor-v4` cache tag. For existing drafts, refresh with Ctrl+Shift+R before testing.

---

## V3 geometry fix — user-reported screenshot corrections (October 19, 2026)
The prior V2 editor still allowed mismatched modular wall dimensions, centered scaling and an actual default floor-thickness mismatch. On a 1m grid, 3.1m walls and 2.5m doorframes placed by their centre could never line up cleanly.

- **One-sided edge resize**: Press R, select a floor/wall, and drag one colored cube at its **outer edge**. The opposite edge stays physically stationary. Floors have four perimeter handles; walls have length/height handles. W retains X/Y/Z movement arrows.
- **Accurate physical-grid snap**: New hard/soft/reinforced wall modules are 4m wide × 3.75m high × .25m deep; door/window modules are 2m wide; floor slabs are .25m thick. Construction grid lines align to actual module **edges**, not the centre points. Even a 3m-wide custom wall aligns its ends to integers by positioning the centre at .5m. Moving objects uses these same physical-edge rules, not Three.js center-snapping. Hold Shift to bypass; turn grid OFF for entirely free positions.
- **Floor/first-storey contact**: 0m walls end at 3.75m. The top of an upper floor at 4m has a 0.25m slab underside at 3.75m, so there is no structural gap. For custom heights, newly placed walls below an existing upper floor adopt its underside as top.
- **Repair an existing draft**: Use **ALIGN EXISTING WALLS & FLOORS** in the left pane. This is optional and requires confirmation. It rounds legacy dimensions and positions into compatible grid-sized modules, updates default 28cm floors to 25cm and fits walls to upper slabs. The whole action is in Undo history. It preserves component IDs, site pairs, bomb settings, and saved imports. Consider exporting a backup before repair if your map is important.
- **Anchored floor presets**: 6×6, 10×10, 20×20, 30×30 and +/- controls expand from one fixed corner, not their centre. For a different side, use the appropriate edge handle.
- **Better visuals**: Drawing grid lines slightly below floor top avoids the illusion of an open gridded floor when a solid slab is present.
- **Precision:** 3.75m tall walls remain 3.75m if only moved. Resizing floor width won't unexpectedly round slab thickness from .25m to zero; wall Y resizing increments in quarter metres.
- **Export compatibility:** The `blackout-editor-v1` JSON file format remains unchanged. Editor asset imports use `blackout-editor-v3` to force refreshed browser modules.

V3 automated checks include one-sided anchored ±X/±Z resize, rotated module alignment, wall top meeting the upstairs slab underside, old-map repair preservation, and control wiring. Real browser interaction still requires testing on the developer's device.

---
## V2 editor movement / snapping / floor overhaul — October 19, 2026
The original builder could only move objects along a horizontal mouse-plane, floor sizes were hard to edit, grid snapping was always forced, and the standalone ceiling tool duplicated what an upper floor already supplies. These are fixed in V2.

### Editing controls
- **W / MOVE 3D:** Select a placed piece. Drag the red X, green Y or blue Z arrow to move on that axis, or drag a colored plane to move along two dimensions. Unlike V1, raising/lowering objects no longer requires typing an elevation.
- **R / SCALE:** Select a wall, stair, or floor. Drag its colored handles to resize in actual 3D. Floors can expand along X/Z independently. The floor inspector includes 6×6, 10×10, 20×20 and 30×30 metre presets, plus +/- footprint buttons.
- **Grid snap:** OFF/FREE, 0.25m, 0.5m, 1m, 2m and 4m. The visible construction grid matches the chosen spacing. **Hold Shift** temporarily for unsnapped placement or transforms, then release to restore snapping.
- **Magnetic edge alignment:** Optional toggle aligns adjoining soft/hard/reinforced wall ends and neighboring slab edges even if the module dimensions (e.g. 3.1m vs 4m) don't land on whole-metre centres. Shift temporarily bypasses this.
- **Fly Camera:** Toggle FLY CAMERA and navigate with WASD, Space up, C down, Shift fast; right-drag changes view direction. Turn it off to use W to switch to the piece-move tool again. The original middle-drag pan, orbit and zoom still work.
- **Ceilings:** Every FLOOR is already a solid slab. Its top is the walking surface; its underside is the ceiling for the room below, with a darker underside material. Separate ceiling placement was removed. Old ceiling pieces in already-saved V1 maps still load; the selected floor inspector has a cleanup action to remove obsolete duplicate ceilings (requires confirmation and supports undo).
- **Precise geometry:** Moving pieces does not round their thickness/size. Scaling preserves their Y placement and unaffected dimensions. Slab thickness stays .25m unless deliberately changed. X/Y/Z values and dimensions can still be entered directly, and transforms retain undo/redo history.
- **Compatibility:** Export remains `blackout-editor-v1` JSON, so previously authored builds do not need conversion. Maps exported with grid 0 retain that setting on import.

### Testing
`node --test games/blackout/tests/*.test.mjs` covers free/grid snapping (including negative coordinates), moving between floors, scaling floor footprints without moving their surface or shrinking slab thickness, magnetic wall seams, and transform UI/controls. Live browser acceptance for gizmo dragging and fly camera is still needed.

---

## Owner-only access
GAMESHUB Cloudflare Pages `functions/_middleware.js` already verifies valid `gh_access` and independent, authenticated `gh_session` against the D1 users/sessions tables for ALL paths under `/games/blackout/`, including this editor and its JavaScript/CSS. Requests by non-owner accounts get HTTP 403. This is real server-side authorization, **not** an unsecured hidden button or client-only access flag. Editing does not publish files to GitHub or give the browser repository credentials.

## Build a map
1. Open BLACKOUT while signed in to its developer account and select **MAP STUDIO · DEV** in the top navigation.
2. Choose **Floor** and place a ground slab. For new floors, set the ACTIVE BUILD HEIGHT to 4m, 8m or a custom height and place another slab. The grid moves to that build height.
3. Select a piece from the left palette, then left-click a 3D grid point to create it. The transparent ghost preview shows its size and placement before clicking. Q/E rotates the current piece or upcoming preview in 90-degree increments.
4. Place structural **hard walls**, **soft walls** that can be reinforced/breached, **reinforced steel**, **staircases**, **ceiling slabs**, **barricadable door frames**, **windows**, **railings**, **crates** and attacker/defender spawn markers. Each piece has editable exact X/Y/Z, width, height/ascend, depth/run and angle in the right inspector.
5. When placing a door/window aligned on an existing wall, the editor automatically splits the solid wall into actual separate segments, leaving a true opening. It does not just stick window glass onto an unbroken wall. Orient the opening the same way as the wall. Frames placed separately remain independent pieces.
6. Left-click an existing item to select, then drag to move it on its floor. Right-click drag rotates the free 3D orbit camera, middle-drag pans and wheel zooms. **TOP** switches to overhead; **3D** returns to a perspective view; **FOCUS** centers on selected item. Undo/redo, duplicate and delete are supported.
7. Under BOMB SITE PAIRS, create/rename any number of configurations (up to 12). Select Bomb A or B, click **PLACE SELECTED BOMB**, and click anywhere in the map to set its exact X/Y/Z at the current height; or type all three coordinates directly.
8. Set **PLANT ZONE RADIUS** (1m–22m) and **DEFUSE INTERACTION RANGE** (.5m–12m), separately for *each* bomb in each pair. The larger colored disc indicates the plant zone and the smaller pale ring shows the allowed distance from a deployed defuser for disarming. These numeric values are exported in metres. Bomb sites may be on different floors.
9. Add **ATTACK SPAWN** and **DEFEND SPAWN** markers; keep attackers outside and behind real cover. Click **CHECK MAP SETUP** to get basic lint warnings about missing spawns/floors/stairs/walls/openings/unsupported bomb positions.
10. Select **DOWNLOAD BUILD**. The browser downloads a portable `<name>.blackout-map.json` file. Attach that JSON to the next ChatGPT message. We can inspect the precise authored layout and convert it into gameplay geometry with collisions, destructibility, bots and bomb rules.

## Saving / importing / handoff
- Every completed edit autosaves locally to the browser's `localStorage` under `BLACKOUT_DEV_MAP_DRAFT_V1`; this is not cloud storage.
- **IMPORT JSON** loads and validates another V1 file. An import replaces the active draft, but can be undone.
- The build file is plain formatted UTF-8 JSON, root `format: "blackout-editor-v1"`. Coordinates are in metres, Y is height.
- `elements[]` entries: unique `id`, `type`, `position:{x,y,z}`, `size:{x,y,z}`, `rotationY` (degrees), `name`.
- `sitePairs[]`: `{id,name,A:{x,y,z,plantRadius,defuseRange},B:{...}}`.
- `activeSitePair` indicates the current editor preview pair; all pairs are retained.
- V1 enforces numeric bounds, allowed part types, unique IDs and maximum 1200 parts and 12 pairs.
- Download a build file before clearing browser data, changing browsers, or starting a new map.

## Scope and limitations
This is a **true browser-based interactive 3D editor**, not a finished multiplayer world or a map you have to describe in text. It previews geometry and saves exact coordinates. It is intentionally a **separate developer authoring screen inside the same BLACKOUT website**; it does not override the existing playable SWITCHYARD or Mechanics Lab when you click SAVE. The exported build is a handoff for conversion/QA before it becomes a selectable gameplay map.

The live match simulator currently uses existing map definitions and a fixed defuse radius. The custom JSON’s `plantRadius` and `defuseRange` are *preserved* and ready for the game importer we implement when an authored map is supplied; the editor itself does not falsely claim to have made custom authored maps playable in matches yet. An authored map must undergo pathfinding, collision, stair-height, sightline, bomb-zone and spawn-peek checks before release. The editor's **CHECK MAP SETUP** is basic lint, not a full physics test.

## CI tests
`node --test games/blackout/tests/*.test.mjs` includes map studio schema round-trip, per-bomb defuse/plant radii, bad-file rejection, wall opening carving, developer authorization, and original BLACKOUT regressions. Live browser rendering and editing ergonomics still benefit from developer testing.
