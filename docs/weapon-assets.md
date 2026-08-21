# Weapon asset provenance

This integration covers the 55 FBX entries supplied for SOL DORADO (40 firearms and 15 accessories). The filenames match the public Quaternius **Ultimate Guns Pack**. The source pack is published under CC0, including commercial use.

- Source pack: https://quaternius.com/packs/ultimategun.html
- License: CC0 1.0
- Uploaded archive SHA-256: `3bb519fbbf795915eaf5b9ecbf31b22afb2bc3d5712f1b29cb045ddcd0a2bc2f`
- Inventory image gallery: https://items.rainmad.com/
- Runtime item catalog: `apps/api/src/domain/items/quaternius-weapon-items.ts`

## Identity policy

The Quaternius meshes use generic names such as `Pistol_1` and `AssaultRifle_3`. SOL DORADO therefore does **not** claim that an FBX mesh is an exact replica of a branded firearm. Every imported item stores a `realWorldReference` with `matchType: representative`; those references provide grounded class, cartridge/action/capacity/weight context without conflating mesh identity with a real manufacturer model.

## Rainmad images

Every imported item has a local `/assets/items/<itemKey>.png` image backed by an image already synchronized from Rainmad in the canonical item-image pipeline. Variant models may share a representative category image where an exact Rainmad counterpart has not been verified. Rainmad image licensing remains `review-required`; this change does not silently upgrade that status.

## 3D runtime status

The supplied `.fbx` files are source assets, not browser runtime assets. The catalog records each source entry plus the uploaded archive hash. A future renderer-facing asset pass should derive optimized `.glb` files rather than loading FBX directly in the browser.
