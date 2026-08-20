# SOL DORADO world and street convention

This document is the canonical composition rule for the playable world. It exists to prevent the world from degrading into a dashboard, a POI catalogue, or a set of unrelated oversized scene elements.

## 1. World hierarchy

SOL DORADO is the world/region layer. It is comparable to the full landmass/world map in an open-world game.

The hierarchy is:

1. **Region / World** — SOL DORADO.
2. **Settlement** — the main city, desert town, northern/coastal town, villages and future settlements.
3. **Zone** — a non-ownable macro land-use layer such as Downtown, Industrial, Harbor, Beach, Hills, Airport or Las Palmas.
4. **District** — the local control/economy layer. Districts can be contested or controlled and contain several connected streets.
5. **Street segment** — one playable block, intersection, service lane, road edge or short connected street scene.
6. **Parcel / site** — the smallest persistent real-estate footprint: building, lot, park, garage, civic site, commercial unit or industrial yard.
7. **Scene object** — entrance, bench, tree, hydrant, dumpster, parked vehicle, NPC, service door, vending machine, mailbox, streetlight, etc.

A district should normally contain roughly **8–12 street segments**. A zone should normally contain **3–7 districts**. Those are content targets, not hard database limits.

## 2. A street is not a POI list

Every street must contain a mix of visual and gameplay objects. Most visible things are not POIs.

Object classes:

- **Ambient geometry** — roads, sidewalks, curbs, crossings, parking bays, walls, fences, planters and building massing. Never shown with POI icons.
- **Ambient props** — benches, lamps, trees, hydrants, bins, utility boxes, signs, parked vehicles and street furniture. Usually non-interactive.
- **Ambient interactables** — a dumpster, vending machine, pay phone, loose package, drain, alley door, newspaper box, ATM, etc. Interaction can be random or conditional, but they are not major POIs.
- **Local businesses / residences** — ordinary shops, restaurants, apartments, garages and offices. Some can expose actions, many are only world texture.
- **Anchor POIs** — important destinations that justify persistent recognition: a major venue, named business, transit hub, landmark or unusual service.
- **Institutions** — police, EMS, fire, hospital, courthouse, city hall, major public services. These are scarce regional/zone/district anchors, not repeated street content.
- **NPCs** — ambient NPCs, contextual NPCs and named NPCs. Named or mission-relevant NPCs must not be permanently distributed on every street.
- **Dynamic findings/events** — server-selected temporary content placed into authored spawn slots.
- **Exits / connections** — street-to-street travel anchors. They represent actual connected geometry, not arbitrary menu buttons.

## 3. Density targets per street segment

A normal mixed-use street segment should target:

- **6–14 parcels/sites** represented visually, including background/non-interactive frontage;
- **0–2 anchor POIs** in a normal case, with **3 as a hard visual maximum** except for intentionally dense destination streets;
- **2–6 contextual/ambient interactables**;
- **8–24 ambient props**;
- **0–3 ambient NPC presences**;
- normally **0–1 named/contextual NPC**, unless a temporary event explicitly adds more;
- **2–4 street connections** depending on topology.

Residential and suburban streets can have zero anchor POIs. Industrial/service streets can have many service objects but few public POIs. Some streets should deliberately be quiet.

## 4. Institutional coverage

Institutions are placed by coverage need and land use, not by street template.

Initial balancing targets:

- **Police precinct:** roughly 1 per 2–4 districts, with a major headquarters only at city scale.
- **EMS station:** roughly 1 per 3–5 districts. A hospital is a larger settlement/zone anchor, not a repeated EMS icon.
- **Fire station:** roughly 1 per 2–4 districts depending on density and industrial risk.
- **Mechanic businesses:** normally 1–3 per suitable district, concentrated in commercial/industrial corridors. Small repair shops can exist as ordinary businesses.
- **Taxi depot:** roughly 1 per 1–2 zones. Taxi stands/pickup points can be more common because they are not depots.
- **Government/courthouse/city hall:** unique or near-unique settlement anchors.
- **Major transit hubs:** zone or settlement anchors; local stops are ambient infrastructure.

Coverage values are tuning defaults and should become data-driven later.

## 5. Player-property constraints

Property ownership, business ownership and district control remain separate systems.

To avoid dead streets and monopoly gameplay:

- only **25–40% of developable parcels** in a typical district should be player-purchasable at one time;
- civic, utility, road, transit and park parcels are **0% player-ownable** unless a future system explicitly changes the rule;
- keep at least **40% of visible frontage** under NPC/public/system control so the world continues to function without player owners;
- one player/organization should normally control no more than **2 property parcels on the same street segment**;
- one player/organization should normally control no more than **15% of developable property parcels in one district** without an explicit late-game exception;
- a business can lease an NPC-owned or another-player-owned property, so business density is not equal to property-sale density.

These are economy safeguards, not final balance constants. They should become backend configuration when real-estate migration reaches the world model.

## 6. Street generation/composition pattern

Every authored or generated street segment follows the same order:

1. Select the **street archetype** from zone/district land use: residential, mixed-use, commercial, nightlife, industrial, civic, beachfront, hillside, service/alley, highway edge, etc.
2. Reserve **road, sidewalk and crossing geometry** first.
3. Lay out **parcels/sites** with realistic frontage and access points.
4. Place scarce **district/zone anchors** only when the world plan assigns them to that parcel.
5. Place ordinary businesses/residences and background facades.
6. Add ambient street furniture using deterministic density rules.
7. Add authored **interaction anchors** to physical objects/entrances, never to arbitrary screen coordinates.
8. Define **NPC/event spawn slots** separately from permanent POIs.
9. Connect exits to actual neighboring street segments.
10. Validate scale, click targets, mobile readability and overlap.

The deterministic scene seed should ultimately be based on stable world identifiers so refreshing the browser does not randomly rearrange the street.

## 7. Visual rules

- The street itself must occupy the overwhelming majority of the scene.
- Street naming uses a **small breadcrumb/location plate**, not a giant hero headline.
- Buildings must read as buildings; parks, parking, sidewalks and service spaces must have distinct materials/shapes.
- A dumpster, bench or NPC must be approximately believable relative to the street and building scale.
- POI markers are attached to the relevant entrance/building footprint.
- The full logical object hit area should be clickable/tappable; the player must not have to hit a tiny icon pixel.
- Anchor POIs may keep visible labels. Contextual objects should reveal stronger labels on hover/focus/selection.
- Ambient props receive no permanent POI icon.
- Mission/event indicators appear only while relevant.
- The player marker should read as a human/avatar marker, not a generic glowing circle.
- Selection feedback should outline/highlight the actual object footprint.
- Contextual interaction UI stays outside the main scene on wide screens and becomes a readable lower panel on narrow/mobile screens.

## 8. Backend authority

The renderer is presentation only. PostgreSQL remains authoritative for persistent world/player state. Redis remains temporary cooldown/session infrastructure only.

Dynamic findings, action availability, ownership, persistent consequences and rewards must continue to come from backend state/contracts. The client may render ambient non-authoritative scenery, but it must never invent a gameplay reward or persistent ownership state.
