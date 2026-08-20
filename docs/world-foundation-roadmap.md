# SOL DORADO world foundation roadmap

This is the canonical implementation order for the world foundation. Do not skip ahead by building one-off movement, vehicle, NPC or map systems that would later need replacement.

## Phase 1 — World v0.3: World Structure

Goal: make the entire geography one canonical backend-owned model rather than duplicated map/street configuration.

Deliverables:
- Region → Settlement → Zone → District → Street → Street Segment → Parcel/Site hierarchy.
- PostgreSQL tables for the hierarchy, street connections, parcels and service anchors.
- The existing Market Block 3, Cypress Corner and Mira Alley become canonical street segments in this hierarchy.
- Sparse structural coverage for the wider SOL DORADO region: main city, desert town, coastal town and village, with authored zones/district skeletons.
- World API returning the hierarchy and the player's current canonical path.
- Interactive drill-down map: Region → Settlement → Zone → District → Street.
- World map is navigation/inspection only in this phase; it must not teleport the player.
- Institutional placement begins at district/zone level instead of repeating police, EMS, taxi or mechanic content on every street.

Exit criteria: the world map and street scene both refer to the same persistent world entities and stable IDs.

## Phase 2 — Street v0.3: Navigation

Goal: replace direct free-form X/Y movement with authored route navigation that can later share infrastructure with vehicles.

Deliverables:
- Pedestrian navigation graph: sidewalk nodes/edges, crossings, entrance nodes, street-exit nodes and walkable areas.
- Route calculation between player position and destination anchors.
- Obstacle-aware movement rather than straight-line movement through props/buildings/cars.
- Improved movement cursor with walkable/unwalkable states, destination pulse and temporary route preview.
- Persistent player position remains server-authoritative at meaningful sync points.
- Street exits connect to canonical `world_street_connections`.
- Foundation interfaces for road and transit graphs are defined here, but vehicles are not implemented yet.

Exit criteria: all walking and proximity interactions use one navigation abstraction, not ad-hoc screen coordinates.

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
