import type { ReactNode } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { Hud } from './Hud';

export type Screen = 'world' | 'character' | 'inventory' | 'finance' | 'vehicles' | 'property';
const nav: ReadonlyArray<{ id: Screen; glyph: string; label: string }> = [
  { id: 'world', glyph: '◎', label: 'World' },
  { id: 'character', glyph: '◇', label: 'Character' },
  { id: 'inventory', glyph: '▦', label: 'Inventory' },
  { id: 'finance', glyph: '$', label: 'Finance' },
  { id: 'vehicles', glyph: 'V', label: 'Vehicles' },
  { id: 'property', glyph: '⌂', label: 'Property' }
];

interface Props {
  state: BootstrapState;
  screen: Screen;
  menuOpen: boolean;
  onScreen: (screen: Screen) => void;
  onMenu: (open: boolean) => void;
  children: ReactNode;
}

export function Shell({ state, screen, menuOpen, onScreen, onMenu, children }: Props) {
  return (
    <div className="min-h-dvh bg-[#091014] text-slate-100">
      <button aria-label="Close navigation" className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden ${menuOpen ? 'block' : 'hidden'}`} onClick={() => onMenu(false)} />
      <aside className={`sidebar ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-lg font-black text-amber-200">SD</div>
        <nav className="mt-8 flex w-full flex-1 flex-col gap-2">
          {nav.map(item => (
            <button key={item.id} className={`nav-button ${screen === item.id ? 'nav-button-active' : ''}`} onClick={() => { onScreen(item.id); onMenu(false); }}>
              <span className="text-base">{item.glyph}</span><small>{item.label}</small>
            </button>
          ))}
        </nav>
        <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_#34d399]" title="Online" />
      </aside>

      <div className="md:pl-[78px]">
        <header className="sticky top-0 z-20 border-b border-white/8 bg-[#091014]/88 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 md:hidden" onClick={() => onMenu(true)}>☰</button>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200">Sol Dorado</div>
              <div className="truncate text-xs text-slate-400">{state.location.district} · {state.location.streetSegment}</div>
            </div>
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/8 px-3 py-2 text-right">
              <small className="block text-[8px] uppercase tracking-[0.18em] text-slate-500">Cash</small>
              <strong className="text-sm text-emerald-200">${(state.hud.cashCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</strong>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6"><Hud state={state.hud} /></div>
        <main className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
