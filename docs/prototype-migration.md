# Prototype migration map

| Prototype | Production destination | Status |
| --- | --- | --- |
| HUD v0.2 | `apps/web` shell + HUD components | Desktop browser shell migration active |
| Character creator v1.3.2 | Character recipe contract + later Three.js feature module | Contract merged; renderer pending |
| Main world v0.19 | World screen and action API | One-district replacement started |
| Inventory v0.2 | Inventory tables, commands and React feature | Core end-to-end slice implemented; world access integration active |
| Finance v0.1.1 | Ledger/accounts service and React feature | Next after inventory |
| Vehicles v0.5.1 | Vehicle ownership/travel module | Pending vertical-slice need |
| Real estate v0.3 | Property/tenancy module | Pending apartment slice |
| Police | Evidence/heat/dispatch modules | Heat started; evidence pending |
| Jobs v0.5.1 | Work contracts/proficiency module | One legal action started |
| Hospitality v0.2.1 | First business vertical | Pending core economy |

The standalone HTML files are reference material, not runtime dependencies. Features are ported through shared contracts and authoritative commands, not pasted into React components.
