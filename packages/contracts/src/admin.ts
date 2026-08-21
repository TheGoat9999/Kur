import { z } from 'zod';
import { ItemDefinitionSchema } from './items.js';

export const CoreJobKindSchema = z.enum(['standard', 'institutional']);
export const CoreJobDefinitionSchema = z.object({
  id: z.string().min(1),
  titleBg: z.string().min(1),
  titleEn: z.string().min(1),
  kind: CoreJobKindSchema,
  category: z.string().min(1),
  source: z.enum(['jobs', 'police', 'ems', 'real_estate'])
});

export const CoreVehicleDefinitionSchema = z.object({
  id: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  displayName: z.string().min(1),
  year: z.number().int(),
  vehicleClass: z.string().min(1)
});

export const CoreRegistrySchema = z.object({
  version: z.literal(1),
  items: z.array(ItemDefinitionSchema),
  jobs: z.array(CoreJobDefinitionSchema),
  vehicles: z.array(CoreVehicleDefinitionSchema),
  permissionKeys: z.array(z.string().min(1)),
  roleKeys: z.array(z.string().min(1))
});

export const AdminRoleSchema = z.object({
  key: z.string().min(1),
  nameBg: z.string().min(1),
  nameEn: z.string().min(1),
  permissions: z.array(z.string().min(1))
});

export const AdminVehicleSchema = z.object({
  id: z.uuid(),
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  active: z.boolean()
});

export const AdminJobStateSchema = z.object({
  jobId: z.string().min(1),
  enabled: z.boolean(),
  xp: z.number().int().nonnegative()
});

export const AdminAuditEntrySchema = z.object({
  id: z.uuid(),
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime()
});

export const AdminStateSchema = z.object({
  developmentOnly: z.boolean(),
  player: z.object({
    id: z.uuid(),
    displayName: z.string().nullable(),
    cashCents: z.number().int().nonnegative()
  }),
  roles: z.array(AdminRoleSchema),
  assignedRoleKeys: z.array(z.string()),
  effectivePermissions: z.array(z.string()),
  permissionOverrides: z.record(z.string(), z.boolean()),
  inventoryCount: z.number().int().nonnegative(),
  vehicles: z.array(AdminVehicleSchema),
  jobs: z.array(AdminJobStateSchema),
  audit: z.array(AdminAuditEntrySchema)
});

export const AdminMutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set_cash'), amountCents: z.number().int().min(0).max(1_000_000_000_00) }),
  z.object({ action: z.literal('grant_item'), itemKey: z.string().min(1), quantity: z.number().int().min(1).max(1000) }),
  z.object({ action: z.literal('grant_vehicle'), modelId: z.string().min(1) }),
  z.object({ action: z.literal('remove_vehicle'), vehicleId: z.uuid() }),
  z.object({ action: z.literal('set_job'), jobId: z.string().min(1), enabled: z.boolean(), xp: z.number().int().min(0).max(1_000_000).optional() }),
  z.object({ action: z.literal('set_roles'), roleKeys: z.array(z.string().min(1)).max(10) }),
  z.object({ action: z.literal('set_permission'), permissionKey: z.string().min(1), allowed: z.boolean().nullable() })
]);

export type CoreRegistry = z.infer<typeof CoreRegistrySchema>;
export type AdminState = z.infer<typeof AdminStateSchema>;
export type AdminMutation = z.infer<typeof AdminMutationSchema>;
