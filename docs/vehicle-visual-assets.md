# SOL DORADO vehicle visual assets

Vehicle visuals are split by purpose. Dealership / My Vehicles currently use photographic prototype stand-ins, while the live 2.5D street world uses lightweight top-down derivatives of the project FBX vehicle meshes.

## Dealership / ownership UI sources

- `Bravura Compact S` visual: **Red Smart Car Side View Driveway.jpg**, TudorTulok, Wikimedia Commons, CC0 1.0.
  - https://commons.wikimedia.org/wiki/File:Red_Smart_Car_Side_View_Driveway.jpg
- `Aurelia R7` visual: **2013 Lada Granta 219010 white side.jpg**, Throwawayacc222, Wikimedia Commons, CC0 1.0.
  - https://commons.wikimedia.org/wiki/File:2013_Lada_Granta_219010_white_side.jpg
- `Mesa Trail 150` visual: **Fargo pickup side view.jpg**, Trekphiler, Wikimedia Commons, CC BY-SA 4.0.
  - https://commons.wikimedia.org/wiki/File:Fargo_pickup_side_view.jpg
  - License: https://creativecommons.org/licenses/by-sa/4.0/
- `Veloce Sprint` visual: **Silver Ferrari Luxury Sports Car.jpg**, Werner Bayer, Wikimedia Commons, CC0 1.0.
  - https://commons.wikimedia.org/wiki/File:Silver_Ferrari_Luxury_Sports_Car.jpg

These source photographs do not define the fictional in-game manufacturer, model, lore, or specifications. They are visual references only.

## World traffic: FBX-derived vehicle assets

The street world no longer relies on one generic drawn/recolored car for ambient traffic. The user-supplied archive `FBX-20260821T140748Z-1-001.zip` contains seven vehicle meshes:

- `NormalCar1.fbx`
- `NormalCar2.fbx`
- `SportsCar.fbx`
- `SportsCar2.fbx`
- `SUV.fbx`
- `Taxi.fbx`
- `Cop.fbx`

For the 2.5D browser/mobile world, these source meshes are projected from above using their FBX geometry and embedded material colors. The projection is simplified into compact transparent SVG runtime assets under `apps/web/public/assets/vehicles/fbx-derived/`.

The source FBX files are intentionally not loaded for every ambient street car. That would create unnecessary WebGL/model-loader cost for traffic that is displayed at small top-down scale. The same source assets can still be converted to GLB later for contexts where genuine interactive 3D adds value, such as a vehicle inspection/customization view.

`manifest.json` in the runtime asset directory records the source filename and SHA-256 for every derivative. The archive was supplied for this project; its license/ownership was not independently verified by the implementation pipeline and should be confirmed before public/commercial distribution.

## Street lane placement

Moving traffic uses the authored road geometry instead of per-car approximate Y offsets:

- eastbound lane center: `50.15%`
- westbound lane center: `58.15%`

Those values correspond to the lane-direction arrows in the current `StreetBackdrop` road. Runtime car height is constrained to a one-lane envelope so a car does not visually occupy both travel lanes. Parked vehicles retain their authored parking positions.
