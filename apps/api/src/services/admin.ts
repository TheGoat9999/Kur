import { AdminStateSchema, type AdminMutation, type AdminState } from '@sol-dorado/contracts/admin';
import type { Database } from '../db.js';
import { getItemDefinition } from '../domain/items/index.js';
import { JOBS, SKILL_XP } from '../domain/jobs-catalog.js';
import { CORE_JOBS, CORE_PERMISSION_KEYS, CORE_ROLE_KEYS } from '../domain/core-registry.js';

const SYMBOL_BY_CATEGORY: Record<string, string> = {
  personal: '◈', food: '🍽', drink: '◉', tool: '🔧', material: '◇', electronics: '⌁', medical: '✚', weapon: '◆'
};

export class AdminCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

async function permissionsFor(db: Database, playerId: string) {
  const [roleResult, overrideResult] = await Promise.all([
    db.query({
      text: `SELECT par.role_key,arp.permission_key
             FROM player_admin_roles par
             LEFT JOIN admin_role_permissions arp ON arp.role_key=par.role_key
             WHERE par.player_id=$1`,
      values: [playerId]
    }),
    db.query({ text: 'SELECT permission_key,allowed FROM player_admin_permission_overrides WHERE player_id=$1', values: [playerId] })
  ]);
  const roles = [...new Set(roleResult.rows.map(row => String(row.role_key)))];
  const permissions = new Set(roleResult.rows.flatMap(row => row.permission_key ? [String(row.permission_key)] : []));
  const overrides: Record<string, boolean> = {};
  for (const row of overrideResult.rows) {
    overrides[String(row.permission_key)] = Boolean(row.allowed);
    if (row.allowed) permissions.add(String(row.permission_key)); else permissions.delete(String(row.permission_key));
  }
  return { roles, permissions: [...permissions].sort(), overrides };
}

export async function assertAdminPermission(db: Database, playerId: string, permission: string) {
  const access = await permissionsFor(db, playerId);
  if (!access.permissions.includes(permission)) throw new AdminCommandError('admin_permission_denied', 403);
}

export async function getAdminState(db: Database, playerId: string): Promise<AdminState> {
  await assertAdminPermission(db, playerId, 'core.view');
  const [playerResult, roleResult, inventoryResult, vehicleResult, jobResult, policeResult, emsResult, realEstateResult, auditResult] = await Promise.all([
    db.query({ text: `SELECT p.id,c.display_name,ps.cash_cents FROM players p LEFT JOIN characters c ON c.player_id=p.id AND c.is_active=true JOIN player_state ps ON ps.player_id=p.id WHERE p.id=$1`, values: [playerId] }),
    db.query(`SELECT r.role_key,r.name_bg,r.name_en,COALESCE(array_agg(rp.permission_key ORDER BY rp.permission_key) FILTER (WHERE rp.permission_key IS NOT NULL),'{}') permissions FROM admin_roles r LEFT JOIN admin_role_permissions rp ON rp.role_key=r.role_key GROUP BY r.role_key,r.name_bg,r.name_en ORDER BY r.role_key`),
    db.query({ text: 'SELECT COALESCE(SUM(quantity),0) total FROM inventory_items WHERE player_id=$1', values: [playerId] }),
    db.query({ text: `SELECT pv.id,pv.model_id,pv.active,vm.display_name FROM player_vehicles pv JOIN vehicle_models vm ON vm.id=pv.model_id WHERE pv.player_id=$1 ORDER BY pv.created_at DESC`, values: [playerId] }),
    db.query({ text: 'SELECT job_id,xp FROM job_progress WHERE player_id=$1', values: [playerId] }),
    db.query({ text: 'SELECT career_status FROM police_profiles WHERE player_id=$1', values: [playerId] }),
    db.query({ text: 'SELECT rank FROM ems_profiles WHERE player_id=$1', values: [playerId] }),
    db.query({ text: 'SELECT license_stage,employed FROM real_estate_careers WHERE player_id=$1', values: [playerId] }),
    db.query({ text: 'SELECT id,action,payload,created_at FROM admin_audit_log WHERE target_player_id=$1 ORDER BY created_at DESC LIMIT 30', values: [playerId] })
  ]);
  const player = playerResult.rows[0];
  if (!player) throw new AdminCommandError('admin_player_not_found', 404);
  const access = await permissionsFor(db, playerId);
  const standardProgress = new Map(jobResult.rows.map(row => [String(row.job_id), Number(row.xp)]));
  const institutionalEnabled: Record<string, boolean> = {
    police: Boolean(policeResult.rowCount), ems: Boolean(emsResult.rowCount), real_estate: Boolean(realEstateResult.rowCount)
  };
  return AdminStateSchema.parse({
    developmentOnly: true,
    player: { id: String(player.id), displayName: player.display_name ? String(player.display_name) : null, cashCents: Number(player.cash_cents) },
    roles: roleResult.rows.map(row => ({ key: String(row.role_key), nameBg: String(row.name_bg), nameEn: String(row.name_en), permissions: row.permissions as string[] })),
    assignedRoleKeys: access.roles,
    effectivePermissions: access.permissions,
    permissionOverrides: access.overrides,
    inventoryCount: Number(inventoryResult.rows[0]?.total ?? 0),
    vehicles: vehicleResult.rows.map(row => ({ id: String(row.id), modelId: String(row.model_id), displayName: String(row.display_name), active: Boolean(row.active) })),
    jobs: CORE_JOBS.map(job => ({
      jobId: job.id,
      enabled: job.kind === 'standard' ? standardProgress.has(job.id) : Boolean(institutionalEnabled[job.id]),
      xp: job.kind === 'standard' ? (standardProgress.get(job.id) ?? 0) : 0
    })),
    audit: auditResult.rows.map(row => ({ id: String(row.id), action: String(row.action), payload: row.payload ?? {}, createdAt: new Date(row.created_at).toISOString() }))
  });
}

async function audit(db: Database, actorId: string, action: string, payload: Record<string, unknown>) {
  await db.query({ text: 'INSERT INTO admin_audit_log(actor_player_id,target_player_id,action,payload) VALUES($1,$1,$2,$3::jsonb)', values: [actorId, action, JSON.stringify(payload)] });
}

export async function runAdminMutation(db: Database, playerId: string, mutation: AdminMutation): Promise<AdminState> {
  const required = mutation.action === 'set_cash' ? 'admin.money'
    : mutation.action === 'grant_item' ? 'admin.items'
    : mutation.action === 'grant_vehicle' || mutation.action === 'remove_vehicle' ? 'admin.vehicles'
    : mutation.action === 'set_job' ? 'admin.jobs' : 'admin.roles';
  await assertAdminPermission(db, playerId, required);

  if (mutation.action === 'set_cash') {
    await db.query({ text: 'UPDATE player_state SET cash_cents=$2,version=version+1,updated_at=now() WHERE player_id=$1', values: [playerId, mutation.amountCents] });
  } else if (mutation.action === 'grant_item') {
    const item = getItemDefinition(mutation.itemKey);
    if (!item) throw new AdminCommandError('admin_item_unknown', 400);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const containerResult = await client.query('SELECT * FROM inventory_containers WHERE player_id=$1 AND container_key=\'player\' FOR UPDATE', [playerId]);
      const container = containerResult.rows[0];
      if (!container) throw new AdminCommandError('admin_inventory_missing', 409);
      const weightResult = await client.query('SELECT COALESCE(SUM(unit_weight_grams*quantity),0) weight FROM inventory_items WHERE container_id=$1', [container.id]);
      const nextWeight = Number(weightResult.rows[0]?.weight ?? 0) + item.unitWeightGrams * mutation.quantity;
      if (nextWeight > Number(container.capacity_grams)) throw new AdminCommandError('admin_inventory_capacity', 409);
      const stack = item.stackable ? (await client.query('SELECT id,quantity FROM inventory_items WHERE container_id=$1 AND item_key=$2 ORDER BY slot_index LIMIT 1 FOR UPDATE', [container.id, item.key])).rows[0] : null;
      if (stack) {
        await client.query('UPDATE inventory_items SET quantity=quantity+$2,updated_at=now() WHERE id=$1', [stack.id, mutation.quantity]);
      } else {
        const occupiedResult = await client.query('SELECT slot_index FROM inventory_items WHERE container_id=$1 ORDER BY slot_index', [container.id]);
        const occupied = new Set<number>(occupiedResult.rows.map(row => Number(row.slot_index)));
        const slot = Array.from({ length: Number(container.slot_count) }, (_, index) => index).find(index => !occupied.has(index));
        if (slot === undefined) throw new AdminCommandError('admin_inventory_full', 409);
        await client.query({ text: `INSERT INTO inventory_items(player_id,container_id,item_key,display_name,category,symbol,quantity,unit_weight_grams,stackable,slot_index,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'{}'::jsonb)`, values: [playerId, container.id, item.key, item.displayName, item.category, SYMBOL_BY_CATEGORY[item.category] ?? '◈', mutation.quantity, item.unitWeightGrams, item.stackable, slot] });
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } else if (mutation.action === 'grant_vehicle') {
    const model = await db.query({ text: 'SELECT id FROM vehicle_models WHERE id=$1', values: [mutation.modelId] });
    if (!model.rowCount) throw new AdminCommandError('admin_vehicle_model_unknown', 400);
    const location = await db.query({ text: 'SELECT current_segment_id FROM player_street_state WHERE player_id=$1', values: [playerId] });
    const segmentId = String(location.rows[0]?.current_segment_id ?? 'cypress_corner');
    await db.query({ text: `INSERT INTO player_vehicles(player_id,model_id,active,fuel_percent,engine_condition,body_condition,tire_condition,mileage_km,parked_segment_id,locked,occupied,parking_kind,purchased_from) VALUES($1,$2,false,100,100,100,100,0,$3,false,false,'street','admin_test')`, values: [playerId, mutation.modelId, segmentId] });
  } else if (mutation.action === 'remove_vehicle') {
    await db.query({ text: 'DELETE FROM player_vehicles WHERE id=$1 AND player_id=$2', values: [mutation.vehicleId, playerId] });
  } else if (mutation.action === 'set_job') {
    const coreJob = CORE_JOBS.find(job => job.id === mutation.jobId);
    if (!coreJob) throw new AdminCommandError('admin_job_unknown', 400);
    if (coreJob.source === 'jobs') {
      const job = JOBS.find(entry => entry.id === mutation.jobId)!;
      if (mutation.enabled) {
        await db.query({ text: `INSERT INTO job_profiles(player_id) VALUES($1) ON CONFLICT(player_id) DO NOTHING`, values: [playerId] });
        await db.query({ text: `INSERT INTO job_progress(player_id,job_id,xp) VALUES($1,$2,$3) ON CONFLICT(player_id,job_id) DO UPDATE SET xp=EXCLUDED.xp,updated_at=now()`, values: [playerId, mutation.jobId, mutation.xp ?? 0] });
        for (const requirement of job.requirements) {
          const xp = SKILL_XP[requirement.level] ?? 0;
          await db.query({ text: `INSERT INTO job_skill_progress(player_id,skill_key,xp) VALUES($1,$2,$3) ON CONFLICT(player_id,skill_key) DO UPDATE SET xp=GREATEST(job_skill_progress.xp,EXCLUDED.xp),updated_at=now()`, values: [playerId, requirement.skill, xp] });
        }
        if (job.qualification) await db.query({ text: `UPDATE job_profiles SET qualifications=array(SELECT DISTINCT unnest(qualifications || ARRAY[$2]::text[])),updated_at=now() WHERE player_id=$1`, values: [playerId, job.qualification] });
      } else {
        await db.query({ text: 'DELETE FROM job_progress WHERE player_id=$1 AND job_id=$2', values: [playerId, mutation.jobId] });
      }
    } else if (coreJob.source === 'police') {
      if (mutation.enabled) await db.query({ text: `INSERT INTO police_profiles(player_id,career_status,academy_stage,badge_number,rank_code) VALUES($1,'officer',2,'DEV-'||upper(substr(replace($1::text,'-',''),1,6)),'officer') ON CONFLICT(player_id) DO UPDATE SET career_status='officer',academy_stage=2,rank_code='officer',updated_at=now()`, values: [playerId] });
      else await db.query({ text: 'DELETE FROM police_profiles WHERE player_id=$1', values: [playerId] });
    } else if (coreJob.source === 'ems') {
      if (mutation.enabled) await db.query({ text: `INSERT INTO ems_profiles(player_id,rank,reputation) VALUES($1,'paramedic',70) ON CONFLICT(player_id) DO UPDATE SET rank='paramedic',reputation=GREATEST(ems_profiles.reputation,70),updated_at=now()`, values: [playerId] });
      else await db.query({ text: 'DELETE FROM ems_profiles WHERE player_id=$1', values: [playerId] });
    } else if (coreJob.source === 'real_estate') {
      if (mutation.enabled) await db.query({ text: `INSERT INTO real_estate_careers(player_id,license_stage,employed,reputation) VALUES($1,2,true,70) ON CONFLICT(player_id) DO UPDATE SET license_stage=2,employed=true,reputation=GREATEST(real_estate_careers.reputation,70),updated_at=now()`, values: [playerId] });
      else await db.query({ text: 'DELETE FROM real_estate_careers WHERE player_id=$1', values: [playerId] });
    }
  } else if (mutation.action === 'set_roles') {
    if (!mutation.roleKeys.every(key => CORE_ROLE_KEYS.includes(key as (typeof CORE_ROLE_KEYS)[number]))) throw new AdminCommandError('admin_role_unknown', 400);
    if (!mutation.roleKeys.includes('owner')) throw new AdminCommandError('admin_owner_role_required_for_self_service', 409);
    await db.query({ text: 'DELETE FROM player_admin_roles WHERE player_id=$1', values: [playerId] });
    for (const roleKey of mutation.roleKeys) await db.query({ text: 'INSERT INTO player_admin_roles(player_id,role_key) VALUES($1,$2) ON CONFLICT DO NOTHING', values: [playerId, roleKey] });
  } else if (mutation.action === 'set_permission') {
    if (!CORE_PERMISSION_KEYS.includes(mutation.permissionKey as (typeof CORE_PERMISSION_KEYS)[number])) throw new AdminCommandError('admin_permission_unknown', 400);
    if (mutation.permissionKey === 'admin.roles' && mutation.allowed === false) throw new AdminCommandError('admin_roles_permission_self_lockout', 409);
    if (mutation.allowed === null) await db.query({ text: 'DELETE FROM player_admin_permission_overrides WHERE player_id=$1 AND permission_key=$2', values: [playerId, mutation.permissionKey] });
    else await db.query({ text: `INSERT INTO player_admin_permission_overrides(player_id,permission_key,allowed) VALUES($1,$2,$3) ON CONFLICT(player_id,permission_key) DO UPDATE SET allowed=EXCLUDED.allowed,updated_at=now()`, values: [playerId, mutation.permissionKey, mutation.allowed] });
  }

  await audit(db, playerId, mutation.action, mutation as unknown as Record<string, unknown>);
  return getAdminState(db, playerId);
}
