import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AdminMutationSchema, AdminStateSchema, CoreRegistrySchema, type AdminMutation, type AdminState, type CoreRegistry } from '@sol-dorado/contracts/admin';
import { useNotifications } from '../../components/Notifications';
import { useI18n } from '../../i18n';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

type Tab = 'core' | 'player' | 'items' | 'vehicles' | 'jobs' | 'access' | 'audit';
type ConfirmState = { title: string; message: string; confirmLabel: string; execute: () => void };

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
  const { push } = useNotifications();
  const [tab, setTab] = useState<Tab>('core');
  const [core, setCore] = useState<CoreRegistry | null>(null);
  const [state, setState] = useState<AdminState | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [cash, setCash] = useState('');
  const [itemQty, setItemQty] = useState<Record<string, number>>({});
  const [jobXp, setJobXp] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const copy = locale === 'bg' ? {
    title: 'Администрация', subtitle: 'Development control center', close: 'Затвори', refresh: 'Обнови', refreshing: 'Обновяване…', core: 'Core', player: 'Играч', items: 'Предмети', vehicles: 'Коли', jobs: 'Работи', access: 'Достъп', audit: 'История',
    search: 'Търси по име, ID или категория…', clear: 'Изчисти', cash: 'Cash', save: 'Задай', grant: 'Дай', remove: 'Премахни', enable: 'Отключи', disable: 'Нулирай', applyXp: 'Запази XP', roles: 'Роли', permissions: 'Permissions', allow: 'Разреши', deny: 'Забрани', reset: 'Наследи', noData: 'Няма данни', noResults: 'Няма резултати за това търсене.', devOnly: 'Само development', inventory: 'Предмети в инвентара',
    working: 'Обработва се…', successTitle: 'Admin промяната е приложена', errorTitle: 'Admin операцията е неуспешна', syncWarningTitle: 'Промяната е записана, но UI refresh-ът се провали', syncWarningMessage: 'Gameplay state-ът ще се синхронизира при следващо презареждане.', loaded: 'Admin state-ът е обновен.', results: 'резултата', effective: 'Ефективни права', canonical: 'Canonical registries', canonicalText: 'Items → CORE_ITEM_CATALOG · Jobs → Jobs AIO + Police + EMS + Real Estate · Vehicles → vehicle_models. Панелът използва тези източници директно, без втори ръчен каталог.',
    presets: 'Бързи стойности', owned: 'Притежавани', active: 'ACTIVE', xp: 'XP', standard: 'Стандартна', institutional: 'Институционална', confirm: 'Потвърди', cancel: 'Отказ', destructiveTitle: 'Потвърди destructive операция', removeVehicleConfirm: 'Тази кола ще бъде премахната от player ownership. Това е admin test действие и не може да бъде undo-нато автоматично.', resetJobConfirm: 'Job/career state-ът ще бъде нулиран за тестовия играч.', denyPermissionConfirm: 'Това permission ще бъде изрично забранено за текущия admin player.', selfProtected: 'Self-service защита: това право не може да бъде изключено от панела, за да не се заключиш извън Admin.',
    permissionRequired: 'Нямаш необходимото admin permission за това действие.', loadFailed: 'Admin панелът не можа да зареди данните.', auditHint: 'Последните 30 server-authoritative admin mutations.',
    actionSetCash: 'Cash променен', actionGrantItem: 'Предмет добавен', actionGrantVehicle: 'Кола добавена', actionRemoveVehicle: 'Кола премахната', actionSetJob: 'Job/career променен', actionSetRoles: 'Роли променени', actionSetPermission: 'Permission променено'
  } : {
    title: 'Administration', subtitle: 'Development control center', close: 'Close', refresh: 'Refresh', refreshing: 'Refreshing…', core: 'Core', player: 'Player', items: 'Items', vehicles: 'Vehicles', jobs: 'Jobs', access: 'Access', audit: 'Audit',
    search: 'Search by name, ID or category…', clear: 'Clear', cash: 'Cash', save: 'Set', grant: 'Grant', remove: 'Remove', enable: 'Unlock', disable: 'Reset', applyXp: 'Save XP', roles: 'Roles', permissions: 'Permissions', allow: 'Allow', deny: 'Deny', reset: 'Inherit', noData: 'No data', noResults: 'No results match this search.', devOnly: 'Development only', inventory: 'Inventory items',
    working: 'Working…', successTitle: 'Admin change applied', errorTitle: 'Admin operation failed', syncWarningTitle: 'Change saved, but UI refresh failed', syncWarningMessage: 'Gameplay state will synchronize on the next reload.', loaded: 'Admin state refreshed.', results: 'results', effective: 'Effective permissions', canonical: 'Canonical registries', canonicalText: 'Items → CORE_ITEM_CATALOG · Jobs → Jobs AIO + Police + EMS + Real Estate · Vehicles → vehicle_models. The panel reads these sources directly instead of maintaining duplicate lists.',
    presets: 'Quick values', owned: 'Owned', active: 'ACTIVE', xp: 'XP', standard: 'Standard', institutional: 'Institutional', confirm: 'Confirm', cancel: 'Cancel', destructiveTitle: 'Confirm destructive operation', removeVehicleConfirm: 'This vehicle will be removed from player ownership. This is an admin test action and cannot be automatically undone.', resetJobConfirm: 'The job/career state will be reset for the test player.', denyPermissionConfirm: 'This permission will be explicitly denied for the current admin player.', selfProtected: 'Self-service protection: this permission cannot be disabled in the panel so you do not lock yourself out of Admin.',
    permissionRequired: 'You do not have the required admin permission for this action.', loadFailed: 'The Admin panel could not load its data.', auditHint: 'Latest 30 server-authoritative admin mutations.',
    actionSetCash: 'Cash changed', actionGrantItem: 'Item granted', actionGrantVehicle: 'Vehicle granted', actionRemoveVehicle: 'Vehicle removed', actionSetJob: 'Job/career changed', actionSetRoles: 'Roles changed', actionSetPermission: 'Permission changed'
  };

  const busy = loading || pending !== null;
  const can = (permission: string) => Boolean(state?.effectivePermissions.includes(permission));

  function applyState(next: AdminState) {
    setState(next);
    setCash((next.player.cashCents / 100).toFixed(2));
    setJobXp(Object.fromEntries(next.jobs.map(job => [job.jobId, job.xp])));
  }

  function showError(reason: unknown, fallback = copy.errorTitle) {
    const code = reason instanceof Error ? reason.message : String(reason);
    const message = friendlyAdminError(code, locale, fallback);
    setError({ code, message });
    push({ tone: 'error', title: copy.errorTitle, message, duration: 6200 });
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([loadCore(), loadAdmin()]).then(([nextCore, nextState]) => {
      if (cancelled) return;
      setCore(nextCore);
      applyState(nextState);
    }).catch(reason => {
      if (!cancelled) showError(reason, copy.loadFailed);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirm) setConfirm(null); else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirm, onClose, open]);

  async function refresh(showFeedback = true) {
    if (busy) return;
    setLoading(true);
    setError(null);
    try {
      const [nextCore, nextState] = await Promise.all([loadCore(), loadAdmin()]);
      setCore(nextCore);
      applyState(nextState);
      if (showFeedback) push({ tone: 'success', title: copy.successTitle, message: copy.loaded });
    } catch (reason) {
      showError(reason, copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function run(input: AdminMutation, gameplay = true, key = input.action) {
    if (busy) return;
    setPending(key);
    setError(null);
    try {
      const message = successMessage(input, locale, core, state);
      const next = await mutate(input);
      applyState(next);
      push({ tone: 'success', title: copy.successTitle, message });
      if (gameplay) {
        try { await onGameplayStateChanged(); }
        catch { push({ tone: 'warning', title: copy.syncWarningTitle, message: copy.syncWarningMessage }); }
      }
    } catch (reason) {
      showError(reason);
    } finally {
      setPending(null);
    }
  }

  function confirmRun(config: Omit<ConfirmState, 'execute'>, input: AdminMutation, gameplay = true, key = input.action) {
    setConfirm({ ...config, execute: () => { setConfirm(null); void run(input, gameplay, key); } });
  }

  const normalized = query.trim().toLowerCase();
  const filteredItems = useMemo(() => core?.items.filter(item => !normalized || [item.key, item.displayName, item.category, item.subcategory].some(value => value.toLowerCase().includes(normalized))) ?? [], [core, normalized]);
  const filteredJobs = useMemo(() => core?.jobs.filter(job => !normalized || [job.id, job.titleBg, job.titleEn, job.category].some(value => value.toLowerCase().includes(normalized))) ?? [], [core, normalized]);
  const filteredVehicles = useMemo(() => core?.vehicles.filter(vehicle => !normalized || [vehicle.id, vehicle.brand, vehicle.model, vehicle.displayName, vehicle.vehicleClass].some(value => value.toLowerCase().includes(normalized))) ?? [], [core, normalized]);

  if (!open) return null;
  const tabs: Array<[Tab, string]> = [['core', copy.core], ['player', copy.player], ['items', copy.items], ['vehicles', copy.vehicles], ['jobs', copy.jobs], ['access', copy.access], ['audit', copy.audit]];
  const cashNumber = Number(cash);
  const cashValid = Number.isFinite(cashNumber) && cashNumber >= 0 && cashNumber <= 1_000_000_000;
  const searchable = tab === 'items' || tab === 'vehicles' || tab === 'jobs';
  const resultCount = tab === 'items' ? filteredItems.length : tab === 'vehicles' ? filteredVehicles.length : filteredJobs.length;
  const totalCount = tab === 'items' ? core?.items.length ?? 0 : tab === 'vehicles' ? core?.vehicles.length ?? 0 : core?.jobs.length ?? 0;

  return <div className="fixed inset-0 z-[120] bg-black/70 p-2 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true" aria-label={copy.title}>
    <section className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-amber-300/20 bg-[#081116] shadow-2xl">
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#0d1a20] px-4 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/10 text-amber-200">⚙</div>
        <div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">SOL DORADO CORE</div><h2 className="truncate text-lg font-black text-slate-50">{copy.title}</h2><p className="text-xs text-slate-400">{copy.subtitle} · {copy.devOnly}{pending ? ` · ${copy.working}` : ''}</p></div>
        <button disabled={busy} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-300 disabled:opacity-40" onClick={() => void refresh()}>{loading ? copy.refreshing : `↻ ${copy.refresh}`}</button>
        <button disabled={pending !== null} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-200 disabled:opacity-40" onClick={onClose}>{copy.close}</button>
      </header>
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
        {tabs.map(([id, label]) => <button key={id} onClick={() => { setTab(id); setQuery(''); }} className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-xs font-black ${tab === id ? 'bg-amber-300 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>{label}</button>)}
      </nav>
      {error && <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100"><div className="flex-1"><b>{error.message}</b><div className="mt-1 font-mono text-[10px] text-red-200/60">{error.code}</div></div><button className="px-2 text-red-100/70" onClick={() => setError(null)} aria-label={copy.close}>×</button></div>}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!core || !state ? <div className="grid h-full place-items-center text-sm text-slate-400">{loading ? copy.refreshing : copy.noData}</div> : <>
          {searchable && <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"><input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.search} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-slate-100 outline-none focus:border-amber-300/40"/><span className="whitespace-nowrap text-xs text-slate-500">{resultCount}/{totalCount} {copy.results}</span>{query && <button onClick={() => setQuery('')} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-400">{copy.clear}</button>}</div>}
          {tab === 'core' && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Stat label={copy.items} value={core.items.length}/><Stat label={copy.jobs} value={core.jobs.length}/><Stat label={copy.vehicles} value={core.vehicles.length}/><Stat label={copy.permissions} value={core.permissionKeys.length}/><Stat label={copy.effective} value={`${state.effectivePermissions.length}/${core.permissionKeys.length}`}/>
            <div className="md:col-span-2 xl:col-span-5 rounded-2xl border border-white/10 bg-white/[.03] p-4"><b className="text-sm text-slate-100">{copy.canonical}</b><p className="mt-2 text-sm leading-6 text-slate-400">{copy.canonicalText}</p></div>
          </div>}
          {tab === 'player' && <div className="grid gap-4 lg:grid-cols-2">
            <Card title={state.player.displayName ?? state.player.id}><div className="grid grid-cols-2 gap-3"><Stat label={copy.cash} value={`$${(state.player.cashCents / 100).toLocaleString()}`}/><Stat label={copy.inventory} value={state.inventoryCount}/></div></Card>
            <Card title={copy.cash}><div className="flex gap-2"><input type="number" min="0" max="1000000000" step="0.01" value={cash} onChange={event => setCash(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-slate-100"/><button disabled={busy || !can('admin.money') || !cashValid} onClick={() => void run({ action: 'set_cash', amountCents: Math.round(cashNumber * 100) }, true, 'cash')} className="rounded-xl bg-amber-300 px-4 font-black text-slate-950 disabled:opacity-30">{pending === 'cash' ? copy.working : copy.save}</button></div><div className="mt-3"><small className="text-[10px] font-black uppercase tracking-wide text-slate-500">{copy.presets}</small><div className="mt-2 flex flex-wrap gap-2">{[0, 10_000, 100_000, 1_000_000].map(value => <button key={value} disabled={busy} onClick={() => setCash(String(value))} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 hover:border-amber-300/30 hover:text-amber-200">${value.toLocaleString()}</button>)}</div></div>{!can('admin.money') && <PermissionNote text={copy.permissionRequired}/>}</Card>
          </div>}
          {tab === 'items' && (filteredItems.length ? <div className="grid gap-2 xl:grid-cols-2">{filteredItems.map(item => <div key={item.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{item.displayName}</b><small className="text-slate-500">{item.key} · {item.category} · {item.unitWeightGrams}g</small></div><input type="number" min="1" max="1000" value={itemQty[item.key] ?? 1} onChange={event => setItemQty(current => ({ ...current, [item.key]: Math.min(1000, Math.max(1, Math.floor(Number(event.target.value) || 1))) }))} className="h-10 w-16 rounded-lg border border-white/10 bg-black/20 px-2 text-center text-sm text-slate-100"/><button disabled={busy || !can('admin.items')} onClick={() => void run({ action: 'grant_item', itemKey: item.key, quantity: itemQty[item.key] ?? 1 }, true, `item:${item.key}`)} className="min-h-10 rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950 disabled:opacity-30">{pending === `item:${item.key}` ? '…' : copy.grant}</button></div>)}</div> : <EmptyState text={copy.noResults}/>) }
          {tab === 'vehicles' && <div className="space-y-4"><Card title={copy.owned}>{state.vehicles.length ? state.vehicles.map(vehicle => <div key={vehicle.id} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0"><span className="min-w-0 flex-1 truncate text-sm text-slate-200">{vehicle.displayName}{vehicle.active ? ` · ${copy.active}` : ''}</span><button disabled={busy || !can('admin.vehicles')} onClick={() => confirmRun({ title: copy.destructiveTitle, message: `${vehicle.displayName}. ${copy.removeVehicleConfirm}`, confirmLabel: copy.remove }, { action: 'remove_vehicle', vehicleId: vehicle.id }, true, `vehicle-remove:${vehicle.id}`)} className="rounded-lg border border-red-300/20 px-3 py-2 text-xs font-bold text-red-200 disabled:opacity-30">{pending === `vehicle-remove:${vehicle.id}` ? '…' : copy.remove}</button></div>) : <span className="text-sm text-slate-500">{copy.noData}</span>}{!can('admin.vehicles') && <PermissionNote text={copy.permissionRequired}/>}</Card>{filteredVehicles.length ? <div className="grid gap-2 xl:grid-cols-2">{filteredVehicles.map(vehicle => <div key={vehicle.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{vehicle.displayName}</b><small className="text-slate-500">{vehicle.id} · {vehicle.vehicleClass} · {vehicle.year}</small></div><button disabled={busy || !can('admin.vehicles')} onClick={() => void run({ action: 'grant_vehicle', modelId: vehicle.id }, true, `vehicle-grant:${vehicle.id}`)} className="min-h-10 rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950 disabled:opacity-30">{pending === `vehicle-grant:${vehicle.id}` ? '…' : copy.grant}</button></div>)}</div> : <EmptyState text={copy.noResults}/>}</div>}
          {tab === 'jobs' && (filteredJobs.length ? <div className="grid gap-2 xl:grid-cols-2">{filteredJobs.map(job => { const current = state.jobs.find(entry => entry.jobId === job.id); const name = locale === 'bg' ? job.titleBg : job.titleEn; const xpValue = Math.min(1_000_000, Math.max(0, Math.floor(jobXp[job.id] ?? current?.xp ?? 0))); return <div key={job.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{name}</b><small className="text-slate-500">{job.id} · {job.kind === 'standard' ? copy.standard : copy.institutional} · {copy.xp} {current?.xp ?? 0}</small></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${current?.enabled ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/5 text-slate-500'}`}>{current?.enabled ? 'ON' : 'OFF'}</span></div>{job.kind === 'standard' ? <div className="mt-3 flex gap-2"><input type="number" min="0" max="1000000" value={xpValue} onChange={event => setJobXp(values => ({ ...values, [job.id]: Math.min(1_000_000, Math.max(0, Math.floor(Number(event.target.value) || 0))) }))} className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-100"/><button disabled={busy || !can('admin.jobs')} onClick={() => void run({ action: 'set_job', jobId: job.id, enabled: true, xp: xpValue }, true, `job:${job.id}`)} className="rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950 disabled:opacity-30">{pending === `job:${job.id}` ? '…' : current?.enabled ? copy.applyXp : copy.enable}</button>{current?.enabled && <button disabled={busy || !can('admin.jobs')} onClick={() => confirmRun({ title: copy.destructiveTitle, message: `${name}. ${copy.resetJobConfirm}`, confirmLabel: copy.disable }, { action: 'set_job', jobId: job.id, enabled: false }, true, `job-reset:${job.id}`)} className="rounded-lg border border-red-300/20 px-3 text-xs font-black text-red-200 disabled:opacity-30">{copy.disable}</button>}</div> : <div className="mt-3 flex justify-end"><button disabled={busy || !can('admin.jobs')} onClick={() => current?.enabled ? confirmRun({ title: copy.destructiveTitle, message: `${name}. ${copy.resetJobConfirm}`, confirmLabel: copy.disable }, { action: 'set_job', jobId: job.id, enabled: false }, true, `job:${job.id}`) : void run({ action: 'set_job', jobId: job.id, enabled: true }, true, `job:${job.id}`)} className={`min-h-10 rounded-lg px-3 text-xs font-black disabled:opacity-30 ${current?.enabled ? 'border border-red-300/20 text-red-200' : 'bg-amber-300 text-slate-950'}`}>{pending === `job:${job.id}` ? '…' : current?.enabled ? copy.disable : copy.enable}</button></div>}</div>; })}</div> : <EmptyState text={copy.noResults}/>) }
          {tab === 'access' && <div className="grid gap-4 lg:grid-cols-2"><Card title={copy.roles}>{state.roles.map(role => { const checked = state.assignedRoleKeys.includes(role.key); const locked = role.key === 'owner'; return <label key={role.key} className="flex min-h-11 items-center gap-3 border-b border-white/5 py-2 last:border-0"><input type="checkbox" checked={checked} disabled={locked || busy || !can('admin.roles')} onChange={() => { const roleKeys = checked ? state.assignedRoleKeys.filter(key => key !== role.key) : [...state.assignedRoleKeys, role.key]; void run({ action: 'set_roles', roleKeys }, false, 'roles'); }}/><span className="flex-1 text-sm text-slate-200">{locale === 'bg' ? role.nameBg : role.nameEn}</span><small className="text-slate-500">{role.permissions.length}</small></label>; })}{!can('admin.roles') && <PermissionNote text={copy.permissionRequired}/>}</Card><Card title={copy.permissions}>{core.permissionKeys.map(permission => { const override = state.permissionOverrides[permission]; const effective = state.effectivePermissions.includes(permission); const selfProtected = permission === 'admin.roles' || permission === 'core.view'; return <div key={permission} className="border-b border-white/5 py-3 last:border-0"><div className="mb-2 flex items-center justify-between gap-2"><b className="text-xs text-slate-200">{permission}</b><span className={`rounded-full px-2 py-1 text-[10px] font-black ${effective ? 'bg-emerald-300/10 text-emerald-200' : 'bg-red-300/10 text-red-200'}`}>{effective ? 'ON' : 'OFF'}</span></div><div className="grid grid-cols-3 gap-1"><PermButton active={override === undefined} label={copy.reset} disabled={busy || !can('admin.roles')} onClick={() => void run({ action: 'set_permission', permissionKey: permission, allowed: null }, false, `perm:${permission}`)}/><PermButton active={override === true} label={copy.allow} disabled={busy || !can('admin.roles')} onClick={() => void run({ action: 'set_permission', permissionKey: permission, allowed: true }, false, `perm:${permission}`)}/><PermButton active={override === false} label={copy.deny} disabled={busy || !can('admin.roles') || selfProtected} onClick={() => confirmRun({ title: copy.destructiveTitle, message: `${permission}. ${copy.denyPermissionConfirm}`, confirmLabel: copy.deny }, { action: 'set_permission', permissionKey: permission, allowed: false }, false, `perm:${permission}`)}/></div>{selfProtected && <p className="mt-2 text-[10px] leading-4 text-amber-200/55">{copy.selfProtected}</p>}</div>; })}</Card></div>}
          {tab === 'audit' && <Card title={copy.audit}><p className="mb-3 text-xs text-slate-500">{copy.auditHint}</p>{state.audit.length ? state.audit.map(entry => <div key={entry.id} className="border-b border-white/5 py-3 last:border-0"><div className="flex items-center justify-between gap-3"><b className="text-xs text-slate-200">{auditLabel(entry.action, copy)}</b><small className="text-slate-500">{new Date(entry.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : 'en-US')}</small></div><pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/15 p-2 text-[10px] text-slate-500">{JSON.stringify(entry.payload, null, 2)}</pre></div>) : <span className="text-sm text-slate-500">{copy.noData}</span>}</Card>}
        </>}
      </div>
    </section>
    {confirm && <div className="absolute inset-0 z-[135] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl border border-red-300/20 bg-[#0d181d] p-5 shadow-2xl"><div className="text-[10px] font-black uppercase tracking-[.18em] text-red-300">ADMIN CONFIRMATION</div><h3 className="mt-2 text-lg font-black text-slate-50">{confirm.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{confirm.message}</p><div className="mt-5 flex justify-end gap-2"><button disabled={busy} onClick={() => setConfirm(null)} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300">{copy.cancel}</button><button disabled={busy} onClick={confirm.execute} className="min-h-11 rounded-xl border border-red-300/25 bg-red-400/10 px-4 text-sm font-black text-red-100">{copy.confirm}</button></div></div></div>}
  </div>;
}

function friendlyAdminError(code: string, locale: 'bg' | 'en', fallback: string) {
  const bg: Record<string, string> = {
    admin_session_missing: 'Липсва активна development сесия. Влез отново и отвори Admin.',
    admin_permission_denied: 'Тази операция е блокирана от текущите ти admin permissions.',
    admin_player_not_found: 'Development player-ът не беше намерен.',
    admin_item_unknown: 'Предметът вече не съществува в canonical item catalog.',
    admin_inventory_missing: 'Играчът няма player inventory container.',
    admin_inventory_capacity: 'Няма достатъчно свободен weight capacity в инвентара.',
    admin_inventory_full: 'Няма свободен inventory slot.',
    admin_vehicle_model_unknown: 'Vehicle model-ът вече не съществува в canonical vehicle registry.',
    admin_job_unknown: 'Job/career definition-ът вече не съществува в Core.',
    admin_role_unknown: 'Една от избраните роли не е валидна.',
    admin_owner_role_required_for_self_service: 'Owner ролята е защитена и не може да бъде премахната от self-service Admin.',
    admin_permission_unknown: 'Permission key-ят не е валиден.',
    admin_roles_permission_self_lockout: 'admin.roles е защитено от self-lockout.'
  };
  const en: Record<string, string> = {
    admin_session_missing: 'The development session is missing. Sign in again and reopen Admin.',
    admin_permission_denied: 'This operation is blocked by your current admin permissions.',
    admin_player_not_found: 'The development player could not be found.',
    admin_item_unknown: 'This item no longer exists in the canonical item catalog.',
    admin_inventory_missing: 'The player does not have a player inventory container.',
    admin_inventory_capacity: 'There is not enough free inventory weight capacity.',
    admin_inventory_full: 'There is no free inventory slot.',
    admin_vehicle_model_unknown: 'This vehicle model no longer exists in the canonical vehicle registry.',
    admin_job_unknown: 'This job/career definition no longer exists in Core.',
    admin_role_unknown: 'One of the selected roles is invalid.',
    admin_owner_role_required_for_self_service: 'The Owner role is protected and cannot be removed through self-service Admin.',
    admin_permission_unknown: 'The permission key is invalid.',
    admin_roles_permission_self_lockout: 'admin.roles is protected from self-lockout.'
  };
  return (locale === 'bg' ? bg : en)[code] ?? (code.startsWith('admin_request_') ? fallback : `${fallback} (${code})`);
}

function successMessage(input: AdminMutation, locale: 'bg' | 'en', core: CoreRegistry | null, state: AdminState | null) {
  const bg = locale === 'bg';
  if (input.action === 'set_cash') return bg ? `Cash е зададен на $${(input.amountCents / 100).toLocaleString()}.` : `Cash set to $${(input.amountCents / 100).toLocaleString()}.`;
  if (input.action === 'grant_item') { const name = core?.items.find(item => item.key === input.itemKey)?.displayName ?? input.itemKey; return bg ? `${input.quantity} × ${name} е добавен в инвентара.` : `${input.quantity} × ${name} added to inventory.`; }
  if (input.action === 'grant_vehicle') { const name = core?.vehicles.find(vehicle => vehicle.id === input.modelId)?.displayName ?? input.modelId; return bg ? `${name} е добавена към My Vehicles.` : `${name} added to My Vehicles.`; }
  if (input.action === 'remove_vehicle') { const name = state?.vehicles.find(vehicle => vehicle.id === input.vehicleId)?.displayName ?? input.vehicleId; return bg ? `${name} е премахната от player ownership.` : `${name} removed from player ownership.`; }
  if (input.action === 'set_job') { const job = core?.jobs.find(entry => entry.id === input.jobId); const name = job ? (bg ? job.titleBg : job.titleEn) : input.jobId; return input.enabled ? (bg ? `${name} е активирана${input.xp !== undefined ? ` с ${input.xp} XP` : ''}.` : `${name} enabled${input.xp !== undefined ? ` with ${input.xp} XP` : ''}.`) : (bg ? `${name} е нулирана.` : `${name} reset.`); }
  if (input.action === 'set_roles') return bg ? `Admin ролите са обновени: ${input.roleKeys.join(', ')}.` : `Admin roles updated: ${input.roleKeys.join(', ')}.`;
  if (input.action === 'set_permission') { const mode = input.allowed === null ? (bg ? 'наследява ролята' : 'inherits role') : input.allowed ? (bg ? 'разрешено' : 'allowed') : (bg ? 'забранено' : 'denied'); return `${input.permissionKey}: ${mode}.`; }
  return bg ? 'Промяната е приложена.' : 'Change applied.';
}

function auditLabel(action: string, copy: Record<string, string>) {
  const labels: Record<string, string> = { set_cash: copy.actionSetCash, grant_item: copy.actionGrantItem, grant_vehicle: copy.actionGrantVehicle, remove_vehicle: copy.actionRemoveVehicle, set_job: copy.actionSetJob, set_roles: copy.actionSetRoles, set_permission: copy.actionSetPermission };
  return labels[action] ?? action;
}

function Card({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="mb-3 text-sm font-black text-slate-100">{title}</h3>{children}</section>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-white/10 bg-black/15 p-3"><small className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</small><b className="mt-1 block text-xl text-slate-100">{value}</b></div>; }
function EmptyState({ text }: { text: string }) { return <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-6 text-center text-sm text-slate-500">{text}</div>; }
function PermissionNote({ text }: { text: string }) { return <p className="mt-3 rounded-lg border border-amber-300/10 bg-amber-300/5 p-2 text-[10px] leading-4 text-amber-100/60">{text}</p>; }
function PermButton({ label, active, disabled, onClick }: { label: string; active: boolean; disabled: boolean; onClick: () => void }) { return <button disabled={disabled} onClick={onClick} className={`min-h-9 rounded-lg border px-2 text-[10px] font-black disabled:opacity-30 ${active ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-white/10 text-slate-500'}`}>{label}</button>; }
