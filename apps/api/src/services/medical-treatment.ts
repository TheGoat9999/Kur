import type {Database} from '../db.js';
import {getItemDefinition} from '../domain/items/index.js';
import {NeedsCommandError} from './needs.js';

const treatment:Record<string,{bleeding?:number;pain?:number;minutes?:number}>={
  bandage:{bleeding:1,minutes:45},gauze:{bleeding:1,minutes:40},antiseptic:{minutes:35},first_aid_kit:{bleeding:1,pain:8,minutes:35},medkit:{bleeding:2,pain:15,minutes:25},painkillers:{pain:18},splint:{pain:10,minutes:90},tourniquet:{bleeding:3,pain:4,minutes:60},trauma_dressing:{bleeding:2,minutes:45},burn_dressing:{pain:8,minutes:70},saline_bag:{pain:4}
};

export async function useMedicalInventoryItem(db:Database,playerId:string,itemId:string){
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    await client.query(`INSERT INTO player_needs_runtime(player_id) VALUES($1) ON CONFLICT(player_id) DO NOTHING`,[playerId]);
    const runtime=(await client.query(`SELECT consciousness,care_state FROM player_needs_runtime WHERE player_id=$1 FOR UPDATE`,[playerId])).rows[0];
    if(runtime.consciousness!=='conscious')throw new NeedsCommandError('unconscious_cannot_use_item',409);
    if(runtime.care_state==='transporting')throw new NeedsCommandError('transport_blocks_item_use',409);
    const item=(await client.query(`SELECT i.* FROM inventory_items i JOIN inventory_containers c ON c.id=i.container_id WHERE i.id=$1 AND i.player_id=$2 AND c.container_key='player' FOR UPDATE OF i`,[itemId,playerId])).rows[0];
    if(!item)throw new NeedsCommandError('inventory_item_not_carried',409);
    const definition=getItemDefinition(item.item_key); const care=treatment[item.item_key];
    if(!definition||definition.category!=='medical'||!care)throw new NeedsCommandError('medical_item_not_treatment',409);
    const effect=definition.useEffects;
    await client.query(`UPDATE player_state SET health=GREATEST(0,LEAST(100,health+$2)),energy=GREATEST(0,LEAST(100,energy+$3)),satiety=GREATEST(0,LEAST(100,satiety+$4)),hydration=GREATEST(0,LEAST(100,hydration+$5)),stress=GREATEST(0,LEAST(100,stress+$6)),version=version+1,updated_at=now() WHERE player_id=$1`,[playerId,effect.health??0,effect.energy??0,effect.satiety??0,effect.hydration??0,effect.stress??0]);
    if(care.pain)await client.query(`UPDATE player_needs_runtime SET pain=GREATEST(0,pain-$2),updated_at=now() WHERE player_id=$1`,[playerId,care.pain]);
    if(care.bleeding!==undefined)await client.query(`UPDATE player_injuries SET bleeding=GREATEST(0,bleeding-$2),treated=true,recovery_until=COALESCE(recovery_until,now()+($3*interval '1 minute')),updated_at=now() WHERE id=(SELECT id FROM player_injuries WHERE player_id=$1 AND bleeding>0 ORDER BY bleeding DESC,severity DESC,created_at LIMIT 1)`,[playerId,care.bleeding,care.minutes??60]);
    else if(care.minutes)await client.query(`UPDATE player_injuries SET treated=true,recovery_until=COALESCE(recovery_until,now()+($2*interval '1 minute')),updated_at=now() WHERE id=(SELECT id FROM player_injuries WHERE player_id=$1 AND treated=false ORDER BY severity DESC,created_at LIMIT 1)`,[playerId,care.minutes]);
    if(item.quantity===1)await client.query(`DELETE FROM inventory_items WHERE id=$1`,[item.id]);else await client.query(`UPDATE inventory_items SET quantity=quantity-1,updated_at=now() WHERE id=$1`,[item.id]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
