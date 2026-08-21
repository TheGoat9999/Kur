# SOL DORADO world foundation roadmap

This is the canonical implementation order for the world foundation. Do not skip ahead by building one-off movement, vehicle, NPC or map systems that would later need replacement.

## Phase 1 — World v0.3: World Structure + Atlas

Goal: make the entire geography one canonical backend-owned model and present it as a credible world map rather than a diagram/dashboard.

Deliverables:
- Region → Settlement → Zone → District → Street → Street Segment → Parcel/Site hierarchy.
- PostgreSQL tables for the hierarchy, street connections, parcels and service anchors.
- The existing Market Block 3, Cypress Corner and Mira Alley become canonical street segments in this hierarchy.
- Sparse structural coverage for the wider SOL DORADO region: main city, desert town, coastal town and village, with authored zones/district skeletons.
- World API returning the hierarchy and the player's current canonical path.
- Atlas-style drill-down map: Region → Settlement → Zone → District.
- Region view must show credible geography: coastline/water, relief/mountains, vegetation/forest, fields/agriculture, desert/dry terrain, rivers and major routes where appropriate.
- Settlement/zone/district boundaries must be authored as non-overlapping geographic geometry, not independent placeholder polygons.
- District view keeps the street network visible; selecting a segment never opens a meaningless isolated-line view.
- Selecting the current playable segment exposes **Open street**.
- Selecting another directly connected playable segment exposes server-authoritative **Travel here**. This is only the minimal map-to-street walking transition; full route navigation remains Phase 2.
- Planned/unplayable streets remain inspectable but clearly disabled for travel.
- Institutional placement begins at district/zone level instead of repeating police, EMS, taxi or mechanic content on every street.
- Desktop and mobile atlas must fit the available viewport without requiring page-length scrolling.

Quality gate before Phase 2:
- The atlas must visually read as an actual fictional region/city map, not graph paper, overlapping polygons or giant labels.
- No sibling settlement, zone or district boundaries may visually overlap unless a future feature explicitly models an overlay layer.
- Player location, selected geography and travel/open actions must be immediately understandable.
- Do not proceed to Street v0.3 until this atlas is manually accepted.

Exit criteria: the atlas and street scene refer to the same persistent world entities and stable IDs, and the atlas passes the visual/interaction quality gate above.

## Phase 2 — Street v0.3: Navigation

Goal: replace direct free-form X/Y movement with authored route navigation that can later share infrastructure with vehicles.

Deliverables:
- Pedestrian navigation graph: sidewalk nodes/edges, crossings, entrance nodes, street-exit nodes and walkable areas.
- Route calculation between player position and destination anchors.
- Obstacle-aware movement rather than straight-line movement through props/buildings/cars.
- Improved movement cursor with walkable/unwalkable states, destination pulse and temporary route preview.
- Every visible canonical street/segment in district navigation view remains hoverable/focusable on desktop and tappable on touch devices; street hit areas must be generous while decorative terrain, parcels, labels and detail layers must never intercept street pointer events.
- Street hover/focus must clearly identify the street without permanently cluttering the map with labels.
- Persistent player position remains server-authoritative at meaningful sync points.
- Street exits connect to canonical `world_street_connections`.
- Foundation interfaces for road and transit graphs are defined here, but vehicles are not implemented yet.

Exit criteria: all walking and proximity interactions use one navigation abstraction, not ad-hoc screen coordinates, and all rendered street segments remain reliably discoverable/interactable regardless of decorative map detail.

## Phase 3 — World Visual v0.4

Goal: make the world population and vehicles visually credible without creating separate rendering systems for every feature.

Deliverables:
- Reusable world-character renderer driven by the same character recipe/identity as Character Creator.
- Player, named NPC and ambient NPC all use the same base renderer.
- Directional idle/walk states and better character proportions.
- Seeded ambient NPC variation and authored/dynamic spawn slots.
- Reusable world-vehicle renderer with sedan, hatchback, coupe, SUV, pickup, van and truck silhouettes plus taxi/police/EMS/delivery variants.
- Better parked vehicles, basic pedestrian movement and basic traffic presentation.
- Scenery, contextual object, local destination and major institution POI tiers remain visually distinct.

Current implementation pass:
- The player street avatar is rendered from the active Character Recipe instead of the primitive circle/stick marker.
- Character profile and street avatar now share the same reusable world-character renderer.
- Named NPCs and deterministic ambient NPCs use the same renderer with authored population slots.
- Ambient pedestrians can move along authored visual sidewalk paths without becoming POIs or blocking street interaction.
- Reusable vehicle silhouettes and service variants exist; current scenes include parked civilian vehicles, delivery traffic and occasional taxi traffic without duplicating scarce institutional services.
- The population layer is visual-only and `pointer-events: none`; navigation, POIs and authoritative gameplay remain unobstructed.

Quality gate before Phase 4:
- Player, NPCs and vehicles must be visually readable at desktop and mobile street scale and must not resemble primitive placeholder circles/rectangles.
- Ambient population must make streets feel occupied without converting every person or vehicle into an interaction target.
- Character movement, POI hit areas, street hover/click behaviour and contextual interaction UI must remain unobstructed by the visual population layer.
- Vehicle and NPC density should vary by street archetype rather than appearing uniformly on every street.
- Do not proceed to Mobility v0.1 until the World Visual pass is manually accepted.

Exit criteria: player/NPC/vehicle representations are reusable game-world entities rather than primitive decorative shapes.

## Phase 4 — Mobility v0.1

Goal: one travel system for walking, private vehicles, taxi and public transport.

Core abstraction:
`origin + destination + mode + route + duration + cost + constraints`.

Navigation layers:
- pedestrian graph;
- road/lane graph;
- transit graph.

Modes:
- walking: slow, free, energy/hydration consequences;
- private vehicle: road route, parking/access, later fuel/condition;
- taxi: request → pickup node → road route → drop-off → fare;
- bus/public transport: walk to stop → wait → transit route → alight → walk.

Exit criteria: vehicle/taxi/bus travel consumes the same canonical world graph instead of implementing separate fake travel timers.

## Non-negotiable conventions

- PostgreSQL owns persistent world/player state. Redis is only temporary state such as cooldowns/session/presence.
- World map and street scene are different views of the same geography.
- Dense streets contain many visible objects but usually only 0–2 major POIs.
- Institutions are scarce coverage anchors, not street-template decorations.
- Property ownership, business ownership and district control remain separate.
- No map view may become a dashboard/card catalogue. Geography and connections are the primary visual language.
- New work must preserve HUD, Inventory, Finance, Character, sidebar and current street gameplay regressions unless deliberately replaced by this roadmap.
