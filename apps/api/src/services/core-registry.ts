import { CoreRegistrySchema, type CoreRegistry } from '@sol-dorado/contracts/admin';
import type { Database } from '../db.js';
import { CORE_ITEM_CATALOG, CORE_JOBS, CORE_PERMISSION_KEYS, CORE_ROLE_KEYS } from '../domain/core-registry.js';

export async function getCoreRegistry(db: Database): Promise<CoreRegistry> {
  const result = await db.query(`
    SELECT id,brand,model,display_name,year,vehicle_class
    FROM vehicle_models
    ORDER BY brand,model,year,id
  `);

  return CoreRegistrySchema.parse({
    version: 1,
    items: CORE_ITEM_CATALOG,
    jobs: CORE_JOBS,
    vehicles: result.rows.map(row => ({
      id: String(row.id),
      brand: String(row.brand),
      model: String(row.model),
      displayName: String(row.display_name),
      year: Number(row.year),
      vehicleClass: String(row.vehicle_class)
    })),
    permissionKeys: [...CORE_PERMISSION_KEYS],
    roleKeys: [...CORE_ROLE_KEYS]
  });
}
