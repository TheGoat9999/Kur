# SOL DORADO

SOL DORADO is a persistent browser/mobile urban RPG. It is an independent game, not a FiveM, GTA, QBCore or Qbox mod.

This repository is the real MVP implementation. The accepted standalone HTML prototypes are retained under `prototypes/` as product and regression references; production code lives in the workspace packages.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Node.js + Express 5
- PostgreSQL
- Redis
- npm workspaces

## Workspace

```text
apps/web              React game client
apps/api              Node.js API and database migrations
packages/contracts    Shared API schemas and game contracts
prototypes             Accepted standalone HTML references
docs                   Architecture and prototype migration map
```

## Start locally

Requirements: Node.js 24+, PostgreSQL 16+ and Redis 7+.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The web client runs at `http://localhost:5173`; the API runs at `http://localhost:3001`.

## Current vertical slice

- Canonical SOL DORADO desktop/mobile shell and HUD
- Redis-backed development session and presence
- PostgreSQL-backed character identity, vitals, cash and location
- One recognizable 2.5D Las Palmas street scene with three connected segments
- Server-authoritative walking, contextual POI actions, legal work, petty crime and physical salvage
- PostgreSQL-backed exploration and street consequences with Redis-backed interaction cooldowns
- Idempotent action requests and persistent action log
- Bootstrap endpoint returning one authoritative player snapshot
- PostgreSQL-backed physical inventory containers and item instances
- Desktop slot inventory with weight, capacity, drag/drop, move and consumable actions
- PostgreSQL-backed finance accounts, loans, holdings and unified transaction ledger
- Contextual branch, ATM and phone banking with transfers, credit and DoradoX trading
- Modern desktop interaction states with pointer, hover, pressed, focus and disabled feedback

The active merge step is browser validation of the inventory and finance foundations. Vehicles and physical travel/access follow because later careers, property and businesses consume both item and ledger systems.
