# Vehicles v0.1 implementation

This slice turns the accepted vehicle prototype mechanics into persistent production systems.

## Implemented

- Multiple owned vehicles with one active vehicle.
- Persistent physical parking by canonical street segment.
- Fuel, engine, body, tire and mileage state.
- Enter, exit, lock, unlock and active-vehicle selection with server-side location checks.
- Dorado Motors as a physical `world_parcels` service at Cypress Corner in Las Palmas West.
- Persistent dealership stock with fictional SOL DORADO vehicle models.
- Cash purchase transaction with finance-ledger entry.
- Purchased vehicles remain at dealership parking instead of following the player.
- My Vehicles browser UI and physically gated dealership UI.
- District-map dealership selection and a distinct dealership marker.

## Intentionally deferred

- Vehicle-specific trunk containers.
- Drive travel mode, route wear and fuel consumption.
- Gas station/refueling gameplay.
- Repair/body/tire services.
- Street-scene rendering for parked/occupied vehicles.
- Test drives, financing and dealership stock refresh.

The standalone vehicle prototype remains a product reference for these later slices, not a visual implementation source.
