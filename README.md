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
prototypes            Accepted standalone HTML references
docs                  Architecture and prototype migration map
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

`main` is the canonical source of truth for SOL DORADO.

New work must use a short-lived feature branch created from the latest `main`:

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
delete/retire feature branch
```

Before opening or merging a PR, sync the feature branch with the latest `main`. Do not use an old feature branch as the base for new work.

CI is the minimum merge gate and currently runs:

1. `npm ci`
2. contracts build
3. API tests
4. full application build

Previously accepted functionality is regression-protected. Feature work should not silently rewrite unrelated systems while resolving merge conflicts.

`codex/browser-feature-migration` is retained temporarily as a compatibility branch for already-running ChatGPT workstreams. It is kept aligned with `main`; new work should branch from `main` instead.

Active experimental branches, especially character work, must be reconciled against the latest `main` before merge rather than merging an old branch history wholesale.

## Current MVP integration baseline

The current `main` baseline includes:

- canonical SOL DORADO desktop/mobile shell and HUD
- Redis-backed development session and presence
- PostgreSQL-backed character identity, vitals, cash and location
- 2.5D Las Palmas world/street navigation with server-authoritative movement
- contextual POI actions, legal work, petty crime, salvage and persistent consequences
- PostgreSQL-backed physical inventory containers and item instances
- 200-item catalog with local item imagery
- 64-slot / 20 kg player inventory modal over the world, with drag/drop, split, ground transfer and consumable actions
- PostgreSQL-backed finance accounts, loans, holdings and unified transaction ledger
- DoradoOS phone foundation with persisted device state, messages, contacts, notifications, tasks and notes
- vehicle ownership, dealership, physical vehicle location, proximity interaction, map integration and authoritative driving
- idempotent action requests and persistent action log
- bootstrap endpoint returning one authoritative player snapshot

Character rendering/creator refinement is still an active isolated workstream and must be integrated only after it is synchronized with the current `main` baseline.
