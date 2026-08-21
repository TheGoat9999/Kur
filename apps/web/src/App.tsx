import { useEffect, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { Shell, type Screen } from './components/Shell';
import { CharacterView } from './features/character/CharacterView';
import { IntegrationView } from './features/integration/IntegrationView';
import { WorldView } from './features/world/WorldView';
import { InventoryModalV05 } from './features/inventory/InventoryModalV05';
import { FinanceView } from './features/finance/FinanceView';
import { VehiclesView, type VehicleViewMode } from './features/vehicles/VehiclesView';
import { useNotifications } from './components/Notifications';
import { getBootstrap, travelWorldMap } from './lib/api';
import { useI18n } from './i18n';

export function App() {
  const { locale, t } = useI18n();
  const { push } = useNotifications();
  const [state, setState] = useState<BootstrapState | null>(null);
  const [screen, setScreen] = useState<Screen>('world');
  const [vehicleMode, setVehicleMode] = useState<VehicleViewMode>('my');
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getBootstrap().then(setState).catch(reason => setError(reason instanceof Error ? reason.message : String(reason))); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'i' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setScreen('world');
      setInventoryOpen(value => !value);
      setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function openDealer() {
      setInventoryOpen(false);
      setMenuOpen(false);
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

  function changeScreen(next: Screen) {
    if (next === 'inventory') {
      if (screen !== 'world') {
        setScreen('world');
        setInventoryOpen(true);
      } else {
        setInventoryOpen(value => !value);
      }
      setMenuOpen(false);
      return;
    }
    if (next === 'vehicles') setVehicleMode('my');
    setInventoryOpen(false);
    setScreen(next);
  }

  if (error && !state) return <StartupError message={error} />;
  if (!state) return <div className="grid min-h-dvh place-items-center bg-[#091014] text-sm tracking-[0.18em] text-amber-200">{t('startup.connecting')}</div>;

  return (
    <Shell state={state} screen={screen} inventoryOpen={inventoryOpen} menuOpen={menuOpen} onScreen={changeScreen} onMenu={setMenuOpen}>
      {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-100">{error}</div>}
      {screen === 'world' && (
        <div className="world-inventory-stage h-full min-h-0">
          <WorldView state={state} onStateChange={setState} />
          {inventoryOpen && <InventoryModalV05 onStateChange={setState} onClose={() => setInventoryOpen(false)} />}
        </div>
      )}
      {screen === 'character' && <CharacterView state={state} onStateChange={setState} />}
      {screen === 'finance' && <FinanceView onStateChange={setState} />}
      {screen === 'vehicles' && <VehiclesView state={state} mode={vehicleMode} onModeChange={setVehicleMode} onStateChange={setState} onWorld={() => setScreen('world')} />}
      {!['world', 'character', 'finance', 'inventory', 'vehicles'].includes(screen) && <IntegrationView feature={screen as 'property' | 'jobs' | 'hospitality' | 'police'} />}
    </Shell>
  );
}

function StartupError({ message }: { message: string }) {
  const { t } = useI18n();
  return <div className="grid min-h-dvh place-items-center bg-[#091014] p-5 text-slate-100"><div className="max-w-md rounded-2xl border border-red-400/20 bg-red-400/8 p-5"><b>{t('startup.title')}</b><p className="mt-2 text-sm leading-6 text-slate-300">{message}</p><p className="mt-3 text-xs text-slate-500">{t('startup.help')}</p></div></div>;
}