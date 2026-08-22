import type { PoolClient } from 'pg';
import type { Database } from '../db.js';
import { deterministicDelayMinutes } from '../domain/supply-chain.js';
import { getItemDefinition } from '../domain/items/index.js';

export class SupplyChainCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

const LOGISTICS_JOB_KEYS = new Set(['warehouse','delivery','courier','dock']);

async function supplyAccess(db: Database | PoolClient, businessId: string, playerId: string, allowWorker = false) {
  const result = await db.query({ text: `SELECT b.owner_player_id,
    (SELECT role FROM business_members WHERE business_id=b.id AND player_id=$2 AND active=true LIMIT 1) member_role,
    (SELECT job_key FROM business_members WHERE business_id=b.id AND player_id=$2 AND active=true LIMIT 1) job_key
    FROM businesses b WHERE b.id=$1`, values: [businessId, playerId] });
  const row = result.rows[0];
  if (!row) throw new SupplyChainCommandError('supply_business_not_found', 404);
  const role = row.owner_player_id === playerId ? 'owner' : row.member_role ? String(row.member_role) : null;
  const jobKey = row.job_key ? String(row.job_key) : null;
  const workerAllowed = allowWorker && role === 'employee' && jobKey && LOGISTICS_JOB_KEYS.has(jobKey);
  if (role !== 'owner' && role !== 'manager' && !workerAllowed) throw new SupplyChainCommandError('supply_forbidden', 403);
  return { role, jobKey };
}

export interface PurchaseOrderInputLine {
  itemKey: string;
  quantity: number;
}

export async function placePurchaseOrder(
  db: Database,
  playerId: string,
  businessId: string,
  supplierId: string,
  destinationPropertyId: string | null,
  lines: readonly PurchaseOrderInputLine[]
) {
  if (!lines.length || lines.length > 30) throw new SupplyChainCommandError('supply_order_lines_invalid', 400);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await supplyAccess(client, businessId, playerId);
    const supplier = (await client.query(
      'SELECT * FROM business_suppliers WHERE id=$1 AND business_id=$2 FOR UPDATE', [supplierId, businessId]
    )).rows[0];
    if (!supplier) throw new SupplyChainCommandError('supply_supplier_not_found', 404);

    if (destinationPropertyId) {
      const destination = (await client.query(
        `SELECT id,kind FROM real_estate_properties WHERE id=$1 AND kind IN ('commercial','industrial','warehouse','factory')`,
        [destinationPropertyId]
      )).rows[0];
      if (!destination) throw new SupplyChainCommandError('supply_destination_invalid', 400);
    }

    const pricedLines = lines.map(line => {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000) throw new SupplyChainCommandError('supply_quantity_invalid', 400);
      const item = getItemDefinition(line.itemKey);
      if (!item) throw new SupplyChainCommandError('supply_item_unknown', 400);
      const unitCostCents = Math.max(1, Math.round(item.basePriceCents * Number(supplier.price_multiplier_basis_points) / 10_000));
      return { itemKey: line.itemKey, quantity: line.quantity, unitCostCents, totalCents: unitCostCents * line.quantity };
    });
    const totalCents = pricedLines.reduce((sum, line) => sum + line.totalCents, 0);
    const account = (await client.query(
      `SELECT balance_cents FROM business_accounts WHERE business_id=$1 AND account_key='operating' FOR UPDATE`, [businessId]
    )).rows[0];
    if (!account || Number(account.balance_cents) < totalCents) throw new SupplyChainCommandError('supply_insufficient_funds', 409);

    const purchaseOrder = (await client.query(
      `INSERT INTO supply_purchase_orders(business_id,supplier_id,destination_property_id,status,total_cents,ordered_at)
       VALUES($1,$2,$3,'placed',$4,now()) RETURNING id`,
      [businessId, supplierId, destinationPropertyId, totalCents]
    )).rows[0];
    for (const line of pricedLines) {
      await client.query(
        `INSERT INTO supply_purchase_order_lines(purchase_order_id,item_key,quantity,unit_cost_cents,total_cents)
         VALUES($1,$2,$3,$4,$5)`,
        [purchaseOrder.id, line.itemKey, line.quantity, line.unitCostCents, line.totalCents]
      );
    }

    const delayMinutes = deterministicDelayMinutes(String(purchaseOrder.id), Number(supplier.reliability));
    const routeKey = `${String(supplier.supplier_key)}:${destinationPropertyId ?? businessId}`;
    const shipment = (await client.query(
      `INSERT INTO supply_shipments
        (business_id,supplier_id,purchase_order_id,status,origin_label,destination_property_id,route_key,vehicle_class,dispatched_at,eta_at,delay_minutes)
       VALUES($1,$2,$3,'in_transit',$4,$5,$6,$7,now(),now()+($8::text||' minutes')::interval,$9)
       RETURNING id,eta_at`,
      [businessId, supplierId, purchaseOrder.id, String(supplier.name), destinationPropertyId, routeKey, shipmentVehicleClass(pricedLines), Number(supplier.lead_time_minutes), delayMinutes]
    )).rows[0];

    await client.query(
      `UPDATE business_accounts SET balance_cents=balance_cents-$2,updated_at=now() WHERE business_id=$1 AND account_key='operating'`,
      [businessId, totalCents]
    );
    await client.query(
      `INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo)
       VALUES($1,'supplier','out',$2,$3)`,
      [businessId, totalCents, `Purchase order ${String(purchaseOrder.id).slice(0,8)} · ${pricedLines.length} lines`]
    );
    await client.query('UPDATE supply_purchase_orders SET status=\'dispatched\',dispatched_at=now() WHERE id=$1', [purchaseOrder.id]);
    await client.query('COMMIT');
    return { purchaseOrderId: String(purchaseOrder.id), shipmentId: String(shipment.id), etaAt: new Date(shipment.eta_at).toISOString(), delayMinutes, totalCents };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function receiveShipment(db: Database, playerId: string, shipmentId: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const shipment = (await client.query('SELECT * FROM supply_shipments WHERE id=$1 FOR UPDATE', [shipmentId])).rows[0];
    if (!shipment) throw new SupplyChainCommandError('supply_shipment_not_found', 404);
    await supplyAccess(client, String(shipment.business_id), playerId, true);
    if (shipment.status === 'delivered' || shipment.status === 'cancelled') throw new SupplyChainCommandError('supply_shipment_closed', 409);
    if (!shipment.eta_at) throw new SupplyChainCommandError('supply_shipment_not_dispatched', 409);
    const receivableAt = new Date(shipment.eta_at).getTime() + Number(shipment.delay_minutes) * 60_000;
    if (Date.now() < receivableAt) throw new SupplyChainCommandError('supply_shipment_not_arrived', 409);

    const lines = await client.query(
      `SELECT item_key,quantity,unit_cost_cents FROM supply_purchase_order_lines WHERE purchase_order_id=$1 ORDER BY item_key`,
      [shipment.purchase_order_id]
    );
    for (const line of lines.rows) {
      await client.query(
        `INSERT INTO business_stock(business_id,item_key,quantity,reorder_point,average_unit_cost_cents)
         VALUES($1,$2,$3,5,$4)
         ON CONFLICT(business_id,item_key) DO UPDATE SET quantity=business_stock.quantity+EXCLUDED.quantity,
           average_unit_cost_cents=EXCLUDED.average_unit_cost_cents,updated_at=now()`,
        [shipment.business_id, line.item_key, Number(line.quantity), Number(line.unit_cost_cents)]
      );
      await client.query(
        `INSERT INTO business_stock_lots(business_id,item_key,quantity,quality,received_at,best_before_at,source_kind,source_shipment_id)
         VALUES($1,$2,$3,80,now(),CASE WHEN $2 IN ('raw_beef','raw_chicken','milk') THEN now()+interval '24 hours' ELSE NULL END,'shipment',$4)`,
        [shipment.business_id, line.item_key, Number(line.quantity), shipmentId]
      );
    }
    await client.query(`UPDATE supply_shipments SET status='delivered',delivered_at=now() WHERE id=$1`, [shipmentId]);
    await client.query(`UPDATE supply_purchase_orders SET status='fulfilled',fulfilled_at=now() WHERE id=$1`, [shipment.purchase_order_id]);
    await client.query('COMMIT');
    return { shipmentId, deliveredLines: lines.rowCount ?? lines.rows.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function shipmentVehicleClass(lines: readonly { quantity: number }[]) {
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  return units > 120 ? 'truck' : units > 45 ? 'box_truck' : 'van';
}
