import { HospitalityStateSchema, type HospitalityState } from '@sol-dorado/contracts/hospitality';
import type { Database } from '../db.js';
import { getItemDefinition } from '../domain/items/index.js';
import { PRODUCTION_RECIPES } from '../domain/hospitality-production.js';
import { effectiveShipmentStatus, shortageSignal } from '../domain/supply-chain.js';
import { HospitalityCommandError } from './hospitality-production.js';

export async function getHospitalityState(db: Database, playerId: string, businessId: string): Promise<HospitalityState> {
  const business = (await db.query({
    text: `SELECT b.id,b.name,b.kind,b.status,b.reputation,b.owner_player_id,b.property_id,b.district,b.street_segment,
      h.concept,h.capacity,COALESCE(rp.name_bg,rp.name_en) property_name,COALESCE(a.balance_cents,0) operating_balance_cents,
      (SELECT role FROM business_members WHERE business_id=b.id AND player_id=$2 AND active=true LIMIT 1) member_role
      FROM businesses b
      JOIN hospitality_profiles h ON h.business_id=b.id
      LEFT JOIN real_estate_properties rp ON rp.id=b.property_id
      LEFT JOIN business_accounts a ON a.business_id=b.id AND a.account_key='operating'
      WHERE b.id=$1`,
    values: [businessId, playerId]
  })).rows[0];
  if (!business) throw new HospitalityCommandError('hospitality_profile_missing', 404);

  const role = business.owner_player_id === playerId ? 'owner' : business.member_role ? String(business.member_role) : null;
  const stockRows = await db.query({
    text: `SELECT s.item_key,s.quantity,s.reorder_point,s.average_unit_cost_cents,p.price_cents,
      COALESCE((SELECT SUM(pol.quantity) FROM supply_purchase_order_lines pol
        JOIN supply_purchase_orders po ON po.id=pol.purchase_order_id
        WHERE po.business_id=s.business_id AND pol.item_key=s.item_key AND po.status IN ('placed','dispatched')),0) incoming_quantity,
      (SELECT ROUND(AVG(l.quality)) FROM business_stock_lots l WHERE l.business_id=s.business_id AND l.item_key=s.item_key AND l.quantity>0) average_quality,
      (SELECT ROUND(AVG(CASE WHEN l.best_before_at IS NULL THEN 100 WHEN l.best_before_at<=now() THEN 20
        ELSE GREATEST(25,LEAST(100,EXTRACT(EPOCH FROM (l.best_before_at-now()))/NULLIF(EXTRACT(EPOCH FROM (l.best_before_at-l.received_at)),0)*100)) END))
        FROM business_stock_lots l WHERE l.business_id=s.business_id AND l.item_key=s.item_key AND l.quantity>0) freshness_percent
      FROM business_stock s LEFT JOIN business_prices p ON p.business_id=s.business_id AND p.item_key=s.item_key
      WHERE s.business_id=$1 ORDER BY s.item_key`,
    values: [businessId]
  });

  const stock = stockRows.rows.map(row => {
    const signal = shortageSignal({
      itemKey: String(row.item_key), quantity: Number(row.quantity), reorderPoint: Number(row.reorder_point), incomingQuantity: Number(row.incoming_quantity)
    });
    return {
      itemKey: String(row.item_key),
      displayName: getItemDefinition(String(row.item_key))?.displayName ?? String(row.item_key),
      quantity: Number(row.quantity),
      reorderPoint: Number(row.reorder_point),
      incomingQuantity: Number(row.incoming_quantity),
      averageUnitCostCents: Number(row.average_unit_cost_cents),
      priceCents: row.price_cents === null ? null : Number(row.price_cents),
      averageQuality: row.average_quality === null ? null : Number(row.average_quality),
      freshnessPercent: row.freshness_percent === null ? null : Number(row.freshness_percent),
      severity: signal.severity
    };
  });

  const supplierRows = await db.query({
    text: 'SELECT id,name,reliability,lead_time_minutes,price_multiplier_basis_points FROM business_suppliers WHERE business_id=$1 ORDER BY name',
    values: [businessId]
  });
  const warehouseRows = await db.query({
    text: `SELECT l.id,l.property_id,l.label,l.kind,l.capacity_units,COALESCE(SUM(sl.quantity),0) used_units
      FROM business_stock_locations l LEFT JOIN business_stock_lots sl ON sl.location_id=l.id AND sl.quantity>0
      WHERE l.business_id=$1 GROUP BY l.id ORDER BY l.kind,l.label`,
    values: [businessId]
  });
  const productionRows = await db.query({
    text: `SELECT id,business_id,recipe_key,batches,status,quality,started_at,ready_at,completed_at
      FROM hospitality_production_batches WHERE business_id=$1 ORDER BY started_at DESC LIMIT 24`,
    values: [businessId]
  });
  const shipmentRows = await db.query({
    text: `SELECT * FROM supply_shipments WHERE business_id=$1 ORDER BY COALESCE(dispatched_at,created_at) DESC LIMIT 24`,
    values: [businessId]
  });
  const shipments = [];
  for (const row of shipmentRows.rows) {
    const lines = await db.query({
      text: 'SELECT item_key,quantity,unit_cost_cents,total_cents FROM supply_purchase_order_lines WHERE purchase_order_id=$1 ORDER BY item_key',
      values: [row.purchase_order_id]
    });
    const status = effectiveShipmentStatus({
      status: String(row.status) as 'planned'|'in_transit'|'delayed'|'delivered'|'cancelled',
      dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at) : null,
      etaAt: row.eta_at ? new Date(row.eta_at) : null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
      delayMinutes: Number(row.delay_minutes)
    }, new Date());
    shipments.push({
      id: String(row.id), businessId: String(row.business_id), supplierId: String(row.supplier_id), purchaseOrderId: String(row.purchase_order_id), status,
      originLabel: String(row.origin_label), destinationPropertyId: row.destination_property_id ? String(row.destination_property_id) : null,
      routeKey: String(row.route_key), vehicleClass: String(row.vehicle_class),
      dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at).toISOString() : null,
      etaAt: row.eta_at ? new Date(row.eta_at).toISOString() : null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
      delayMinutes: Number(row.delay_minutes), delayReasonBg: row.delay_reason_bg ? String(row.delay_reason_bg) : null, delayReasonEn: row.delay_reason_en ? String(row.delay_reason_en) : null,
      lines: lines.rows.map(line => ({ itemKey:String(line.item_key),quantity:Number(line.quantity),unitCostCents:Number(line.unit_cost_cents),totalCents:Number(line.total_cents) }))
    });
  }

  const demandRow = (await db.query({
    text: `SELECT time_bucket,requested_customers,served_customers,lost_customers,revenue_cents
      FROM hospitality_demand_cycles WHERE business_id=$1 ORDER BY time_bucket DESC LIMIT 1`,
    values: [businessId]
  })).rows[0];

  return HospitalityStateSchema.parse({
    business: {
      id: String(business.id), name: String(business.name), concept: String(business.concept), status: String(business.status), reputation: Number(business.reputation),
      canManage: role === 'owner' || role === 'manager', role, propertyId: business.property_id ? String(business.property_id) : null,
      propertyName: business.property_name ? String(business.property_name) : null, district: String(business.district), streetSegment: String(business.street_segment),
      operatingBalanceCents: Number(business.operating_balance_cents), capacity: Number(business.capacity)
    },
    recipes: PRODUCTION_RECIPES,
    stock,
    suppliers: supplierRows.rows.map(row => ({ id:String(row.id),name:String(row.name),reliability:Number(row.reliability),leadTimeMinutes:Number(row.lead_time_minutes),priceMultiplierBasisPoints:Number(row.price_multiplier_basis_points) })),
    warehouses: warehouseRows.rows.map(row => ({ id:String(row.id),propertyId:String(row.property_id),label:String(row.label),kind:String(row.kind),capacityUnits:Number(row.capacity_units),usedUnits:Number(row.used_units) })),
    production: productionRows.rows.map(row => ({ id:String(row.id),businessId:String(row.business_id),recipeKey:String(row.recipe_key),batches:Number(row.batches),status:String(row.status),quality:row.quality===null?null:Number(row.quality),startedAt:new Date(row.started_at).toISOString(),readyAt:new Date(row.ready_at).toISOString(),completedAt:row.completed_at?new Date(row.completed_at).toISOString():null })),
    shipments,
    shortages: stock.map(item => ({ itemKey:item.itemKey,quantity:item.quantity,incomingQuantity:item.incomingQuantity,reorderPoint:item.reorderPoint,severity:item.severity })),
    demand: demandRow ? { hour:((Number(demandRow.time_bucket)%24)+24)%24,requestedCustomers:Number(demandRow.requested_customers),servedCustomers:Number(demandRow.served_customers),lostCustomers:Number(demandRow.lost_customers),revenueCents:Number(demandRow.revenue_cents) } : null
  });
}