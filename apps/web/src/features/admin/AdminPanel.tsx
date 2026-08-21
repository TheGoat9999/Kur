import { useEffect, useMemo, useState } from 'react';
import { AdminMutationSchema, AdminStateSchema, CoreRegistrySchema, type AdminMutation, type AdminState, type CoreRegistry } from '@sol-dorado/contracts/admin';
import { useI18n } from '../../i18n';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

type Tab = 'core' | 'player' | 'items' | 'vehicles' | 'jobs' | 'access' | 'audit';

interface Props {
  open: boolean;
  onClose: () => void;
  onGameplayStateChanged: () => Promise<void> | void;
}

async function adminFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('admin_session_missing');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers }
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? `admin_request_${response.status}`);
  return body;
}

async function loadCore() { return CoreRegistrySchema.parse(await adminFetch('/v1/core')); }
async function loadAdmin() { return AdminStateSchema.parse(await adminFetch('/v1/admin')); }
async function mutate(input: AdminMutation) {
  return AdminStateSchema.parse(await adminFetch('/v1/admin/mutate', { method: 'POST', body: JSON.stringify(AdminMutationSchema.parse(input)) }));
}

export function AdminPanel({ open, onClose, onGameplayStateChanged }: Props) {
  const { locale } = useI18n();
  const [tab, setTab] = useState<Tab>('core');
  const [core, setCore] = useState<CoreRegistry | null>(null);
  const [state, setState] = useState<AdminState | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cash, setCash] = useState('');
  const [itemQty, setItemQty] = useState<Record<string, number>>({});

  const copy = locale === 'bg' ? {
    title: 'Администрация', subtitle: 'Development control center', close: 'Затвори', core: 'Core', player: 'Играч', items: 'Предмети', vehicles: 'Коли', jobs: 'Работи', access: 'Достъп', audit: 'История',
    search: 'Търси...', cash: 'Cash', save: 'Задай', grant: 'Дай', remove: 'Премахни', enable: 'Отключи', disable: 'Нулирай', roles: 'Роли', permissions: 'Permissions', inherited: 'По роля', allow: 'Разреши', deny: 'Забрани', reset: 'Наследи', noData: 'Няма данни', devOnly: 'Само development', inventory: 'Предмети в инвентара'
  } : {
    title: 'Administration', subtitle: 'Development control center', close: 'Close', core: 'Core', player: 'Player', items: 'Items', vehicles: 'Vehicles', jobs: 'Jobs', access: 'Access', audit: 'Audit',
    search: 'Search...', cash: 'Cash', save: 'Set', grant: 'Grant', remove: 'Remove', enable: 'Unlock', disable: 'Reset', roles: 'Roles', permissions: 'Permissions', inherited: 'Inherited', allow: 'Allow', deny: 'Deny', reset: 'Inherit', noData: 'No data', devOnly: 'Development only', inventory: 'Inventory items'
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([loadCore(), loadAdmin()]).then(([nextCore, nextState]) => {
      setCore(nextCore); setState(nextState); setCash((nextState.player.cashCents / 100).toFixed(2));
    }).catch(reason => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [open]);

  async function run(input: AdminMutation, gameplay = true) {
    setBusy(true); setError(null);
    try {
      const next = await mutate(input);
      setState(next);
      setCash((next.player.cashCents / 100).toFixed(2));
      if (gameplay) await onGameplayStateChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  const normalized = query.trim().toLowerCase();
  const filteredItems = useMemo(() => core?.items.filter(item => !normalized || [item.key,item.displayName,item.category,item.subcategory].some(value => value.toLowerCase().includes(normalized))) ?? [], [core, normalized]);
  const filteredJobs = useMemo(() => core?.jobs.filter(job => !normalized || [job.id,job.titleBg,job.titleEn,job.category].some(value => value.toLowerCase().includes(normalized))) ?? [], [core, normalized]);
  const filteredVehicles = useMemo(() => core?.vehicles.filter(vehicle => !normalized || [vehicle.id,vehicle.brand,vehicle.model,vehicle.displayName].some(value => value.toLowerCase().includes(normalized))) ?? [], [core, normalized]);

  if (!open) return null;
  const tabs: Array<[Tab,string]> = [['core',copy.core],['player',copy.player],['items',copy.items],['vehicles',copy.vehicles],['jobs',copy.jobs],['access',copy.access],['audit',copy.audit]];

  return <div className="fixed inset-0 z-[120] bg-black/70 p-2 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true">
    <section className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-amber-300/20 bg-[#081116] shadow-2xl">
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#0d1a20] px-4 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/10 text-amber-200">⚙</div>
        <div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">SOL DORADO CORE</div><h2 className="truncate text-lg font-black text-slate-50">{copy.title}</h2><p className="text-xs text-slate-400">{copy.subtitle} · {copy.devOnly}</p></div>
        <button className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-200" onClick={onClose}>{copy.close}</button>
      </header>
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
        {tabs.map(([id,label]) => <button key={id} onClick={() => { setTab(id); setQuery(''); }} className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-xs font-black ${tab===id?'bg-amber-300 text-slate-950':'text-slate-400 hover:bg-white/5'}`}>{label}</button>)}
      </nav>
      {error && <div className="mx-4 mt-3 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!core || !state ? <div className="grid h-full place-items-center text-sm text-slate-400">Loading…</div> : <>
          {(['items','vehicles','jobs'] as Tab[]).includes(tab) && <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={copy.search} className="mb-4 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-slate-100 outline-none focus:border-amber-300/40" />}
          {tab==='core' && <div className="grid gap-3 md:grid-cols-4">
            <Stat label={copy.items} value={core.items.length}/><Stat label={copy.jobs} value={core.jobs.length}/><Stat label={copy.vehicles} value={core.vehicles.length}/><Stat label={copy.permissions} value={core.permissionKeys.length}/>
            <div className="md:col-span-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><b className="text-sm text-slate-100">Canonical registries</b><p className="mt-2 text-sm leading-6 text-slate-400">Items → CORE_ITEM_CATALOG · Jobs → Jobs AIO + Police + EMS + Real Estate · Vehicles → vehicle_models database table. The panel reads these sources instead of maintaining duplicate lists.</p></div>
          </div>}
          {tab==='player' && <div className="grid gap-4 lg:grid-cols-2">
            <Card title={state.player.displayName ?? state.player.id}><div className="grid grid-cols-2 gap-3"><Stat label={copy.cash} value={`$${(state.player.cashCents/100).toLocaleString()}`}/><Stat label={copy.inventory} value={state.inventoryCount}/></div></Card>
            <Card title={copy.cash}><div className="flex gap-2"><input type="number" min="0" step="0.01" value={cash} onChange={e=>setCash(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-slate-100"/><button disabled={busy} onClick={()=>run({action:'set_cash',amountCents:Math.max(0,Math.round(Number(cash||0)*100))})} className="rounded-xl bg-amber-300 px-4 font-black text-slate-950 disabled:opacity-50">{copy.save}</button></div></Card>
          </div>}
          {tab==='items' && <div className="grid gap-2 xl:grid-cols-2">{filteredItems.map(item=><div key={item.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{item.displayName}</b><small className="text-slate-500">{item.key} · {item.category} · {item.unitWeightGrams}g</small></div><input type="number" min="1" max="1000" value={itemQty[item.key]??1} onChange={e=>setItemQty(v=>({...v,[item.key]:Math.max(1,Number(e.target.value)||1)}))} className="h-10 w-16 rounded-lg border border-white/10 bg-black/20 px-2 text-center text-sm text-slate-100"/><button disabled={busy||!state.effectivePermissions.includes('admin.items')} onClick={()=>run({action:'grant_item',itemKey:item.key,quantity:itemQty[item.key]??1})} className="min-h-10 rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950 disabled:opacity-30">{copy.grant}</button></div>)}</div>}
          {tab==='vehicles' && <div className="space-y-4"><Card title={locale==='bg'?'Притежавани':'Owned'}>{state.vehicles.length?state.vehicles.map(vehicle=><div key={vehicle.id} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0"><span className="flex-1 text-sm text-slate-200">{vehicle.displayName}{vehicle.active?' · ACTIVE':''}</span><button disabled={busy} onClick={()=>run({action:'remove_vehicle',vehicleId:vehicle.id})} className="rounded-lg border border-red-300/20 px-3 py-2 text-xs font-bold text-red-200">{copy.remove}</button></div>):<span className="text-sm text-slate-500">{copy.noData}</span>}</Card><div className="grid gap-2 xl:grid-cols-2">{filteredVehicles.map(vehicle=><div key={vehicle.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{vehicle.displayName}</b><small className="text-slate-500">{vehicle.id} · {vehicle.vehicleClass}</small></div><button disabled={busy} onClick={()=>run({action:'grant_vehicle',modelId:vehicle.id})} className="min-h-10 rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950">{copy.grant}</button></div>)}</div></div>}
          {tab==='jobs' && <div className="grid gap-2 xl:grid-cols-2">{filteredJobs.map(job=>{const current=state.jobs.find(entry=>entry.jobId===job.id);return <div key={job.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{locale==='bg'?job.titleBg:job.titleEn}</b><small className="text-slate-500">{job.id} · {job.kind} · XP {current?.xp??0}</small></div><button disabled={busy} onClick={()=>run({action:'set_job',jobId:job.id,enabled:!current?.enabled,xp:current?.enabled?undefined:2500})} className={`min-h-10 rounded-lg px-3 text-xs font-black ${current?.enabled?'border border-red-300/20 text-red-200':'bg-amber-300 text-slate-950'}`}>{current?.enabled?copy.disable:copy.enable}</button></div>})}</div>}
          {tab==='access' && <div className="grid gap-4 lg:grid-cols-2"><Card title={copy.roles}>{state.roles.map(role=>{const checked=state.assignedRoleKeys.includes(role.key);const locked=role.key==='owner';return <label key={role.key} className="flex min-h-11 items-center gap-3 border-b border-white/5 py-2 last:border-0"><input type="checkbox" checked={checked} disabled={locked||busy} onChange={()=>{const roleKeys=checked?state.assignedRoleKeys.filter(key=>key!==role.key):[...state.assignedRoleKeys,role.key];run({action:'set_roles',roleKeys},false)}}/><span className="flex-1 text-sm text-slate-200">{locale==='bg'?role.nameBg:role.nameEn}</span><small className="text-slate-500">{role.permissions.length}</small></label>})}</Card><Card title={copy.permissions}>{core.permissionKeys.map(permission=>{const override=state.permissionOverrides[permission];const effective=state.effectivePermissions.includes(permission);return <div key={permission} className="border-b border-white/5 py-3 last:border-0"><div className="mb-2 flex items-center justify-between gap-2"><b className="text-xs text-slate-200">{permission}</b><span className={`rounded-full px-2 py-1 text-[10px] font-black ${effective?'bg-emerald-300/10 text-emerald-200':'bg-red-300/10 text-red-200'}`}>{effective?'ON':'OFF'}</span></div><div className="grid grid-cols-3 gap-1"><PermButton active={override===undefined} label={copy.reset} disabled={busy} onClick={()=>run({action:'set_permission',permissionKey:permission,allowed:null},false)}/><PermButton active={override===true} label={copy.allow} disabled={busy} onClick={()=>run({action:'set_permission',permissionKey:permission,allowed:true},false)}/><PermButton active={override===false} label={copy.deny} disabled={busy||permission==='admin.roles'} onClick={()=>run({action:'set_permission',permissionKey:permission,allowed:false},false)}/></div></div>})}</Card></div>}
          {tab==='audit' && <Card title={copy.audit}>{state.audit.length?state.audit.map(entry=><div key={entry.id} className="border-b border-white/5 py-3 last:border-0"><div className="flex items-center justify-between gap-3"><b className="text-xs text-slate-200">{entry.action}</b><small className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</small></div><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[10px] text-slate-500">{JSON.stringify(entry.payload,null,2)}</pre></div>):<span className="text-sm text-slate-500">{copy.noData}</span>}</Card>}
        </>}
      </div>
    </section>
  </div>;
}

function Card({title,children}:{title:string;children:React.ReactNode}) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="mb-3 text-sm font-black text-slate-100">{title}</h3>{children}</section>; }
function Stat({label,value}:{label:string;value:string|number}) { return <div className="rounded-xl border border-white/10 bg-black/15 p-3"><small className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</small><b className="mt-1 block text-xl text-slate-100">{value}</b></div>; }
function PermButton({label,active,disabled,onClick}:{label:string;active:boolean;disabled:boolean;onClick:()=>void}) { return <button disabled={disabled} onClick={onClick} className={`min-h-9 rounded-lg border px-2 text-[10px] font-black disabled:opacity-30 ${active?'border-amber-300/40 bg-amber-300/10 text-amber-200':'border-white/10 text-slate-500'}`}>{label}</button>; }
