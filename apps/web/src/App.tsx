import { useEffect, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { Shell, type Screen } from './components/Shell';
import { CharacterView } from './features/character/CharacterView';
import { IntegrationView } from './features/integration/IntegrationView';
import { WorldView } from './features/world/WorldView';
import { InventoryModalV05 } from './features/inventory/InventoryModalV05';
import { PhoneLauncher, PhoneOverlay } from './features/phone/PhoneOverlay';
import { FinanceView } from './features/finance/FinanceView';
import { getBootstrap } from './lib/api';
import { useI18n } from './i18n';

export function App() {
  const { t } = useI18n();
  const [state, setState] = useState<BootstrapState | null>(null);
  const [screen, setScreen] = useState<Screen>('world');
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
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
      setScreen('world');
      setMenuOpen(false);
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

  function changeScreen(next: Screen) {
    if (next === 'inventory') {
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
    setInventoryOpen(false);
    setPhoneOpen(false);
    setScreen(next);
  }

  function openPhoneFeature(feature: 'finance' | 'jobs') {
    setPhoneOpen(false);
    setInventoryOpen(false);
    setMenuOpen(false);
    setScreen(feature);
  }

  if (error && !state) return <StartupError message={error} />;
  if (!state) return <div className="grid min-h-dvh place-items-center bg-[#091014] text-sm tracking-[0.18em] text-amber-200">{t('startup.connecting')}</div>;

  return (
    <Shell
      state={state}
      screen={screen}
      inventoryOpen={inventoryOpen}
      menuOpen={menuOpen}
      onScreen={changeScreen}
      onMenu={setMenuOpen}
    >
      {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-100">{error}</div>}
      {screen === 'world' && (
        <div className="world-inventory-stage h-full min-h-0">
          <WorldView state={state} onStateChange={setState} />
          {!inventoryOpen && !phoneOpen && <PhoneLauncher onOpen={() => setPhoneOpen(true)} />}
          {inventoryOpen && <InventoryModalV05 onStateChange={setState} onClose={() => setInventoryOpen(false)} />}
          {phoneOpen && (
            <PhoneOverlay
              state={state}
              onClose={() => setPhoneOpen(false)}
              onOpenFeature={openPhoneFeature}
            />
          )}
        </div>
      )}
      {screen === 'character' && <CharacterView state={state} onStateChange={setState} />}
      {screen === 'finance' && <FinanceView onStateChange={setState} />}
      {!['world', 'character', 'finance', 'inventory'].includes(screen) && <IntegrationView feature={screen as 'vehicles' | 'property' | 'jobs' | 'hospitality' | 'police'} />}
    </Shell>
  );
}

function StartupError({ message }: { message: string }) {
  const { t } = useI18n();
  return <div className="grid min-h-dvh place-items-center bg-[#091014] p-5 text-slate-100"><div className="max-w-md rounded-2xl border border-red-400/20 bg-red-400/8 p-5"><b>{t('startup.title')}</b><p className="mt-2 text-sm leading-6 text-slate-300">{message}</p><p className="mt-3 text-xs text-slate-500">{t('startup.help')}</p></div></div>;
}
