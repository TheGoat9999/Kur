# SOL DORADO

SOL DORADO is a persistent browser/mobile urban RPG. It is an independent game, not a FiveM, GTA, QBCore or Qbox mod.

This repository is the production MVP implementation. React/Node/PostgreSQL code is the runtime source of truth. Historical standalone HTML prototypes were retired from the active tree on 2026-08-24; their names and recovery point are indexed in `docs/historical-prototypes.md` and the files remain available through Git history.

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
docs                  Architecture, conventions and asset provenance
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

## Canonical branch and development workflow

`main` is the only canonical source of truth for SOL DORADO.

Every new task starts from the latest `main` on a short-lived feature branch:

```text
main
  ↓
codex/<feature-name>
  ↓
Pull Request to main
  ↓
CI
  ↓
merge to main
  ↓
retire the feature branch
```

Do not start new work from an old feature branch, an old PR head, `codex/browser-feature-migration`, or another chat's branch. Legacy branches are historical only even when they still exist remotely.

CI currently runs:

1. `npm ci`
2. contracts build
3. API tests
4. full application build

Previously accepted behavior is regression-protected. Conflict resolution must preserve unrelated systems rather than silently replacing them.

## Current production baseline

The current `main` includes:

- canonical desktop/mobile shell, persistent HUD and notifications
- PostgreSQL-backed identity, vitals, cash, location and needs/injury state
- region → settlement → zone → district → street hierarchy with image-backed world/street presentation
- server-authoritative walking, routes, street interactions, Hood Walk and persistent consequences
- canonical living NPCs, ambient population and deterministic relationship state
- generated directional vehicle sprites, physical parking, ownership, dealership, proximity interaction and authoritative driving
- 64-slot inventory, canonical item catalog, local item imagery and contextual storage/ground transfer
- finance accounts, ledger, loans and DoradoX holdings
- DoradoOS phone with persistent device state and core apps
- jobs/careers, Police, EMS, Justice/Corrections and Crime/Illegal Economy foundations
- Real Estate, Businesses/Companies, Hospitality/Supply Chain and Identity/Government foundations
- development Core/Admin registry and server-authoritative testing controls

## Repository hygiene

- Runtime assets must have a live code reference or a clear provenance/documentation purpose.
- Experimental assets and superseded implementations should not remain in the active tree after a production replacement lands.
- Stale PRs must be closed rather than left as accidental merge candidates.
- Historical prototypes belong in Git history, not beside production runtime code.
- New versioned CSS/files should replace or consolidate older versions instead of accumulating indefinitely when behavior is equivalent.
