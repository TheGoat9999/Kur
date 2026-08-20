# SOL DORADO Character Creator — AI-first pipeline

## Goal

Build a browser/mobile character creator with good-looking male and female humans, deep body/face customization, modular clothing, and a content pipeline where the only intended human authoring step is writing prompts.

The attached standalone prototype is the functional reference for creator UX and MakeHuman/HM08 target behavior. Production should not fetch MakeHuman source OBJ/targets or MHCLO assets directly from public CDNs at runtime.

## Architectural decision

### Runtime

The game client consumes only versioned, game-ready assets:

- GLB/glTF character base assets
- one canonical humanoid skeleton: `sol-dorado-humanoid-v1`
- morph-target metadata for body and face controls
- modular fitted garments/hair as GLB
- optimized textures and thumbnails
- JSON asset manifests

The browser is responsible for rendering, applying morph values, equipping assets, camera controls, persistence, and gameplay integration. It is not responsible for Blender/MakeHuman asset conversion.

### Offline/worker build pipeline

Use Blender 4.2+ with MPFB2 as an automated character-asset worker. MPFB2 shares MakeHuman assets/formats and supports human creation, targets, rigging, clothing application/refit and character serialization.

Pipeline:

1. Prompt submitted for a garment/hair asset.
2. AI provider generates concept/texture and, where suitable, a 3D source mesh.
3. Worker imports the source into Blender.
4. Automated garment preparation aligns the mesh to the canonical neutral male/female reference.
5. MPFB/Blender refit and/or weight-transfer fits the garment to the canonical skeleton.
6. Automated checks run:
   - manifold/basic geometry sanity
   - transform and scale validation
   - skeleton/weight validation
   - body-intersection thresholds across a morph test matrix
   - missing texture/material detection
   - triangle and texture budgets
   - required slot metadata
7. Failed assets are rejected automatically and may trigger an AI regeneration/retry job.
8. Passing assets receive LODs, baked/optimized materials and thumbnails.
9. Export GLB.
10. Upload to object storage/CDN and publish `CharacterAssetManifest` metadata.
11. The asset appears in the game automatically without a code change.

## What “zero manual work” means

Target: zero Blender clicking, zero manual rigging, zero manual file copying, zero manual catalog registration.

A fully automated pipeline still needs machine validation. AI-generated 3D garments can produce unusable topology, clipping, bad UVs or impossible geometry. Such results should fail automatically rather than require a human artist to repair them.

The desired workflow is therefore:

`prompt -> generate -> normalize -> fit -> rig -> validate -> optimize -> publish`

with automated retry/rejection in the middle.

## Human foundation

Keep MakeHuman/MPFB as the parametric human foundation for MVP because:

- male/female macro foundations already exist;
- body and face targets are deterministic and reproducible;
- the ecosystem supports clothing/refit semantics;
- the system assets are compatible across MakeHuman and MPFB;
- the prototype already proves direct target-based deformation in-browser.

Do not expose the raw HM08 implementation as a permanent public API. SOL DORADO owns a versioned character recipe and maps it to the current underlying implementation.

Example:

```ts
{
  schemaVersion: 1,
  sex: "female",
  height: 14,
  weight: -7,
  muscle: 22,
  age: 31,
  bodyMorphs: { shoulders: 8, waist: -15 },
  faceMorphs: { noseWidth: -12, cheekbones: 18 },
  hairAssetId: "hair_...",
  equipped: { torsoOuter: "garment_...", feet: "garment_..." }
}
```

This recipe must remain stable even if the rendering/body backend changes later.

## Clothing slots

Initial slot model:

- head
- face
- torsoInner
- torsoOuter
- legs
- feet
- hands
- accessory

Later we can add layered masks and compatibility groups without changing the player recipe schema version prematurely.

## AI generation strategy

Do not bind the product architecture to one AI vendor. Introduce a provider interface with jobs such as:

- `generateGarment(prompt, references, constraints)`
- `generateTexture(prompt, uvTemplate, materialHints)`
- `generateThumbnail(asset)`

Provider output is always untrusted source material. Only the Blender/MPFB validation/export worker can publish a runtime asset.

This keeps Meshy/Tripo/Rodin/future providers replaceable.

## Licensing

MakeHuman bundled assets can be used as a strong baseline, but third-party repository assets may have different licenses. Every manifest must include source and license metadata. AI-generated assets should record provider, generation job, prompt and the applicable provider/output terms at generation time.

Assets without acceptable machine-readable licensing metadata must not auto-publish.

## MVP implementation sequence

### v0.1 — production recipe + viewer foundation

- typed character recipe
- male/female selection
- core appearance state
- body/face morph registry
- camera/view presets
- GLB-oriented viewer boundary
- save/load recipe

### v0.2 — appearance and modular assets

- skin and eye materials
- hair registry
- clothing slots
- equip/unequip
- compatibility rules
- clipping/masking metadata

### v0.3 — automated asset ingestion

- asset manifest API
- worker job model
- Blender headless runner
- MPFB asset/refit integration
- GLB export
- automated thumbnails
- validation report

### v0.4 — prompt-to-clothing

- AI provider adapter
- prompt job endpoint
- generation status UI for development/admin use
- retry/reject policy
- automatic manifest publication

## Immediate branch rule

Branch: `codex/character-creator`

Base: current `main` at branch creation.

Avoid depending on `codex/items` while both branches are under parallel development. Clothing can later reference inventory item IDs through a small integration PR after the item branch is merged.
