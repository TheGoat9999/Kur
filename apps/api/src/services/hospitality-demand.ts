import type { PoolClient } from 'pg';
import type { Database } from '../db.js';
import { calculateHospitalityDemand, type HospitalityConcept } from '../domain/hospitality-demand.js';
import { PRODUCTION_RECIPES } from '../domain/hospitality-production.js';
import { HospitalityCommandError } from './hospitality-production.js';

export async function runHospitalityDemandCycle(db: Database, playerId: string, businessId: string, now = new Date()) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const business = (await client.query(
      `SELECT b.business_key,b.kind,b.district,b.status,b.reputation,b.sales_tax_basis_points,b.service_fee_basis_points,
        b.owner_player_id,h.concept,h.capacity,
        (SELECT role FROM business_members WHERE business_id=b.id AND player_id=$2 AND active=true LIMIT 1) member_role
       FROM businesses b JOIN hospitality_profiles h ON h.business_id=b.id WHERE b.id=$1 FOR UPDATE`,
      [businessId, playerId]
    )).rows[0];
    if (!business) throw new HospitalityCommandError('hospitality_profile_missing', 404);
    const role = business.owner_player_id === playerId ? 'owner' : business.member_role ? String(business.member_role) : null;
    if (role !== 'owner' && role !== 'manager') throw new HospitalityCommandError('hospitality_demand_forbidden', 403);

    const timeBucket = Math.floor(now.getTime() / 3_600_000);
    const existing = await client.query(
      'SELECT requested_customers,served_customers,lost_customers,revenue_cents FROM hospitality_demand_cycles WHERE business_id=$1 AND time_bucket=$2',
      [businessId, timeBucket]
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      await client.query('ROLLBACK');
      return demandRow(timeBucket, row);
    }

    const menuKeys = [...new Set(PRODUCTION_RECIPES.map(recipe => recipe.outputItemKey))];
    const menu = await client.query(
      `SELECT s.item_key,s.quantity,p.price_cents
       FROM business_stock s JOIN business_prices p ON p.business_id=s.business_id AND p.item_key=s.item_key
       WHERE s.business_id=$1 AND s.item_key=ANY($2::text[]) AND s.quantity>0 AND p.price_cents>0
       ORDER BY s.item_key`,
      [businessId, menuKeys]
    );
    const averagePrice = menu.rowCount
      ? menu.rows.reduce((sum, row) => sum + Number(row.price_cents), 0) / Math.max(1, menu.rows.length)
      : 0;
    const averageBasePrice = 750;
    const priceIndexBasisPoints = averagePrice > 0 ? Math.round(averagePrice / averageBasePrice * 10_000) : 10_000;
    const demand = calculateHospitalityDemand({
      businessKey: String(business.business_key),
      district: String(business.district),
      timeBucket,
      concept: String(business.concept) as HospitalityConcept,
      reputation: Number(business.reputation),
      priceIndexBasisPoints,
      capacity: Number(business.capacity),
      open: business.status === 'open'
    });

    let remaining = demand.requestedCustomers;
    let servedCustomers = 0;
    let revenueCents = 0;
    let totalTaxCents = 0;
    for (const item of menu.rows) {
      if (remaining <= 0) break;
      const quantity = Math.min(remaining, Number(item.quantity));
      if (quantity <= 0) continue;
      const subtotalCents = Number(item.price_cents) * quantity;
      const taxCents = Math.round(subtotalCents * Number(business.sales_tax_basis_points) / 10_000);
      const serviceFeeCents = Math.round(subtotalCents * Number(business.service_fee_basis_points) / 10_000);
      const totalCents = subtotalCents + taxCents + serviceFeeCents;

      await client.query('UPDATE business_stock SET quantity=quantity-$3,updated_at=now() WHERE business_id=$1 AND item_key=$2', [businessId, item.item_key, quantity]);
      await consumePreparedLots(client, businessId, String(item.item_key), quantity);
      await client.query(
        `INSERT INTO business_pos_sales(business_id,item_key,quantity,subtotal_cents,tax_cents,service_fee_cents,total_cents)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [businessId, item.item_key, quantity, subtotalCents, taxCents, serviceFeeCents, totalCents]
      );
      servedCustomers += quantity;
      remaining -= quantity;
      revenueCents += totalCents;
      totalTaxCents += taxCents;
    }

    if (revenueCents > 0) {
      await client.query(
        `UPDATE business_accounts SET balance_cents=balance_cents+$2,updated_at=now() WHERE business_id=$1 AND account_key='operating'`,
        [businessId, revenueCents]
      );
      await client.query(
        `INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo)
         VALUES($1,'sale','in',$2,$3)`,
        [businessId, revenueCents, `NPC service cycle · ${servedCustomers} customers`]
      );
      if (totalTaxCents > 0) {
        await client.query(
          `INSERT INTO business_tax_obligations(business_id,source_type,amount_cents) VALUES($1,'sales_tax',$2)`,
          [businessId, totalTaxCents]
        );
      }
    }

    const lostCustomers = Math.max(0, demand.requestedCustomers - servedCustomers);
    const reputationDelta = servedCustomers > 0 && lostCustomers === 0 ? 1 : lostCustomers >= Math.max(3, Math.ceil(demand.requestedCustomers * 0.4)) ? -2 : 0;
    if (reputationDelta !== 0) {
      await client.query('UPDATE businesses SET reputation=GREATEST(0,LEAST(100,reputation+$2)),updated_at=now() WHERE id=$1', [businessId, reputationDelta]);
    }
    const cycle = (await client.query(
      `INSERT INTO hospitality_demand_cycles
        (business_id,time_bucket,requested_customers,served_customers,lost_customers,revenue_cents,reputation_delta,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,now()) RETURNING requested_customers,served_customers,lost_customers,revenue_cents`,
      [businessId, timeBucket, demand.requestedCustomers, servedCustomers, lostCustomers, revenueCents, reputationDelta]
    )).rows[0];
    await client.query('COMMIT');
    return demandRow(timeBucket, cycle);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* connection already completed */ }
    throw error;
  } finally {
    client.release();
  }
}

async function consumePreparedLots(client: PoolClient, businessId: string, itemKey: string, required: number) {
  const lots = await client.query(
    `SELECT id,quantity FROM business_stock_lots
     WHERE business_id=$1 AND item_key=$2 AND quantity>0
     ORDER BY best_before_at NULLS LAST,received_at,id FOR UPDATE`,
    [businessId, itemKey]
  );
  let remaining = required;
  for (const lot of lots.rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(lot.quantity));
    await client.query('UPDATE business_stock_lots SET quantity=quantity-$2 WHERE id=$1', [lot.id, take]);
    remaining -= take;
  }
}

function demandRow(timeBucket: number, row: Record<string, unknown>) {
  return {
    hour: ((timeBucket % 24) + 24) % 24,
    requestedCustomers: Number(row.requested_customers),
    servedCustomers: Number(row.served_customers),
    lostCustomers: Number(row.lost_customers),
    revenueCents: Number(row.revenue_cents)
  };
}
