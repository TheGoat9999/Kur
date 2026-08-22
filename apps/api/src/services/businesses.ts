import { BusinessesStateSchema, type BusinessesState } from '@sol-dorado/contracts/businesses';
import type { PoolClient } from 'pg';
import type { Database } from '../db.js';
import { calculateSaleBreakdown, isCanonicalBusinessJob, supplierUnitCost } from '../domain/business-commerce.js';
import { getItemDefinition } from '../domain/items/index.js';

export class BusinessCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

type Db = Database | PoolClient;
const SYMBOL_BY_CATEGORY: Record<string,string> = { personal:'◈',food:'🍽',drink:'◉',tool:'🔧',material:'◇',electronics:'⌁',medical:'✚',weapon:'◆' };

async function managerRole(db: Db, businessId: string, playerId: string) {
  const result = await db.query({ text: `SELECT b.owner_player_id,b.status,b.sales_tax_basis_points,b.service_fee_basis_points,
    (SELECT role FROM business_members WHERE business_id=b.id AND player_id=$2 AND active=true LIMIT 1) member_role
    FROM businesses b WHERE b.id=$1`, values:[businessId,playerId] });
  const row = result.rows[0];
  if (!row) throw new BusinessCommandError('business_not_found',404);
  const role = row.owner_player_id === playerId ? 'owner' : row.member_role ? String(row.member_role) : null;
  if (role !== 'owner' && role !== 'manager') throw new BusinessCommandError('business_manage_forbidden',403);
  return { ...row, role };
}

export async function getBusinessesState(db: Db, playerId: string): Promise<BusinessesState> {
  const businesses = await db.query({ text:`SELECT b.*,COALESCE(p.name_bg,p.name_en) property_name,
    COALESCE((SELECT SUM(amount_cents) FROM business_tax_obligations t WHERE t.business_id=b.id AND t.status='due'),0) due_taxes_cents,
    (SELECT role FROM business_members m WHERE m.business_id=b.id AND m.player_id=$1 AND m.active=true LIMIT 1) member_role
    FROM businesses b LEFT JOIN real_estate_properties p ON p.id=b.property_id ORDER BY b.name`, values:[playerId] });
  const rows = await Promise.all(businesses.rows.map(async business => {
    const [accounts,members,stock,suppliers,licenses,hours,ledger] = await Promise.all([
      db.query({ text:'SELECT account_key,balance_cents FROM business_accounts WHERE business_id=$1 ORDER BY account_key', values:[business.id] }),
      db.query({ text:'SELECT id,player_id,display_name,role,job_key,wage_cents,active FROM business_members WHERE business_id=$1 ORDER BY CASE role WHEN \'owner\' THEN 0 WHEN \'manager\' THEN 1 ELSE 2 END,display_name', values:[business.id] }),
      db.query({ text:'SELECT s.item_key,s.quantity,s.reorder_point,s.average_unit_cost_cents,p.price_cents FROM business_stock s LEFT JOIN business_prices p ON p.business_id=s.business_id AND p.item_key=s.item_key WHERE s.business_id=$1 ORDER BY s.item_key', values:[business.id] }),
      db.query({ text:'SELECT id,supplier_key,name,reliability,lead_time_minutes,price_multiplier_basis_points FROM business_suppliers WHERE business_id=$1 ORDER BY name', values:[business.id] }),
      db.query({ text:'SELECT id,license_key,name,required,status,fee_cents,expires_at FROM business_licenses WHERE business_id=$1 ORDER BY name', values:[business.id] }),
      db.query({ text:'SELECT day_of_week,opens_at,closes_at,closed FROM business_hours WHERE business_id=$1 ORDER BY day_of_week', values:[business.id] }),
      db.query({ text:'SELECT id,entry_type,direction,amount_cents,memo,created_at FROM business_ledger WHERE business_id=$1 ORDER BY created_at DESC LIMIT 12', values:[business.id] })
    ]);
    const role = business.owner_player_id === playerId ? 'owner' : business.member_role ? String(business.member_role) : null;
    return {
      id:String(business.id), businessKey:String(business.business_key), name:String(business.name), kind:String(business.kind),
      ownerPlayerId:business.owner_player_id ? String(business.owner_player_id) : null, propertyId:business.property_id ? String(business.property_id) : null,
      propertyName:business.property_name ? String(business.property_name) : null, district:String(business.district), streetSegment:String(business.street_segment),
      status:String(business.status), reputation:Number(business.reputation), salesTaxBasisPoints:Number(business.sales_tax_basis_points), serviceFeeBasisPoints:Number(business.service_fee_basis_points),
      canManage:role==='owner'||role==='manager', role, dueTaxesCents:Number(business.due_taxes_cents),
      accounts:accounts.rows.map(r=>({accountKey:String(r.account_key),balanceCents:Number(r.balance_cents)})),
      members:members.rows.map(r=>({id:String(r.id),playerId:r.player_id?String(r.player_id):null,displayName:String(r.display_name),role:String(r.role),jobKey:r.job_key?String(r.job_key):null,wageCents:Number(r.wage_cents),active:Boolean(r.active)})),
      stock:stock.rows.map(r=>({itemKey:String(r.item_key),displayName:getItemDefinition(String(r.item_key))?.displayName ?? String(r.item_key),quantity:Number(r.quantity),reorderPoint:Number(r.reorder_point),averageUnitCostCents:Number(r.average_unit_cost_cents),priceCents:r.price_cents===null?null:Number(r.price_cents)})),
      suppliers:suppliers.rows.map(r=>({id:String(r.id),supplierKey:String(r.supplier_key),name:String(r.name),reliability:Number(r.reliability),leadTimeMinutes:Number(r.lead_time_minutes),priceMultiplierBasisPoints:Number(r.price_multiplier_basis_points)})),
      licenses:licenses.rows.map(r=>({id:String(r.id),licenseKey:String(r.license_key),name:String(r.name),required:Boolean(r.required),status:String(r.status),feeCents:Number(r.fee_cents),expiresAt:r.expires_at?new Date(r.expires_at).toISOString():null})),
      hours:hours.rows.map(r=>({dayOfWeek:Number(r.day_of_week),opensAt:r.opens_at?String(r.opens_at).slice(0,5):null,closesAt:r.closes_at?String(r.closes_at).slice(0,5):null,closed:Boolean(r.closed)})),
      ledger:ledger.rows.map(r=>({id:String(r.id),entryType:String(r.entry_type),direction:String(r.direction),amountCents:Number(r.amount_cents),memo:String(r.memo),createdAt:new Date(r.created_at).toISOString()}))
    };
  }));
  return BusinessesStateSchema.parse({ businesses: rows });
}

export async function claimBusiness(db: Database, playerId: string, businessId: string) {
  const client=await db.connect();
  try { await client.query('BEGIN');
    const result=await client.query('SELECT owner_player_id,name FROM businesses WHERE id=$1 FOR UPDATE',[businessId]); const b=result.rows[0];
    if(!b) throw new BusinessCommandError('business_not_found',404); if(b.owner_player_id && b.owner_player_id!==playerId) throw new BusinessCommandError('business_already_owned',409);
    await client.query('UPDATE businesses SET owner_player_id=$2,updated_at=now() WHERE id=$1',[businessId,playerId]);
    const nameResult=await client.query('SELECT COALESCE(c.display_name,\'Owner\') display_name FROM players p LEFT JOIN characters c ON c.player_id=p.id AND c.is_active=true WHERE p.id=$1',[playerId]);
    const displayName=String(nameResult.rows[0]?.display_name ?? 'Owner');
    await client.query(`INSERT INTO business_members(business_id,player_id,display_name,role,wage_cents) VALUES($1,$2,$3,'owner',0) ON CONFLICT (business_id,player_id) WHERE player_id IS NOT NULL DO UPDATE SET role='owner',active=true,display_name=EXCLUDED.display_name`,[businessId,playerId,displayName]);
    await client.query(`INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo) VALUES($1,'capital','in',0,'Ownership registered')`,[businessId]);
    await client.query('COMMIT');
  } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
  return getBusinessesState(db,playerId);
}

export async function setBusinessStatus(db: Database, playerId:string,businessId:string,status:'open'|'closed'){
  await managerRole(db,businessId,playerId);
  if(status==='open'){
    const invalid=await db.query({text:`SELECT 1 FROM business_licenses WHERE business_id=$1 AND required=true AND (status<>'active' OR (expires_at IS NOT NULL AND expires_at<=now())) LIMIT 1`,values:[businessId]});
    if(invalid.rowCount) throw new BusinessCommandError('business_license_block',409);
  }
  await db.query({text:'UPDATE businesses SET status=$2,updated_at=now() WHERE id=$1',values:[businessId,status]});
  return getBusinessesState(db,playerId);
}

export async function addBusinessStaff(db:Database,playerId:string,businessId:string,displayName:string,role:'manager'|'employee',jobKey:string|null|undefined,wageCents:number){
  await managerRole(db,businessId,playerId); if(!isCanonicalBusinessJob(jobKey)) throw new BusinessCommandError('business_job_unknown',400);
  await db.query({text:'INSERT INTO business_members(business_id,display_name,role,job_key,wage_cents) VALUES($1,$2,$3,$4,$5)',values:[businessId,displayName,role,jobKey??null,wageCents]});
  return getBusinessesState(db,playerId);
}

export async function setBusinessPrice(db:Database,playerId:string,businessId:string,itemKey:string,priceCents:number){
  await managerRole(db,businessId,playerId); if(!getItemDefinition(itemKey)) throw new BusinessCommandError('business_item_unknown',400);
  const stock=await db.query({text:'SELECT 1 FROM business_stock WHERE business_id=$1 AND item_key=$2',values:[businessId,itemKey]}); if(!stock.rowCount) throw new BusinessCommandError('business_stock_item_missing',409);
  await db.query({text:`INSERT INTO business_prices(business_id,item_key,price_cents) VALUES($1,$2,$3) ON CONFLICT(business_id,item_key) DO UPDATE SET price_cents=EXCLUDED.price_cents,updated_at=now()`,values:[businessId,itemKey,priceCents]});
  return getBusinessesState(db,playerId);
}

export async function placeSupplierOrder(db:Database,playerId:string,businessId:string,supplierId:string,itemKey:string,quantity:number){
  await managerRole(db,businessId,playerId); const item=getItemDefinition(itemKey); if(!item) throw new BusinessCommandError('business_item_unknown',400);
  const client=await db.connect(); try{await client.query('BEGIN');
    const supplier=(await client.query('SELECT * FROM business_suppliers WHERE id=$1 AND business_id=$2 FOR UPDATE',[supplierId,businessId])).rows[0]; if(!supplier) throw new BusinessCommandError('business_supplier_not_found',404);
    const unitCost=supplierUnitCost(item.basePriceCents,Number(supplier.price_multiplier_basis_points)); const total=unitCost*quantity;
    const account=(await client.query(`SELECT * FROM business_accounts WHERE business_id=$1 AND account_key='operating' FOR UPDATE`,[businessId])).rows[0]; if(!account||Number(account.balance_cents)<total) throw new BusinessCommandError('business_insufficient_funds',409);
    await client.query(`UPDATE business_accounts SET balance_cents=balance_cents-$2,updated_at=now() WHERE business_id=$1 AND account_key='operating'`,[businessId,total]);
    await client.query(`INSERT INTO business_stock(business_id,item_key,quantity,reorder_point,average_unit_cost_cents) VALUES($1,$2,$3,5,$4) ON CONFLICT(business_id,item_key) DO UPDATE SET quantity=business_stock.quantity+EXCLUDED.quantity,average_unit_cost_cents=EXCLUDED.average_unit_cost_cents,updated_at=now()`,[businessId,itemKey,quantity,unitCost]);
    await client.query(`INSERT INTO business_supplier_orders(business_id,supplier_id,item_key,quantity,unit_cost_cents,total_cents,status,delivered_at) VALUES($1,$2,$3,$4,$5,$6,'delivered',now())`,[businessId,supplierId,itemKey,quantity,unitCost,total]);
    await client.query(`INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo) VALUES($1,'supplier','out',$2,$3)`,[businessId,total,`Supplier delivery · ${item.displayName} × ${quantity}`]); await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} return getBusinessesState(db,playerId);
}

export async function recordPosSale(db:Database,playerId:string,businessId:string,itemKey:string,quantity:number){
  const manager=await managerRole(db,businessId,playerId); if(manager.status!=='open') throw new BusinessCommandError('business_not_open',409);
  const client=await db.connect(); try{await client.query('BEGIN');
    const stock=(await client.query('SELECT * FROM business_stock WHERE business_id=$1 AND item_key=$2 FOR UPDATE',[businessId,itemKey])).rows[0]; if(!stock||Number(stock.quantity)<quantity) throw new BusinessCommandError('business_stock_insufficient',409);
    const price=(await client.query('SELECT price_cents FROM business_prices WHERE business_id=$1 AND item_key=$2',[businessId,itemKey])).rows[0]; if(!price) throw new BusinessCommandError('business_price_missing',409);
    const sale=calculateSaleBreakdown(Number(price.price_cents),quantity,Number(manager.sales_tax_basis_points),Number(manager.service_fee_basis_points));
    await client.query('UPDATE business_stock SET quantity=quantity-$3,updated_at=now() WHERE business_id=$1 AND item_key=$2',[businessId,itemKey,quantity]);
    await client.query(`UPDATE business_accounts SET balance_cents=balance_cents+$2,updated_at=now() WHERE business_id=$1 AND account_key='operating'`,[businessId,sale.totalCents]);
    await client.query(`INSERT INTO business_pos_sales(business_id,item_key,quantity,subtotal_cents,tax_cents,service_fee_cents,total_cents) VALUES($1,$2,$3,$4,$5,$6,$7)`,[businessId,itemKey,quantity,sale.subtotalCents,sale.taxCents,sale.serviceFeeCents,sale.totalCents]);
    if(sale.taxCents>0) await client.query(`INSERT INTO business_tax_obligations(business_id,source_type,amount_cents) VALUES($1,'sales_tax',$2)`,[businessId,sale.taxCents]);
    await client.query(`INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo) VALUES($1,'sale','in',$2,$3)`,[businessId,sale.totalCents,`POS sale · ${itemKey} × ${quantity}`]);
    await client.query('UPDATE businesses SET reputation=LEAST(100,reputation+1),updated_at=now() WHERE id=$1',[businessId]); await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} return getBusinessesState(db,playerId);
}

export async function runPayroll(db:Database,playerId:string,businessId:string){
  await managerRole(db,businessId,playerId); const client=await db.connect(); try{await client.query('BEGIN');
    const staff=await client.query(`SELECT player_id,wage_cents FROM business_members WHERE business_id=$1 AND active=true AND role<>'owner' FOR UPDATE`,[businessId]); const total=staff.rows.reduce((sum,r)=>sum+Number(r.wage_cents),0);
    if(total<=0) throw new BusinessCommandError('business_payroll_empty',409); const account=(await client.query(`SELECT balance_cents FROM business_accounts WHERE business_id=$1 AND account_key='operating' FOR UPDATE`,[businessId])).rows[0]; if(!account||Number(account.balance_cents)<total) throw new BusinessCommandError('business_insufficient_funds',409);
    await client.query(`UPDATE business_accounts SET balance_cents=balance_cents-$2,updated_at=now() WHERE business_id=$1 AND account_key='operating'`,[businessId,total]);
    for(const member of staff.rows) if(member.player_id) await client.query('UPDATE player_state SET cash_cents=cash_cents+$2,version=version+1,updated_at=now() WHERE player_id=$1',[member.player_id,Number(member.wage_cents)]);
    await client.query('INSERT INTO business_payroll_runs(business_id,total_cents,employee_count) VALUES($1,$2,$3)',[businessId,total,staff.rowCount]);
    await client.query(`INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo) VALUES($1,'payroll','out',$2,$3)`,[businessId,total,`Payroll · ${staff.rowCount} staff`]); await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} return getBusinessesState(db,playerId);
}

export async function payBusinessTaxes(db:Database,playerId:string,businessId:string){
  await managerRole(db,businessId,playerId); const client=await db.connect(); try{await client.query('BEGIN');
    const due=await client.query(`SELECT id,amount_cents FROM business_tax_obligations WHERE business_id=$1 AND status='due' FOR UPDATE`,[businessId]); const total=due.rows.reduce((s,r)=>s+Number(r.amount_cents),0); if(total<=0) throw new BusinessCommandError('business_no_tax_due',409);
    const account=(await client.query(`SELECT balance_cents FROM business_accounts WHERE business_id=$1 AND account_key='operating' FOR UPDATE`,[businessId])).rows[0]; if(!account||Number(account.balance_cents)<total) throw new BusinessCommandError('business_insufficient_funds',409);
    await client.query(`UPDATE business_accounts SET balance_cents=balance_cents-$2,updated_at=now() WHERE business_id=$1 AND account_key='operating'`,[businessId,total]); await client.query(`UPDATE business_tax_obligations SET status='paid',paid_at=now() WHERE business_id=$1 AND status='due'`,[businessId]);
    await client.query(`INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo) VALUES($1,'tax','out',$2,'Sales tax settlement')`,[businessId,total]); await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} return getBusinessesState(db,playerId);
}

export async function renewBusinessLicense(db:Database,playerId:string,businessId:string,licenseId:string){
  await managerRole(db,businessId,playerId); const client=await db.connect(); try{await client.query('BEGIN');
    const license=(await client.query('SELECT * FROM business_licenses WHERE id=$1 AND business_id=$2 FOR UPDATE',[licenseId,businessId])).rows[0]; if(!license) throw new BusinessCommandError('business_license_not_found',404); const fee=Number(license.fee_cents);
    const account=(await client.query(`SELECT balance_cents FROM business_accounts WHERE business_id=$1 AND account_key='operating' FOR UPDATE`,[businessId])).rows[0]; if(!account||Number(account.balance_cents)<fee) throw new BusinessCommandError('business_insufficient_funds',409);
    await client.query(`UPDATE business_accounts SET balance_cents=balance_cents-$2,updated_at=now() WHERE business_id=$1 AND account_key='operating'`,[businessId,fee]); await client.query(`UPDATE business_licenses SET status='active',expires_at=now()+interval '30 days' WHERE id=$1`,[licenseId]);
    await client.query(`INSERT INTO business_ledger(business_id,entry_type,direction,amount_cents,memo) VALUES($1,'license','out',$2,$3)`,[businessId,fee,`License renewal · ${license.name}`]); await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} return getBusinessesState(db,playerId);
}

export async function setBusinessHours(db:Database,playerId:string,businessId:string,dayOfWeek:number,opensAt:string|null,closesAt:string|null,closed:boolean){
  await managerRole(db,businessId,playerId); if(!closed&&(!opensAt||!closesAt)) throw new BusinessCommandError('business_hours_invalid',400);
  await db.query({text:`INSERT INTO business_hours(business_id,day_of_week,opens_at,closes_at,closed) VALUES($1,$2,$3::time,$4::time,$5) ON CONFLICT(business_id,day_of_week) DO UPDATE SET opens_at=EXCLUDED.opens_at,closes_at=EXCLUDED.closes_at,closed=EXCLUDED.closed`,values:[businessId,dayOfWeek,opensAt,closesAt,closed]}); return getBusinessesState(db,playerId);
}
