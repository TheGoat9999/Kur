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
- One playable Las Palmas district screen
- Server-authoritative walking, legal shift and petty-crime actions
- Idempotent action requests and persistent action log
- Bootstrap endpoint returning one authoritative player snapshot
- PostgreSQL-backed physical inventory containers and item instances
- Desktop slot inventory with weight, capacity, drag/drop, move and consumable actions

The active merge step is inventory world-access integration, followed by finance, because world actions and later careers, vehicles and businesses need shared item and ledger foundations.
