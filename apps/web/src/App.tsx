import { useEffect, useState } from 'react';
import type { BootstrapState, WorldActionId } from '@sol-dorado/contracts';
import { Shell, type Screen } from './components/Shell';
import { CharacterView } from './features/character/CharacterView';
import { IntegrationView } from './features/integration/IntegrationView';
import { WorldView } from './features/world/WorldView';
import { InventoryView } from './features/inventory/InventoryView';
import { getBootstrap, runWorldAction } from './lib/api';

export function App() {
  const [state, setState] = useState<BootstrapState | null>(null);
  const [screen, setScreen] = useState<Screen>('world');
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<WorldActionId | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getBootstrap().then(setState).catch(reason => setError(reason instanceof Error ? reason.message : String(reason))); }, []);

  async function act(actionId: WorldActionId) {
    if (!state || busy) return;
    setBusy(actionId); setError(null);
    try {
      const result = await runWorldAction(actionId, state.version);
      setState(result.state);
      setFeedback({ title: result.title, message: result.feedback });
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(null); }
  }

  if (error && !state) return <StartupError message={error} />;
  if (!state) return <div className="grid min-h-dvh place-items-center bg-[#091014] text-sm tracking-[0.18em] text-amber-200">CONNECTING TO SOL DORADO…</div>;

  return (
    <Shell state={state} screen={screen} menuOpen={menuOpen} onScreen={setScreen} onMenu={setMenuOpen}>
      {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-100">{error}</div>}
      {screen === 'world' && <WorldView state={state} busy={busy} feedback={feedback} onAction={act} />}
      {screen === 'character' && <CharacterView state={state} />}
      {screen === 'inventory' && <InventoryView onStateChange={setState} />}
      {!['world', 'character', 'inventory'].includes(screen) && <IntegrationView feature={screen as 'finance' | 'vehicles' | 'property' | 'jobs' | 'hospitality' | 'police'} />}
    </Shell>
  );
}

function StartupError({ message }: { message: string }) {
  return <div className="grid min-h-dvh place-items-center bg-[#091014] p-5 text-slate-100"><div className="max-w-md rounded-2xl border border-red-400/20 bg-red-400/8 p-5"><b>Backend is not ready</b><p className="mt-2 text-sm leading-6 text-slate-300">{message}</p><p className="mt-3 text-xs text-slate-500">Start PostgreSQL and Redis, then run migrations and seed.</p></div></div>;
}
