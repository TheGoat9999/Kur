import { useState } from 'react';
import type { EmsPriority } from '@sol-dorado/contracts/ems';
import { useI18n } from '../../i18n';
import { reportEmsCall } from './ems-api';

const PRIORITIES: Array<{ value: EmsPriority; bg: string; en: string }> = [
  { value: 'p1', bg: 'P1 · Критично', en: 'P1 · Critical' },
  { value: 'p2', bg: 'P2 · Спешно', en: 'P2 · Urgent' },
  { value: 'p3', bg: 'P3 · Стабилно', en: 'P3 · Stable' },
  { value: 'p4', bg: 'P4 · Нисък риск', en: 'P4 · Low risk' }
];

export function Ems112Overlay({ onClose }:{ onClose:()=>void }) {
  const { locale } = useI18n();
  const bg = locale === 'bg';
  const [priority,setPriority] = useState<EmsPriority>('p2');
  const [incidentType,setIncidentType] = useState('');
  const [summary,setSummary] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [notice,setNotice] = useState<string|null>(null);

  async function submit() {
    const type = incidentType.trim();
    const details = summary.trim();
    if (type.length < 2 || details.length < 2) {
      setError(bg ? 'Опиши вида на инцидента и какво се е случило.' : 'Describe the incident type and what happened.');
      return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await reportEmsCall(priority,type,details);
      setNotice(bg ? result.noticeBg : result.noticeEn);
      setIncidentType(''); setSummary(''); setPriority('p2');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(false); }
  }

  return <div className="absolute inset-2 z-50 grid place-items-center bg-black/45 p-2 backdrop-blur-sm md:inset-5 md:p-5">
    <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-red-300/20 bg-[#081217]/[.985] shadow-[0_28px_90px_rgba(0,0,0,.72)]">
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#0b171d] px-4 py-4 md:px-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-300/25 bg-red-400/10 text-xl">112</div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-black uppercase tracking-[.22em] text-red-200">SOL DORADO EMERGENCY</div>
          <h2 className="truncate text-lg font-black">{bg?'Медицински сигнал':'Medical emergency call'}</h2>
        </div>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-xl hover:bg-white/[.08]" aria-label={bg?'Затвори 112':'Close 112'}>×</button>
      </header>

      <div className="space-y-4 p-4 md:p-5">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05] p-3 text-xs leading-5 text-slate-300">
          {bg?'Местоположението ти се взема автоматично от текущата server-authoritative позиция. MDT и служебният EMS диспечер са преместени в Работа и кариера.':'Your location is captured automatically from your current server-authoritative position. EMS dispatch and MDT now live under Jobs & Careers.'}
        </div>

        {notice&&<div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100">{notice}</div>}
        {error&&<div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-100">{error}</div>}

        <label className="block text-xs text-slate-400">
          {bg?'Приоритет':'Priority'}
          <select value={priority} onChange={event=>setPriority(event.target.value as EmsPriority)} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-[#0d1a20] px-3 text-sm text-slate-100 outline-none focus:border-red-300/35">
            {PRIORITIES.map(item=><option key={item.value} value={item.value}>{bg?item.bg:item.en}</option>)}
          </select>
        </label>

        <label className="block text-xs text-slate-400">
          {bg?'Вид инцидент':'Incident type'}
          <input value={incidentType} onChange={event=>setIncidentType(event.target.value)} maxLength={80} placeholder={bg?'напр. падане, ПТП, загуба на съзнание':'e.g. fall, collision, unconscious person'} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-[#0d1a20] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-red-300/35" />
        </label>

        <label className="block text-xs text-slate-400">
          {bg?'Какво се е случило':'What happened'}
          <textarea value={summary} onChange={event=>setSummary(event.target.value)} maxLength={300} rows={4} placeholder={bg?'Кратко описание за диспечера…':'Short description for dispatch…'} className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-[#0d1a20] px-3 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-red-300/35" />
        </label>

        <button disabled={busy} onClick={submit} className="min-h-12 w-full rounded-xl bg-red-300 px-4 text-sm font-black text-slate-950 disabled:opacity-40">
          {busy?(bg?'Изпращане…':'Sending…'):(bg?'Изпрати сигнал към 112':'Send emergency call')}
        </button>
      </div>
    </section>
  </div>;
}
