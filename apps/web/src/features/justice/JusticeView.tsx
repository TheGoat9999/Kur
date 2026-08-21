import { useEffect, useMemo, useState } from 'react';
import type { JusticeCase, JusticeMutationResult, JusticeState } from '@sol-dorado/contracts/justice';
import { useI18n } from '../../i18n';
import { bookJusticeCase, calculateJusticeBail, getJustice, postJusticeBail, runJusticeCourt, runJusticeProsecution } from './justice-api';

type Tab = 'intake' | 'cases' | 'records';

export function JusticeView() {
  const { locale, money, dateTime } = useI18n();
  const bg = locale === 'bg';
  const [state, setState] = useState<JusticeState | null>(null);
  const [tab, setTab] = useState<Tab>('intake');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set(['SD-101']));
  const [evidenceStrength, setEvidenceStrength] = useState(65);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { getJustice().then(result => { setState(result); setSelectedId(result.cases[0]?.id ?? null); }).catch(reason => setError(message(reason))); }, []);

  const activeCase = useMemo(() => state?.cases.find(item => item.id === selectedId) ?? state?.cases[0] ?? null, [state, selectedId]);
  const intake = state?.cases.filter(item => item.status === 'arrested') ?? [];

  async function run(work: () => Promise<JusticeMutationResult>) {
    try {
      setBusy(true); setError(null); setNotice(null);
      const result = await work();
      setState(result.justice); setNotice(bg ? result.noticeBg : result.noticeEn);
      if (!selectedId && result.justice.cases[0]) setSelectedId(result.justice.cases[0].id);
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }

  if (!state) return <section className="grid min-h-[420px] place-items-center rounded-3xl border border-amber-200/10 bg-[#0a1116] text-sm text-slate-400">{error ?? (bg ? 'Зареждане на Justice системата…' : 'Loading Justice system…')}</section>;

  return <section className="space-y-4">
    <header className="rounded-3xl border border-amber-200/15 bg-[linear-gradient(135deg,rgba(30,24,14,.95),rgba(9,17,22,.98))] p-5 shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">SOL DORADO JUSTICE SYSTEM</div><h1 className="mt-1 text-2xl font-black text-slate-50">{bg ? 'Правосъдие · Право · Корекции' : 'Justice · Legal · Corrections'}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{bg ? 'Арестът от SDPD влиза в intake. Оттам следват booking, обвинения, гаранция, NPC прокуратура, NPC съд и постоянен съдебен запис.' : 'SDPD arrests enter intake, then move through booking, charges, bail, NPC prosecution, NPC court and a persistent legal record.'}</p></div>
        <div className="rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-xs text-slate-400"><b className="block text-amber-200">{bg ? 'Измислен код на Sol Dorado' : 'Fictional Sol Dorado code'}</b>{bg ? 'Gameplay penalties, не реален правен съвет.' : 'Gameplay penalties, not real legal advice.'}</div>
      </div>
    </header>

    <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
      <Metric label={bg ? 'Intake' : 'Intake'} value={state.dashboard.intake}/><Metric label={bg ? 'Досъдебни' : 'Pretrial'} value={state.dashboard.pretrial}/><Metric label={bg ? 'За съд' : 'Court queue'} value={state.dashboard.awaitingCourt}/><Metric label={bg ? 'В затвора' : 'Jailed'} value={state.dashboard.jailed}/><Metric label={bg ? 'Пробация' : 'Probation'} value={state.dashboard.probation}/><Metric label={bg ? 'Записи' : 'Records'} value={state.dashboard.totalRecords}/>
    </div>

    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-[#0a1116] p-2">
      <TabButton active={tab === 'intake'} onClick={() => setTab('intake')}>{bg ? `Прием (${intake.length})` : `Intake (${intake.length})`}</TabButton>
      <TabButton active={tab === 'cases'} onClick={() => setTab('cases')}>{bg ? 'Активни дела' : 'Cases'}</TabButton>
      <TabButton active={tab === 'records'} onClick={() => setTab('records')}>{bg ? 'Постоянен запис' : 'Persistent record'}</TabButton>
    </nav>

    {notice && <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100">{notice}</div>}
    {error && <div className="rounded-xl border border-red-300/20 bg-red-400/8 px-4 py-3 text-sm text-red-100">{errorLabel(error, bg)}</div>}

    {tab === 'intake' && <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0a1116] p-4"><h2 className="font-black">{bg ? 'Арести за обработка' : 'Arrests awaiting booking'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{bg ? 'Създават се автоматично от lawful arrest в Police → На терен.' : 'Created automatically from a lawful arrest in Police → Field.'}</p><div className="mt-3 space-y-2">{intake.length ? intake.map(item => <CaseButton key={item.id} item={item} active={activeCase?.id === item.id} onClick={() => setSelectedId(item.id)} />) : <Empty>{bg ? 'Няма необработени арести.' : 'No arrests awaiting booking.'}</Empty>}</div></section>
      <section className="rounded-2xl border border-white/10 bg-[#0a1116] p-4">{activeCase && activeCase.status === 'arrested' ? <Booking caseItem={activeCase}/> : <Empty>{bg ? 'Избери arrest intake за booking.' : 'Select an arrest intake for booking.'}</Empty>}</section>
    </div>}

    {tab === 'cases' && <div className="grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0a1116] p-3"><div className="space-y-2">{state.cases.length ? state.cases.map(item => <CaseButton key={item.id} item={item} active={activeCase?.id === item.id} onClick={() => setSelectedId(item.id)} />) : <Empty>{bg ? 'Няма дела.' : 'No cases.'}</Empty>}</div></section>
      <section className="rounded-2xl border border-white/10 bg-[#0a1116] p-4">{activeCase ? <CaseDetail item={activeCase}/> : <Empty>{bg ? 'Избери дело.' : 'Select a case.'}</Empty>}</section>
    </div>}

    {tab === 'records' && <section className="rounded-2xl border border-white/10 bg-[#0a1116] p-4"><div className="grid gap-3">{state.records.length ? state.records.map(record => <article key={record.id} className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">RECORD #{record.recordNumber} · CASE #{record.caseNumber}</div><b className="mt-1 block text-base">{record.defendantName}</b></div><Status value={record.outcome}/></div><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4"><Mini label={bg ? 'Глоба' : 'Fine'} value={money(record.fineCents)}/><Mini label={bg ? 'Затвор' : 'Jail'} value={`${record.jailMinutes} min`}/><Mini label={bg ? 'Пробация' : 'Probation'} value={record.probationUntil ? dateTime(record.probationUntil) : '—'}/><Mini label={bg ? 'Дата' : 'Date'} value={dateTime(record.createdAt)}/></div><div className="mt-3 text-xs text-slate-400">{record.convictions.length ? record.convictions.map(charge => `${charge.code} ${charge.label} ×${charge.count}`).join(' · ') : (bg ? 'Без присъди по обвинения.' : 'No charge convictions.')}</div></article>) : <Empty>{bg ? 'Няма приключени съдебни записи.' : 'No finalized legal records.'}</Empty>}</div></section>}
  </section>;

  function Booking({ caseItem }: { caseItem: JusticeCase }) {
    return <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">BOOKING · CASE #{caseItem.caseNumber}</div><h2 className="mt-1 text-xl font-black">{caseItem.defendantName}</h2><p className="mt-1 text-sm text-slate-400">{bg ? 'Избери обвинения от fictional Sol Dorado Penal Code и оцени силата на текущото case file.' : 'Select charges from the fictional Sol Dorado Penal Code and assess the current case-file strength.'}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{state.chargeCatalog.map(rule => { const chosen = selectedCharges.has(rule.code); return <button key={rule.code} onClick={() => setSelectedCharges(current => { const next = new Set(current); chosen ? next.delete(rule.code) : next.add(rule.code); return next; })} className={`rounded-xl border p-3 text-left ${chosen ? 'border-amber-300/35 bg-amber-300/10' : 'border-white/8 bg-white/[.025]'}`}><div className="flex justify-between gap-2"><b>{rule.code} · {rule.label}</b><span className="text-[10px] uppercase text-slate-500">{rule.severity}</span></div><div className="mt-2 text-xs text-slate-400">{money(rule.baseFineCents)} · {rule.baseJailMinutes} min · bail {money(rule.baseBailCents)}</div></button>; })}</div><label className="mt-4 block text-xs text-slate-400">{bg ? 'Сила на доказателствата' : 'Evidence strength'} · <b className="text-slate-100">{evidenceStrength}%</b><input className="mt-2 w-full" type="range" min={0} max={100} value={evidenceStrength} onChange={event => setEvidenceStrength(Number(event.target.value))}/></label><button disabled={busy || selectedCharges.size === 0} onClick={() => run(() => bookJusticeCase(caseItem.id, [...selectedCharges].map(code => ({ code, count: 1, evidenceStrength }))))} className="mt-4 min-h-11 w-full rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 disabled:opacity-35">{bg ? 'Завърши booking' : 'Complete booking'}</button></div>;
  }

  function CaseDetail({ item }: { item: JusticeCase }) {
    return <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">CASE #{item.caseNumber}</div><h2 className="mt-1 text-xl font-black">{item.defendantName}</h2><p className="mt-1 text-xs text-slate-500">{dateTime(item.createdAt)}</p></div><Status value={item.status}/></div><div className="grid grid-cols-2 gap-2 md:grid-cols-4"><Mini label={bg ? 'Custody' : 'Custody'} value={item.custodyStatus}/><Mini label={bg ? 'Гаранция' : 'Bail'} value={item.bailStatus === 'offered' || item.bailStatus === 'posted' ? `${item.bailStatus} · ${money(item.bailAmountCents)}` : item.bailStatus}/><Mini label={bg ? 'Прокуратура' : 'Prosecution'} value={item.prosecutionDecision}/><Mini label={bg ? 'Съд' : 'Court'} value={item.courtOutcome}/></div><div><h3 className="text-sm font-black">{bg ? 'Обвинения' : 'Charges'}</h3><div className="mt-2 space-y-2">{item.charges.length ? item.charges.map(charge => <div key={charge.id} className="rounded-xl border border-white/8 bg-white/[.025] p-3 text-sm"><div className="flex justify-between gap-3"><b>{charge.code} · {charge.label}</b><span className="text-xs text-slate-500">{charge.status}</span></div><div className="mt-1 text-xs text-slate-400">{charge.severity} · evidence {charge.evidenceStrength}% · {money(charge.baseFineCents)} · {charge.baseJailMinutes} min</div></div>) : <span className="text-xs text-slate-500">—</span>}</div></div>{item.status === 'booked' && <Action disabled={busy} onClick={() => run(() => calculateJusticeBail(item.id))}>{bg ? 'NPC оценка за гаранция' : 'NPC bail assessment'}</Action>}{item.status === 'pretrial' && <div className="grid gap-2 sm:grid-cols-2">{item.bailStatus === 'offered' && <Action disabled={busy} onClick={() => run(() => postJusticeBail(item.id))}>{bg ? `Плати гаранция ${money(item.bailAmountCents)}` : `Post bail ${money(item.bailAmountCents)}`}</Action>}<Action disabled={busy} onClick={() => run(() => runJusticeProsecution(item.id))}>{bg ? 'NPC прокурорски преглед' : 'NPC prosecution review'}</Action></div>}{item.status === 'court_pending' && <Action disabled={busy} onClick={() => run(() => runJusticeCourt(item.id))}>{bg ? 'Проведи NPC съдебно заседание' : 'Run NPC court hearing'}</Action>}{item.status === 'sentenced' && <div className="rounded-2xl border border-red-300/15 bg-red-400/[.05] p-4"><b>{bg ? 'Присъдата е активна' : 'Sentence active'}</b><div className="mt-2 grid grid-cols-2 gap-2"><Mini label={bg ? 'Неплатени глоби' : 'Outstanding fines'} value={money(item.fineBalanceCents)}/><Mini label={bg ? 'Освобождаване' : 'Jail release'} value={item.jailReleaseAt ? dateTime(item.jailReleaseAt) : '—'}/><Mini label={bg ? 'Пробация до' : 'Probation until'} value={item.probationUntil ? dateTime(item.probationUntil) : '—'}/></div></div>}<div><h3 className="text-sm font-black">Timeline</h3><div className="mt-2 space-y-2">{item.events.map(event => <div key={event.id} className="border-l border-white/10 pl-3 text-xs"><b className="text-slate-300">{event.eventType}</b><span className="ml-2 text-slate-600">{event.actorKind} · {dateTime(event.createdAt)}</span><p className="mt-1 text-slate-500">{event.note}</p></div>)}</div></div></div>;
  }
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/8 bg-[#0a1116] p-3"><span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span><b className="mt-1 block text-xl text-slate-100">{value}</b></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-black/20 p-2.5"><span className="block text-[9px] uppercase tracking-wide text-slate-500">{label}</span><b className="mt-1 block break-words text-xs text-slate-200">{value}</b></div>; }
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-black ${active ? 'bg-amber-300 text-slate-950' : 'bg-white/[.035] text-slate-300'}`} onClick={onClick}>{children}</button>; }
function CaseButton({ item, active, onClick }: { item: JusticeCase; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left ${active ? 'border-amber-300/30 bg-amber-300/8' : 'border-white/8 bg-white/[.02]'}`}><div className="flex justify-between gap-3"><b>#{item.caseNumber} · {item.defendantName}</b><span className="text-[10px] uppercase text-slate-500">{item.status}</span></div><div className="mt-1 text-xs text-slate-500">{item.custodyStatus} · {item.charges.length} charge(s)</div></button>; }
function Action({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) { return <button disabled={disabled} onClick={onClick} className="min-h-11 w-full rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 text-sm font-black text-amber-100 hover:border-amber-300/45 disabled:opacity-35">{children}</button>; }
function Status({ value }: { value: string }) { return <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-300">{value.replaceAll('_',' ')}</span>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">{children}</div>; }
function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
function errorLabel(code: string, bg: boolean) {
  const labels: Record<string, [string,string]> = {
    justice_officer_access_required: ['Изисква завършен SDPD officer профил.','Requires a completed SDPD officer profile.'],
    justice_case_not_in_intake: ['Делото вече е обработено.','The case has already left intake.'],
    justice_insufficient_cash_for_bail: ['Няма достатъчно пари в брой за гаранцията.','Not enough cash to post bail.']
  };
  return labels[code]?.[bg ? 0 : 1] ?? code;
}
