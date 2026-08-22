import { useEffect, useMemo, useState } from 'react';
import type { HospitalityState } from '@sol-dorado/contracts/hospitality';
import { useI18n } from '../../i18n';
import { getBusinesses } from '../businesses/businesses-api';
import { completeProduction, getHospitalityState, placePurchaseOrder, receiveShipment, runDemandCycle, startProduction } from './hospitality-api';

const EL_CAMINO_ID = '20000000-0000-4000-8000-000000000002';

type Zone = 'service' | 'kitchen' | 'stock' | 'deliveries';

export function HospitalityView() {
  const { locale } = useI18n();
  const bg = locale === 'bg';
  const [businessId, setBusinessId] = useState(EL_CAMINO_ID);
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [state, setState] = useState<HospitalityState | null>(null);
  const [zone, setZone] = useState<Zone>('service');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextBusinessId = businessId) {
    setError(null);
    try { setState(await getHospitalityState(nextBusinessId)); }
    catch (reason) { setState(null); setError(reason instanceof Error ? reason.message : String(reason)); }
  }

  useEffect(() => {
    getBusinesses().then(result => {
      const candidates = result.businesses.filter(business => ['restaurant','cafe','bar','bakery','nightclub'].includes(business.kind));
      setVenues(candidates.map(business => ({ id: business.id, name: business.name })));
      const preferred = candidates.find(business => business.id === EL_CAMINO_ID) ?? candidates[0];
      if (preferred) { setBusinessId(preferred.id); void refresh(preferred.id); }
    }).catch(reason => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(null); setMessage(null);
    try { await action(); setMessage(success); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  if (!state) return <section className="min-h-[60vh] rounded-3xl border border-white/10 bg-[#081216] p-5 text-slate-200">
    <div className="text-xs font-black uppercase tracking-[.18em] text-amber-300">SOL DORADO · HOSPITALITY</div>
    <h1 className="mt-2 text-2xl font-black">{bg ? 'Производство и доставки' : 'Production & Supply'}</h1>
    <p className="mt-3 text-sm text-slate-400">{error ?? (bg ? 'Зареждане на заведението…' : 'Loading venue…')}</p>
  </section>;

  const b = state.business;
  const shortageCount = state.shortages.filter(item => item.severity !== 'none').length;
  const activeShipments = state.shipments.filter(shipment => !['delivered','cancelled'].includes(shipment.status));

  return <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
    <header className="overflow-hidden rounded-3xl border border-amber-300/15 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,.12),transparent_36%),linear-gradient(140deg,#101a1e,#071014)] shadow-2xl">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">SOL DORADO · {b.concept.toUpperCase()}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black text-white">{b.name}</h1><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${b.status === 'open' ? 'bg-emerald-300/15 text-emerald-200' : 'bg-slate-700/60 text-slate-300'}`}>{b.status === 'open' ? (bg?'отворено':'open') : (bg?'затворено':'closed')}</span></div>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{b.district} · {b.streetSegment}{b.propertyName ? ` · ${b.propertyName}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs"><Metric label={bg?'Репутация':'Reputation'} value={`${b.reputation}/100`} /><Metric label={bg?'Капацитет':'Capacity'} value={`${b.capacity}`} /><Metric label={bg?'Оперативна сметка':'Operating'} value={money(b.operatingBalanceCents)} /></div>
      </div>
      {venues.length > 1 && <div className="flex gap-2 overflow-x-auto border-t border-white/8 px-5 py-3">{venues.map(venue => <button key={venue.id} onClick={() => { setBusinessId(venue.id); void refresh(venue.id); }} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold ${venue.id===businessId?'bg-amber-300 text-slate-950':'bg-white/5 text-slate-300'}`}>{venue.name}</button>)}</div>}
    </header>

    <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-[#081216]/95 p-2 md:grid-cols-4">
      <ZoneButton active={zone==='service'} onClick={()=>setZone('service')} icon="◉" label={bg?'Обслужване':'Service'} hint={state.demand ? `${state.demand.servedCustomers}/${state.demand.requestedCustomers}` : 'NPC'} />
      <ZoneButton active={zone==='kitchen'} onClick={()=>setZone('kitchen')} icon="♨" label={bg?'Кухня':'Kitchen'} hint={`${state.production.filter(x=>x.status==='preparing').length}`} />
      <ZoneButton active={zone==='stock'} onClick={()=>setZone('stock')} icon="▦" label={bg?'Склад':'Stock'} hint={shortageCount?`${shortageCount} !`:'OK'} />
      <ZoneButton active={zone==='deliveries'} onClick={()=>setZone('deliveries')} icon="➜" label={bg?'Доставки':'Deliveries'} hint={`${activeShipments.length}`} />
    </nav>

    {(message || error) && <div className={`rounded-xl border p-3 text-sm ${error?'border-red-300/20 bg-red-300/8 text-red-100':'border-emerald-300/20 bg-emerald-300/8 text-emerald-100'}`}>{error ?? message}</div>}

    {zone === 'service' && <ServiceZone state={state} bg={bg} disabled={busy || !b.canManage} onRun={() => act(()=>runDemandCycle(businessId),bg?'Обслужването приключи.':'Service cycle completed.')} />}
    {zone === 'kitchen' && <KitchenZone state={state} bg={bg} disabled={busy} onStart={(recipeKey,batches)=>act(()=>startProduction(businessId,recipeKey,batches),bg?'Производството започна.':'Production started.')} onComplete={batchId=>act(()=>completeProduction(batchId),bg?'Партидата е готова за продажба.':'Batch moved to sale stock.')} />}
    {zone === 'stock' && <StockZone state={state} bg={bg} disabled={busy || !b.canManage} onOrder={(supplierId,destinationPropertyId,itemKey,quantity)=>act(()=>placePurchaseOrder(businessId,supplierId,destinationPropertyId,[{itemKey,quantity}]),bg?'Поръчката е изпратена към доставчика.':'Purchase order dispatched.')} />}
    {zone === 'deliveries' && <DeliveriesZone state={state} bg={bg} disabled={busy} onReceive={shipmentId=>act(()=>receiveShipment(shipmentId),bg?'Пратката е приета в бизнес наличността.':'Shipment received into business stock.')} />}
  </div>;
}

function ServiceZone({state,bg,disabled,onRun}:{state:HospitalityState;bg:boolean;disabled:boolean;onRun:()=>void}) {
  const d=state.demand;
  return <Panel title={bg?'Зала и NPC търсене':'Floor & NPC demand'} subtitle={bg?'Отварянето, цените, наличността и репутацията определят реалното търсене.':'Opening state, price, stock and reputation drive real demand.'}>
    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label={bg?'Заявени':'Demand'} value={d?String(d.requestedCustomers):'—'} /><Metric label={bg?'Обслужени':'Served'} value={d?String(d.servedCustomers):'—'} /><Metric label={bg?'Загубени':'Lost'} value={d?String(d.lostCustomers):'—'} /><Metric label={bg?'Оборот':'Revenue'} value={d?money(d.revenueCents):'—'} /></div><button disabled={disabled} onClick={onRun} className="min-h-12 rounded-xl bg-amber-300 px-5 text-sm font-black text-slate-950 disabled:opacity-40">{bg?'Пусни сервизен цикъл':'Run service cycle'}</button></div>
  </Panel>;
}

function KitchenZone({state,bg,disabled,onStart,onComplete}:{state:HospitalityState;bg:boolean;disabled:boolean;onStart:(key:string,batches:number)=>void;onComplete:(id:string)=>void}) {
  return <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><Panel title={bg?'Кухненска линия':'Kitchen line'} subtitle={bg?'Рецептата консумира истински business stock и създава партида с качество.':'Recipes consume real business stock and create quality-bearing batches.'}><div className="space-y-2">{state.recipes.map(recipe=><div key={recipe.key} className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-slate-100">{bg?recipe.nameBg:recipe.nameEn}</b><p className="mt-1 text-xs text-slate-500">{recipe.lines.map(line=>`${line.itemKey} × ${line.quantity}`).join(' · ')} → {recipe.outputItemKey}</p></div><button disabled={disabled} onClick={()=>onStart(recipe.key,1)} className="min-h-10 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 text-xs font-black text-amber-100 disabled:opacity-40">{bg?'Приготви 1':'Prepare 1'}</button></div></div>)}</div></Panel><Panel title={bg?'Активни партиди':'Active batches'} subtitle={bg?'Готовността се проверява от сървъра, не от браузъра.':'Readiness is server-timed, not browser-authoritative.'}><div className="space-y-2">{state.production.length===0?<Empty text={bg?'Няма започнати партиди.':'No batches yet.'}/>:state.production.slice(0,8).map(batch=><div key={batch.id} className="rounded-xl border border-white/8 p-3 text-xs"><div className="flex items-center justify-between"><b>{batch.recipeKey}</b><span className="text-slate-400">{batch.status}</span></div><div className="mt-1 text-slate-500">{new Date(batch.readyAt).toLocaleTimeString()}</div>{batch.status==='preparing'&&<button disabled={disabled} onClick={()=>onComplete(batch.id)} className="mt-2 min-h-9 rounded-lg bg-white/8 px-3 font-bold text-slate-200 disabled:opacity-40">{bg?'Провери / завърши':'Check / complete'}</button>}</div>)}</div></Panel></div>;
}

function StockZone({state,bg,disabled,onOrder}:{state:HospitalityState;bg:boolean;disabled:boolean;onOrder:(supplierId:string,destinationPropertyId:string|null,itemKey:string,quantity:number)=>void}) {
  const supplier=state.suppliers[0]; const destination=state.warehouses.find(x=>x.kind==='warehouse') ?? state.warehouses[0];
  return <div className="grid gap-4 lg:grid-cols-[1fr_.72fr]"><Panel title={bg?'Business stock':'Business stock'} subtitle={bg?'Наличност, входящ товар, качество и freshness по реални партиди.':'On-hand, incoming freight, lot quality and freshness.'}><div className="divide-y divide-white/7">{state.stock.map(item=><div key={item.itemKey} className="grid grid-cols-[1fr_auto] gap-3 py-3"><div><div className="flex items-center gap-2"><b className="text-sm">{item.displayName}</b>{item.severity!=='none'&&<span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${item.severity==='shortage'?'bg-red-300/15 text-red-200':'bg-amber-300/15 text-amber-200'}`}>{item.severity}</span>}</div><p className="mt-1 text-[11px] text-slate-500">{bg?'налични':'on hand'} {item.quantity} · {bg?'входящи':'incoming'} {item.incomingQuantity} · Q {item.averageQuality??'—'} · F {item.freshnessPercent??'—'}%</p></div>{supplier&&<button disabled={disabled} onClick={()=>onOrder(supplier.id,destination?.propertyId??null,item.itemKey,Math.max(5,item.reorderPoint*2))} className="min-h-10 rounded-xl border border-cyan-300/20 bg-cyan-300/8 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40">{bg?'Поръчай':'Order'}</button>}</div>)}</div></Panel><Panel title={bg?'Физически складове':'Physical storage'} subtitle={bg?'Складът е Real Estate локация, не отделна собственост.':'Warehouses are Real Estate locations, not duplicate ownership.'}>{state.warehouses.map(location=><div key={location.id} className="mb-2 rounded-xl border border-white/8 p-3"><b className="text-sm">{location.label}</b><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-cyan-300/70" style={{width:`${Math.min(100,location.usedUnits/location.capacityUnits*100)}%`}} /></div><p className="mt-1 text-[11px] text-slate-500">{location.usedUnits} / {location.capacityUnits} {bg?'единици':'units'}</p></div>)}</Panel></div>;
}

function DeliveriesZone({state,bg,disabled,onReceive}:{state:HospitalityState;bg:boolean;disabled:boolean;onReceive:(id:string)=>void}) {
  return <Panel title={bg?'Товарен вход':'Freight arrivals'} subtitle={bg?'Маршрут, ETA, надеждност и закъснение са част от икономическия loop.':'Route, ETA, reliability and delays are part of the economic loop.'}><div className="space-y-3">{state.shipments.length===0?<Empty text={bg?'Няма пратки. Поръчай стока от Склад.':'No shipments. Place a stock order first.'}/>:state.shipments.map(shipment=><div key={shipment.id} className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><b>{shipment.originLabel}</b><span className="rounded-full bg-white/7 px-2 py-1 text-[9px] font-black uppercase text-slate-300">{shipment.status}</span></div><p className="mt-1 text-xs text-slate-500">{shipment.vehicleClass} · {shipment.routeKey}</p><p className="mt-1 text-xs text-slate-400">ETA {shipment.etaAt?new Date(shipment.etaAt).toLocaleString():'—'}{shipment.delayMinutes>0?` · +${shipment.delayMinutes} min`:''}</p></div>{!['delivered','cancelled'].includes(shipment.status)&&<button disabled={disabled} onClick={()=>onReceive(shipment.id)} className="min-h-11 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 text-xs font-black text-emerald-100 disabled:opacity-40">{bg?'Приеми товара':'Receive freight'}</button>}</div><div className="mt-3 flex flex-wrap gap-2">{shipment.lines.map(line=><span key={line.itemKey} className="rounded-lg bg-black/20 px-2 py-1 text-[10px] text-slate-400">{line.itemKey} × {line.quantity}</span>)}</div></div>)}</div></Panel>;
}

function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section className="rounded-3xl border border-white/9 bg-[#081216] p-4 shadow-xl sm:p-5"><h2 className="text-lg font-black text-slate-100">{title}</h2><p className="mt-1 mb-4 text-xs leading-5 text-slate-500">{subtitle}</p>{children}</section>}
function ZoneButton({active,onClick,icon,label,hint}:{active:boolean;onClick:()=>void;icon:string;label:string;hint:string}){return <button onClick={onClick} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-left ${active?'bg-amber-300 text-slate-950':'bg-white/[.035] text-slate-300'}`}><span className="text-lg">{icon}</span><span className="min-w-0 flex-1 text-xs font-black">{label}</span><span className={`text-[10px] font-bold ${active?'text-slate-700':'text-slate-600'}`}>{hint}</span></button>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2"><div className="text-[9px] uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-0.5 font-black text-slate-100">{value}</div></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">{text}</div>}
function money(cents:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)}
