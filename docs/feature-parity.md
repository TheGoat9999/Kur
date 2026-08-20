# SOL DORADO feature parity register

The standalone prototypes are product specifications. A production feature is complete only when its state is persisted, its rules are enforced by the API, and its browser interactions are available in React. A navigation link or static mockup does not count as implementation.

Mobile-specific work is deferred until the desktop browser game is functionally complete.

| System | Regression-protected prototype functionality | Production status |
| --- | --- | --- |
| Shell and HUD | Desktop sidebar, sticky location context, one canonical HUD for Health, Energy, Satiety, Hydration, Stress, contextual Police Heat and Cash | Browser shell v2 in progress |
| World | Contextual district screen; see → interact → choice → consequence → state change → feedback; world hierarchy from settlement to street segment and physical access | One district and three server actions live |
| Character | MakeHuman HM08 male/female base, live Three.js preview, body/appearance/face/grooming controls, camera, diagnostics and saved character recipe | Recipe persisted; renderer and controls pending |
| Inventory | Item instances in physical slot containers, capacity/weight, drag/drop, inspect, use, drop, external access based on current world/property/vehicle context | Core PostgreSQL/API/React slice in progress |
| Finance | Branch/ATM/phone access, cash/checking/savings, internal and recipient transfers, ledger, limits, credit score, loans, DoradoX exchange and fictional crypto assets | Pending after inventory |
| Vehicles | Multiple persistent owned vehicles, active selection, parking location, fuel, condition, mileage, trunk, repair/refuel, dealership and travel choices with consequences | Pending |
| Real estate | Properties, listings, agents/brokers, purchase/rent, tenants, storage, parking and access; property ownership separate from business ownership | Pending |
| Jobs and careers | Opportunity-based offers, shifts, qualifications, career/job/skill XP, reliability, employer trust, responsibility tiers and history | Pending |
| Police | Civilian/police knowledge separation, heat vs evidence/intelligence/wanted/recognition, NPC response, legal grounds, encounters, pursuit, visual loss, LKP and search areas | Heat exists; full system pending |
| Hospitality | Suppliers, ingredient ordering, slot storage, recipes, preparation timers, prepared products, menu, demand, reputation, staff, certifications and venue operation | Pending |

## Delivery order

1. Browser shell, HUD and stable feature navigation.
2. Inventory end-to-end, because world actions and later systems produce physical items.
3. Finance end-to-end, because every career, business, property and vehicle system consumes ledger operations.
4. Vehicles and physical travel/access.
5. Character creator renderer and saved recipe editor.
6. Real estate, jobs, hospitality and police as connected vertical slices.
7. Desktop browser integration and regression pass.
8. Mobile adaptation only after browser parity.
