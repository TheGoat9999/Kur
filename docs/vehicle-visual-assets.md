# SOL DORADO vehicle visual assets

All car rendering now uses one generated directional sprite family. The previous Meshy GLB car, FBX-derived raster/SVG traffic cars, Kenney car sprite, Wikimedia prototype photos and the Market Street van sprite have been removed from the vehicle rendering path.

## Generated vehicle runtime

The source is the user-provided multi-angle blue coupe sprite sheet. Runtime assets live under `apps/web/public/assets/vehicles/generated/` as transparent WebP frames.

Five canonical frames are stored:

- north
- north-east
- east
- south-east
- south

The three opposite diagonal/horizontal directions are resolved without duplicate image files:

- north-west mirrors north-east
- west mirrors east
- south-west mirrors south-east

`GeneratedVehicleSprite` is the single directional resolver. It exposes all eight directions and owns mirroring, asset URLs and cache versioning.

## Integration points

`WorldVehicle` retains vehicle type and service as gameplay semantics, but currently every traffic/service type intentionally uses the same `generated-coupe-v1` visual family. Adding more generated vehicle families later must not require changing vehicle gameplay data.

`VehicleArtwork` uses the same generated sprite family in dealership/ownership UI. It no longer loads external vehicle photographs and there is no special 3D/Meshy path for `Veloce Sprint`.

Market Street image-backed traffic also renders through `GeneratedVehicleSprite`; the old standalone van crop is no longer used.

## Why this architecture

Generated art is treated as an asset layer, not as gameplay authority. Direction, vehicle ownership, service, collision, interaction and movement remain runtime data. This makes visual families replaceable without rewriting vehicle systems.

The same pattern can extend to NPCs with `direction + pose/action + animation frame` manifests. Buildings should use a related asset registry, but not an actor-direction model: building assets need authored facade/angle/state variants plus footprint, entrance and foreground-occlusion metadata.
