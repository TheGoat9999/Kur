import { useEffect, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { Shell, type Screen } from './components/Shell';
import { CharacterView } from './features/character/CharacterView';
import { IntegrationView } from './features/integration/IntegrationView';
import { WorldView } from './features/world/WorldView';
import { HoodWalkOverlay } from './features/world/HoodWalkOverlay';
import { InventoryModalV05 } from './features/inventory/InventoryModalV05';
import { PhoneLauncher, PhoneOverlay } from './features/phone/PhoneOverlay';
import { FinanceView } from './features/finance/FinanceView';
import { VehiclesView, type VehicleViewMode } from './features/vehicles/VehiclesView';
import { JobsView } from './features/jobs/JobsView';
import { PoliceView } from './features/police/PoliceView';
import { JusticeView } from './features/justice/JusticeView';
import { EmsView } from './features/ems/EmsView';
import { Ems112Overlay } from './features/ems/Ems112Overlay';
import { RealEstateView } from './features/real-estate/RealEstateView';
import { AdminPanel } from './features/admin/AdminPanel';
import { useNotifications } from './components/Notifications';
import { getBootstrap, travelWorldMap } from './lib/api';
import { useI18n } from './i18n';

export function App() {
  const { locale, t } = useI18n();
  const { push } = useNotifications();
  const [state, setState] = useState<BootstrapState | null>(null);
  const [screen, setScreen] = useState<Screen>('world');
  const [vehicleMode, setVehicleMode] = useState<VehicleViewMode>('dealer');
  const [vehicleMapFocusId, setVehicleMapFocusId] = useState<string | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [emsWorkspaceOpen, setEmsWorkspaceOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [publicSafetyWorkspace, setPublicSafetyWorkspace] = useState<'police' | 'justice'>('police');
  const [adminOpen, setAdminOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getBootstrap().then(setState).catch(reason => setError(reason instanceof Error ? reason.message : String(reason))); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((key !== 'i' && key !== 'p') || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setVehicleMapFocusId(null);
      setScreen('world');
      setMenuOpen(false);
      setEmsWorkspaceOpen(false);
      setEmergencyOpen(false);
      if (key === 'i') {
        setPhoneOpen(false);
        setInventoryOpen(value => !value);
      } else {
        setInventoryOpen(false);
        setPhoneOpen(value => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function openDealer() {
      setInventoryOpen(false);
      setPhoneOpen(false);
      setEmsWorkspaceOpen(false);
      setEmergencyOpen(false);
      setMenuOpen(false);
      setVehicleMapFocusId(null);
      setVehicleMode('dealer');
      setScreen('vehicles');
    }

    const openService = (event: Event) => {
      const detail = (event as CustomEvent<{ serviceKey?: string }>).detail;
      if (detail?.serviceKey === 'vehicle_dealership') openDealer();
    };

    const travelService = async (event: Event) => {
      const detail = (event as CustomEvent<{ serviceKey?: string; segmentId?: string }>).detail;
      if (detail?.serviceKey !== 'vehicle_dealership' || !detail.segmentId) return;
      try {
        await travelWorldMap(detail.segmentId);
        setState(await getBootstrap());
        openDealer();
        push({ tone: 'success', title: locale === 'bg' ? 'Пристигна в Dorado Motors' : 'Arrived at Dorado Motors', message: locale === 'bg' ? 'Автокъщата вече е достъпна.' : 'The dealership is now accessible.' });
      } catch {
        push({ tone: 'error', title: t('common.actionBlocked'), message: locale === 'bg' ? 'Не можеш да стигнеш до автокъщата в момента.' : 'You cannot reach the dealership right now.' });
      }
    };

    window.addEventListener('sd:open-world-service', openService);
    window.addEventListener('sd:travel-world-service', travelService);
    return () => {
      window.removeEventListener('sd:open-world-service', openService);
      window.removeEventListener('sd:travel-world-service', travelService);
    };
  }, [locale, push, t]);

  function locateVehicle(vehicleId: string) {
    setInventoryOpen(false);
    setPhoneOpen(false);
    setEmsWorkspaceOpen(false);
    setEmergencyOpen(false);
    setMenuOpen(false);
    setVehicleMapFocusId(vehicleId);
    setScreen('world');
  }

  function changeScreen(next: Screen) {
    setEmsWorkspaceOpen(false);
    setEmergencyOpen(false);
    if (next === 'inventory') {
      setVehicleMapFocusId(null);
      setPhoneOpen(false);
      if (screen !== 'world') {
        setScreen('world');
        setInventoryOpen(true);
      } else {
        setInventoryOpen(value => !value);
      }
      setMenuOpen(false);
      return;
    }
    setVehicleMapFocusId(null);
    setInventoryOpen(false);
    setPhoneOpen(false);
    setScreen(next);
  }

  function openPhoneFeature(feature: 'finance' | 'jobs') {
    setVehicleMapFocusId(null);
    setPhoneOpen(false);
    setInventoryOpen(false);
    setEmsWorkspaceOpen(false);
    setEmergencyOpen(false);
    setMenuOpen(false);
    setScreen(feature);
  }

  if (error && !state) return <StartupError message={error} />;
  if (!state) return <div className="grid min-h-dvh place-items-center bg-[#091014] text-sm tracking-[0.18em] text-amber-200">{t('startup.connecting')}</div>;

  return (
    <Shell state={state} screen={screen} inventoryOpen={inventoryOpen} menuOpen={menuOpen} onScreen={changeScreen} onMenu={setMenuOpen}>
      {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-100">{error}</div>}
      {screen === 'world' && (
        <div className="world-inventory-stage h-full min-h-0">
          <WorldView state={state} onStateChange={setState} focusVehicleId={vehicleMapFocusId} onVehicleFocusHandled={() => setVehicleMapFocusId(null)} />
          {!inventoryOpen && !phoneOpen && !emergencyOpen && <HoodWalkOverlay state={state} onStateChange={setState} />}
          {!inventoryOpen && !phoneOpen && !emergencyOpen && <PhoneLauncher onOpen={() => setPhoneOpen(true)} />}
          {!inventoryOpen && !phoneOpen && !emergencyOpen && <button onClick={() => setEmergencyOpen(true)} className="absolute bottom-4 left-4 z-30 min-h-11 rounded-xl border border-red-300/25 bg-[#0b171d]/95 px-4 text-xs font-black tracking-wide text-red-100 shadow-xl backdrop-blur hover:border-red-300/45">112 · {locale === 'bg' ? 'Медицински сигнал' : 'Medical emergency'}</button>}
          {inventoryOpen && <InventoryModalV05 onStateChange={setState} onClose={() => setInventoryOpen(false)} />}
          {phoneOpen && <PhoneOverlay state={state} onClose={() => setPhoneOpen(false)} onOpenFeature={openPhoneFeature} onLocateVehicle={locateVehicle} />}
          {emergencyOpen && <Ems112Overlay onClose={() => setEmergencyOpen(false)} />}
        </div>
      )}
      {screen === 'character' && <CharacterView state={state} onStateChange={setState} />}
      {screen === 'finance' && <FinanceView onStateChange={setState} />}
      {screen === 'jobs' && <>
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,28,36,.92),rgba(8,17,22,.96))] p-4 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">SOL DORADO MEDICAL</div>
            <h2 className="mt-1 text-base font-black text-slate-50">{locale === 'bg' ? 'EMS · Служебен достъп' : 'EMS · Staff access'}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{locale === 'bg' ? 'Диспечерът, активните случаи и медицинският MDT са служебни инструменти и вече се отварят от секцията за работа и кариера, а не от публичния 112 бутон.' : 'Dispatch, active cases and the medical MDT are staff tools and now open from Jobs & Careers instead of the public 112 button.'}</p>
          </div>
          <button onClick={() => setEmsWorkspaceOpen(true)} className="min-h-11 shrink-0 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100 hover:border-cyan-300/45">✚ {locale === 'bg' ? 'Отвори EMS / MDT' : 'Open EMS / MDT'}</button>
        </section>
        <JobsView onStateChange={setState} />
        {emsWorkspaceOpen && <EmsView onStateChange={setState} onClose={() => setEmsWorkspaceOpen(false)} />}
      </>}
      {screen === 'property' && <RealEstateView onStateChange={setState} />}
      {screen === 'vehicles' && <VehiclesView state={state} mode={vehicleMode} onModeChange={setVehicleMode} onStateChange={setState} onWorld={() => { setVehicleMapFocusId(null); setScreen('world'); }} onLocateVehicle={locateVehicle} />}
      {screen === 'police' && <>
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#0a1116] p-2">
          <button onClick={() => setPublicSafetyWorkspace('police')} className={`min-h-10 rounded-xl px-4 text-xs font-black ${publicSafetyWorkspace === 'police' ? 'bg-cyan-300 text-slate-950' : 'bg-white/[.035] text-slate-300'}`}>SDPD · {locale === 'bg' ? 'Операции' : 'Operations'}</button>
          <button onClick={() => setPublicSafetyWorkspace('justice')} className={`min-h-10 rounded-xl px-4 text-xs font-black ${publicSafetyWorkspace === 'justice' ? 'bg-amber-300 text-slate-950' : 'bg-white/[.035] text-slate-300'}`}>{locale === 'bg' ? 'Правосъдие · Право · Корекции' : 'Justice · Legal · Corrections'}</button>
          <span className="ml-auto px-2 text-[10px] uppercase tracking-[.16em] text-slate-600">PUBLIC SAFETY → JUSTICE LIFECYCLE</span>
        </div>
        {publicSafetyWorkspace === 'police' ? <PoliceView /> : <JusticeView />}
      </>}
      {!['world', 'character', 'finance', 'inventory', 'vehicles', 'jobs', 'property', 'police'].includes(screen) && <IntegrationView feature={screen as 'hospitality'} />}
      {import.meta.env.DEV && <button onClick={() => setAdminOpen(true)} className="fixed bottom-4 right-4 z-[90] grid h-12 w-12 place-items-center rounded-full border border-amber-300/30 bg-[#0b171d]/95 text-lg text-amber-200 shadow-2xl backdrop-blur hover:border-amber-300/60" title={locale === 'bg' ? 'Администрация' : 'Administration'} aria-label={locale === 'bg' ? 'Отвори администрация' : 'Open administration'}>⚙</button>}
      {import.meta.env.DEV && <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} onGameplayStateChanged={async () => setState(await getBootstrap())} />}
    </Shell>
  );
}

function StartupError({ message }: { message: string }) {
  const { t } = useI18n();
  return <div className="grid min-h-dvh place-items-center bg-[#091014] p-5 text-slate-100"><div className="max-w-md rounded-2xl border border-red-400/20 bg-red-400/8 p-5"><b>{t('startup.title')}</b><p className="mt-2 text-sm leading-6 text-slate-300">{message}</p><p className="mt-3 text-xs text-slate-500">{t('startup.help')}</p></div></div>;
}