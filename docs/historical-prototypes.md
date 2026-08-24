# Historical standalone prototypes

The standalone HTML prototypes were retired from the active repository tree during the 2026-08-24 repository-hygiene pass. Production React/Node/PostgreSQL code is the only runtime source of truth.

The files remain available in Git history at `main` commit `8effad3c5a6ead64f828825bc364ea0510cf7cbb` and earlier.

Retired prototype files:

- `prototypes/police04.html`
- `prototypes/sol_dorado_character_creator_v132.html`
- `prototypes/sol_dorado_finance_v011.html`
- `prototypes/sol_dorado_game_roadmap_mvp.html`
- `prototypes/sol_dorado_hospitality_v021_map_v05.html`
- `prototypes/sol_dorado_hud_v02.html`
- `prototypes/sol_dorado_inventory_v02.html`
- `prototypes/sol_dorado_jobs_v051.html`
- `prototypes/sol_dorado_real_estate_v0_3_property_management.html`
- `prototypes/sol_dorado_v0_19_visual_refresh.html`
- `prototypes/sol_dorado_vehicles_v0_5_1_stable_ownership.html`

Do not restore these files as runtime code. If an old UX/mechanic needs to be consulted, inspect that historical commit and port the product requirement into the current bounded-context architecture.