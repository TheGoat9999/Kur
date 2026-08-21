import { useEffect, useMemo, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import type { JobOpportunity, JobShiftOffer, JobsState } from '@sol-dorado/contracts/jobs';
import { useI18n } from '../../i18n';
import { getBootstrap } from '../../lib/api';
import { abandonJob, chooseJobEvent, claimQualification, completeTask, finishJob, getJobs, startJob } from './jobs-api';

const SKILLS: Record<string, { bg: string; en: string }> = {
  manual_work:{bg:'Физически труд',en:'Manual work'},logistics:{bg:'Логистика',en:'Logistics'},driving:{bg:'Шофиране',en:'Driving'},navigation:{bg:'Навигация',en:'Navigation'},
  safety:{bg:'Безопасност',en:'Safety'},machinery:{bg:'Машини',en:'Machinery'},construction:{bg:'Строителство',en:'Construction'},mechanical:{bg:'Механика',en:'Mechanical'},
  electrical:{bg:'Електротехника',en:'Electrical'},technical:{bg:'Технически умения',en:'Technical'},customer_service:{bg:'Обслужване на клиенти',en:'Customer service'},commerce:{bg:'Търговия',en:'Commerce'},
  communication:{bg:'Комуникация',en:'Communication'},leadership:{bg:'Лидерство',en:'Leadership'},agriculture:{bg:'Земеделие',en:'Agriculture'},fishing:{bg:'Риболов',en:'Fishing'},
  seamanship:{bg:'Морски умения',en:'Seamanship'},mining:{bg:'Минно дело',en:'Mining'},forestry:{bg:'Горско стопанство',en:'Forestry'},cooking:{bg:'Готвене',en:'Cooking'},hospitality:{bg:'Хотелиерство',en:'Hospitality'}
};
const TIER_BG = ['', 'Под наблюдение', 'Самостоятелна работа', 'Повишено доверие', 'Отговорна роля'];
const TIER_EN = ['', 'Supervised', 'Independent', 'High trust', 'Responsible role'];
const CATEGORY: Record<string, { bg: string; en: string }> = {
  entry:{bg:'Начални',en:'Entry'},logistics:{bg:'Логистика',en:'Logistics'},service:{bg:'Услуги',en:'Service'},trades:{bg:'Занаяти',en:'Trades'},resource:{bg:'Ресурси',en:'Resources'},hospitality:{bg:'Hospitality',en:'Hospitality'},transport:{bg:'Транспорт',en:'Transport'}
};
const INTENSITY: Record<string, { bg: string; en: string }> = { light:{bg:'Лека',en:'Light'},moderate:{bg:'Стандартна',en:'Moderate'},heavy:{bg:'Натоварена',en:'Heavy'} };

type Tab = 'market' | 'career' | 'qualifications' | 'history';

export function JobsView({ onStateChange }: { onStateChange: (state: BootstrapState) => void }) {
  const { locale } = useI18n();
  const bg = locale === 'bg';
  const [jobs, setJobs] = useState<JobsState | null>(null);
  const [tab, setTab] = useState<Tab>('market');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getJobs().then(state => {
      setJobs(state);
      const first = state.opportunities.find(item => item.eligible) ?? state.opportunities[0] ?? null;
      setSelectedId(first?.id ?? null);
      setSelectedOfferId(first?.offers[0]?.id ?? null);
    }).catch(reason => setError(messageForError(String(reason instanceof Error ? reason.message : reason), bg)));
  }, [bg]);

  const selected = useMemo(() => jobs?.opportunities.find(job => job.id === selectedId) ?? jobs?.opportunities[0] ?? null, [jobs, selectedId]);
  const activeJob = jobs?.activeShift ? jobs.opportunities.find(job => job.id === jobs.activeShift?.jobId) ?? null : null;

  useEffect(() => {
    if (!selected) return;
    if (!selected.offers.some(offer => offer.id === selectedOfferId)) setSelectedOfferId(selected.offers[0]?.id ?? null);
  }, [selected, selectedOfferId]);

  async function mutate(work: () => Promise<{ jobs: JobsState; cashCents: number; noticeBg: string; noticeEn: string }>) {
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await work();
      setJobs(result.jobs);
      setNotice(bg ? result.noticeBg : result.noticeEn);
      onStateChange(await getBootstrap());
    } catch (reason) {
      setError(messageForError(String(reason instanceof Error ? reason.message : reason), bg));
    } finally { setBusy(false); }
  }

  function selectJob(job: JobOpportunity) {
    setSelectedId(job.id);
    setSelectedOfferId(job.offers[0]?.id ?? null);
  }

  if (!jobs) return <div className="grid min-h-[45vh] place-items-center px-4 text-center text-sm text-slate-400">{error ?? (bg ? 'Зареждане на пазара на труда…' : 'Loading job market…')}</div>;
  if (jobs.activeShift && activeJob) return <ShiftView jobs={jobs} job={activeJob} bg={bg} busy={busy} notice={notice} error={error}
    onTask={taskId => mutate(() => completeTask(jobs.activeShift!.id, taskId))}
    onChoice={(eventId, choiceId) => mutate(() => chooseJobEvent(jobs.activeShift!.id, eventId, choiceId))}
    onFinish={() => mutate(() => finishJob(jobs.activeShift!.id))}
    onAbandon={() => mutate(() => abandonJob(jobs.activeShift!.id))} />;

  return <section className="mx-auto max-w-6xl space-y-4 pb-10">
    <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(217,158,66,.18),transparent_38%),linear-gradient(135deg,rgba(17,28,34,.96),rgba(8,13,17,.96))] p-5 shadow-2xl md:p-7">
      <div className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">{bg ? 'РАБОТА И КАРИЕРА · SOL DORADO' : 'WORK & CAREER · SOL DORADO'}</div>
      <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><h1 className="text-2xl font-black md:text-3xl">{bg ? 'Пазарът се развива с опита ти' : 'The job market grows with your experience'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{bg ? 'Работодатели, квалификации, конкретни смени и професионални умения. Добрите решения отварят по-отговорни договори, а лошите оставят следа.' : 'Employers, qualifications, concrete shifts and professional skills. Strong decisions unlock higher-trust contracts while poor performance leaves a record.'}</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label={bg ? 'Career ниво' : 'Career level'} value={String(jobs.profile.careerLevel)} /><Metric label={bg ? 'Смени' : 'Shifts'} value={String(jobs.profile.completedShifts)} /><Metric label={bg ? 'Надеждност' : 'Reliability'} value={`${jobs.profile.reliability}%`} /><Metric label={bg ? 'Общо доход' : 'Total earned'} value={money(jobs.profile.totalEarningsCents)} /></div>
      </div>
    </header>

    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-black/20 p-2">
      <TabButton active={tab === 'market'} onClick={() => setTab('market')}>{bg ? 'Възможности' : 'Opportunities'}</TabButton>
      <TabButton active={tab === 'career'} onClick={() => setTab('career')}>{bg ? 'Кариера' : 'Career'}</TabButton>
      <TabButton active={tab === 'qualifications'} onClick={() => setTab('qualifications')}>{bg ? 'Квалификации' : 'Qualifications'}</TabButton>
      <TabButton active={tab === 'history'} onClick={() => setTab('history')}>{bg ? 'История' : 'History'}</TabButton>
    </nav>

    {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100">{notice}</div>}
    {error && <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-100">{error}</div>}

    {tab === 'market' && <MarketView jobs={jobs} selected={selected} selectedOfferId={selectedOfferId} bg={bg} busy={busy} onSelect={selectJob} onOffer={setSelectedOfferId} onStart={() => selected && selectedOfferId && mutate(() => startJob(selected.id, selectedOfferId))} />}
    {tab === 'career' && <CareerView jobs={jobs} bg={bg} />}
    {tab === 'qualifications' && <QualificationsView jobs={jobs} bg={bg} busy={busy} onClaim={key => mutate(() => claimQualification(key))} />}
    {tab === 'history' && <HistoryView jobs={jobs} bg={bg} />}
  </section>;
}

function MarketView({ jobs, selected, selectedOfferId, bg, busy, onSelect, onOffer, onStart }: { jobs: JobsState; selected: JobOpportunity | null; selectedOfferId: string | null; bg: boolean; busy: boolean; onSelect: (job: JobOpportunity) => void; onOffer: (id: string) => void; onStart: () => void }) {
  const eligible = jobs.opportunities.filter(job => job.eligible);
  const locked = jobs.opportunities.filter(job => !job.eligible);
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_410px]">
    <div className="space-y-5">
      <JobList title={bg ? 'Достъпни сега' : 'Available now'} jobs={eligible} selectedId={selected?.id ?? null} bg={bg} onSelect={onSelect} />
      {locked.length > 0 && <JobList title={bg ? 'Следващи цели' : 'Next targets'} jobs={locked} selectedId={selected?.id ?? null} bg={bg} onSelect={onSelect} />}
    </div>
    {selected && <JobDetail job={selected} selectedOfferId={selectedOfferId} bg={bg} busy={busy} onOffer={onOffer} onStart={onStart} />}
  </div>;
}

function JobList({ title, jobs, selectedId, bg, onSelect }: { title: string; jobs: JobOpportunity[]; selectedId: string | null; bg: boolean; onSelect: (job: JobOpportunity) => void }) {
  if (!jobs.length) return null;
  return <section><div className="mb-2 text-xs font-black uppercase tracking-[.15em] text-slate-500">{title}</div><div className="space-y-2">{jobs.map(job => <button key={job.id} onClick={() => onSelect(job)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === job.id ? 'border-amber-300/45 bg-amber-300/[.07]' : 'border-white/10 bg-[#0d171d]/90 hover:border-white/20'} ${!job.eligible ? 'opacity-65' : ''}`}>
    <div className="flex gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-2xl">{job.icon}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-start justify-between gap-2"><span><b className="block text-base text-slate-50">{bg ? job.titleBg : job.titleEn}</b><small className="mt-1 block text-slate-400">{bg ? job.employerBg : job.employerEn} · {bg ? job.locationBg : job.locationEn}</small></span><em className={`rounded-full border px-2 py-1 text-[9px] not-italic uppercase tracking-wider ${job.eligible ? 'border-emerald-400/30 text-emerald-300' : 'border-white/10 text-slate-500'}`}>{job.eligible ? (bg ? 'Достъпна' : 'Available') : (bg ? 'Заключена' : 'Locked')}</em></span><span className="mt-3 flex flex-wrap gap-1.5"><Chip>{bg ? CATEGORY[job.category]?.bg : CATEGORY[job.category]?.en}</Chip><Chip>{bg ? TIER_BG[job.responsibilityTier] : TIER_EN[job.responsibilityTier]}</Chip><Chip>Job Lv {job.jobLevel}</Chip><Chip>{bg ? 'Доверие' : 'Trust'} {job.employerReputation}/100</Chip></span></span></div>
  </button>)}</div></section>;
}

function JobDetail({ job, selectedOfferId, bg, busy, onOffer, onStart }: { job: JobOpportunity; selectedOfferId: string | null; bg: boolean; busy: boolean; onOffer: (id: string) => void; onStart: () => void }) {
  const offer = job.offers.find(item => item.id === selectedOfferId) ?? job.offers[0] ?? null;
  return <aside className="h-fit rounded-2xl border border-white/10 bg-[#0b1419]/95 p-5 lg:sticky lg:top-4">
    <div className="flex items-start justify-between gap-3"><div><div className="text-4xl">{job.icon}</div><div className="mt-3 text-[10px] font-bold uppercase tracking-[.16em] text-amber-300">{bg ? job.employerBg : job.employerEn}</div><h2 className="mt-1 text-xl font-black">{bg ? job.titleBg : job.titleEn}</h2><p className="mt-1 text-xs text-slate-500">{bg ? job.locationBg : job.locationEn}</p></div><div className="text-right"><small className="block text-slate-500">{bg ? 'Job XP' : 'Job XP'}</small><b>{job.jobXp}</b></div></div>
    <p className="mt-3 text-sm leading-6 text-slate-300">{bg ? job.descriptionBg : job.descriptionEn}</p>
    {!job.eligible && <MissingRequirements job={job} bg={bg} />}
    <h3 className="mt-5 text-xs font-black uppercase tracking-wider text-slate-400">{bg ? 'Работни задачи' : 'Work tasks'}</h3>
    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{job.tasks.map(task => <div key={task.id} className="rounded-xl border border-white/8 bg-white/[.025] px-3 py-2"><b className="block text-sm">{bg ? task.titleBg : task.titleEn}</b><small className="text-slate-500">{skillName(task.skill, bg)}</small></div>)}</div>
    {job.eligible && <><h3 className="mt-5 text-xs font-black uppercase tracking-wider text-slate-400">{bg ? 'Избери тип смяна' : 'Choose shift type'}</h3><div className="mt-2 space-y-2">{job.offers.map(item => <OfferButton key={item.id} offer={item} active={offer?.id === item.id} bg={bg} onClick={() => onOffer(item.id)} />)}</div></>}
    <button disabled={!job.eligible || !offer || busy} onClick={onStart} className="mt-5 min-h-12 w-full rounded-xl bg-amber-400 px-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-35">{busy ? (bg ? 'Започване…' : 'Starting…') : (bg ? 'Започни избраната смяна' : 'Start selected shift')}</button>
  </aside>;
}

function OfferButton({ offer, active, bg, onClick }: { offer: JobShiftOffer; active: boolean; bg: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left ${active ? 'border-amber-300/45 bg-amber-300/[.08]' : 'border-white/8 bg-white/[.025]'}`}><span className="flex items-start justify-between gap-2"><span><b className="text-sm">{bg ? offer.titleBg : offer.titleEn}</b>{offer.featured && <em className="ml-2 rounded-full border border-amber-300/25 px-1.5 py-0.5 text-[8px] not-italic uppercase text-amber-200">{bg ? 'Предложена' : 'Featured'}</em>}</span><b className="text-sm text-emerald-300">{money(offer.basePayCents)}</b></span><p className="mt-1 text-xs leading-5 text-slate-400">{bg ? offer.descriptionBg : offer.descriptionEn}</p><span className="mt-2 flex flex-wrap gap-1.5"><Chip>{bg ? INTENSITY[offer.intensity]?.bg : INTENSITY[offer.intensity]?.en}</Chip><Chip>{bg ? `Мин. ${offer.minTasks} задачи` : `Min. ${offer.minTasks} tasks`}</Chip><Chip>{bg ? `Ниво доверие ${offer.requiredTier}` : `Trust tier ${offer.requiredTier}`}</Chip></span></button>;
}

function MissingRequirements({ job, bg }: { job: JobOpportunity; bg: boolean }) {
  return <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[.055] p-3"><b className="text-xs text-amber-200">{bg ? 'За отключване' : 'To unlock'}</b>{job.missing.map((item, index) => <div key={index} className="mt-2 text-xs text-slate-300">{item.skill ? `${skillName(item.skill, bg)} · Lv ${item.level}` : item.qualification ? `${bg ? 'Квалификация' : 'Qualification'} · ${item.qualification}` : ''}</div>)}</div>;
}

function ShiftView({ jobs, job, bg, busy, notice, error, onTask, onChoice, onFinish, onAbandon }: { jobs: JobsState; job: JobOpportunity; bg: boolean; busy: boolean; notice: string | null; error: string | null; onTask: (id: string) => void; onChoice: (eventId: string, choiceId: string) => void; onFinish: () => void; onAbandon: () => void }) {
  const shift = jobs.activeShift!;
  const done = new Set(shift.completedTaskIds);
  const [abandonArmed, setAbandonArmed] = useState(false);
  return <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(150deg,#132129,#081015_65%)] shadow-2xl">
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1419]/95 p-4 backdrop-blur md:p-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/25 text-2xl">{job.icon}</span><div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">{bg ? job.employerBg : job.employerEn}</div><h1 className="truncate text-xl font-black">{bg ? job.titleBg : job.titleEn}</h1><small className="text-slate-500">{bg ? shift.offerTitleBg : shift.offerTitleEn}</small></div></div><div className="hidden text-right sm:block"><small className="block text-slate-500">{bg ? 'Базово заплащане' : 'Base pay'}</small><b className="text-emerald-300">{money(shift.basePayCents)}</b></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label={bg ? 'Прогрес' : 'Progress'} value={`${done.size}/${job.tasks.length}`} /><Metric label={bg ? 'Решения' : 'Decisions'} value={String(shift.decisions.length)} /><Metric label={bg ? 'Energy разход' : 'Energy spent'} value={`-${shift.energySpent}`} /><Metric label={bg ? 'Stress ефект' : 'Stress effect'} value={`+${shift.stressAdded}`} /></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, done.size / job.tasks.length * 100)}%` }} /></div>
    </header>
    <div className="space-y-4 p-4 md:p-5">
      {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3 text-sm text-emerald-100">{notice}</div>}{error && <div className="rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-100">{error}</div>}
      {shift.currentEvent ? <EventPanel event={shift.currentEvent} bg={bg} busy={busy} onChoice={onChoice} /> : <><div><div className="text-xs font-black uppercase tracking-wider text-slate-400">{bg ? 'Работна зона' : 'Work surface'}</div><p className="mt-1 text-sm text-slate-400">{bg ? `Изпълни поне ${shift.minTasks} задачи. Всяка задача има реален разход върху състоянието на героя и може да отключи ситуация.` : `Complete at least ${shift.minTasks} tasks. Every task has a real character-state cost and can trigger a situation.`}</p></div><div className="grid gap-2">{job.tasks.map(task => <button key={task.id} disabled={busy || done.has(task.id)} onClick={() => onTask(task.id)} className={`grid min-h-16 grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border p-3 text-left ${done.has(task.id) ? 'border-emerald-400/15 bg-emerald-400/[.04] opacity-55' : 'border-white/10 bg-white/[.035] hover:border-amber-300/35'}`}><span className="grid h-10 w-10 place-items-center rounded-lg bg-black/25">{done.has(task.id) ? '✓' : '›'}</span><span><b className="block text-sm">{bg ? task.titleBg : task.titleEn}</b><small className="mt-1 block text-slate-500">{skillName(task.skill, bg)} · {bg ? `Energy ${task.energyCost}` : `Energy ${task.energyCost}`}</small></span><span className="text-slate-500">{done.has(task.id) ? '✓' : '→'}</span></button>)}</div></>}
      {shift.decisions.length > 0 && <div className="rounded-2xl border border-white/8 bg-black/15 p-4"><b className="text-xs uppercase tracking-wider text-slate-400">{bg ? 'Последни последствия' : 'Recent consequences'}</b>{shift.decisions.slice(-3).map((decision, index) => <p key={`${decision.eventId}-${index}`} className="mt-2 text-sm text-slate-300">{bg ? decision.consequenceBg : decision.consequenceEn}</p>)}</div>}
      <div className="grid gap-2 border-t border-white/8 pt-4 sm:grid-cols-[1fr_auto]"><button disabled={!shift.canFinish || busy} onClick={onFinish} className="min-h-12 rounded-xl bg-emerald-400 px-4 font-black text-slate-950 disabled:opacity-30">{bg ? `Приключи смяната (${done.size}/${shift.minTasks} минимум)` : `Finish shift (${done.size}/${shift.minTasks} minimum)`}</button><button disabled={busy} onClick={() => abandonArmed ? onAbandon() : setAbandonArmed(true)} className={`min-h-12 rounded-xl border px-4 text-sm font-bold ${abandonArmed ? 'border-red-400/40 bg-red-400/10 text-red-100' : 'border-white/10 text-slate-400'}`}>{abandonArmed ? (bg ? 'Потвърди прекратяване' : 'Confirm abandon') : (bg ? 'Прекрати смяна' : 'Abandon shift')}</button></div>
      {abandonArmed && <p className="text-xs text-red-200/80">{bg ? 'Прекратяването не плаща възнаграждение и намалява надеждността и доверието на работодателя.' : 'Abandoning pays nothing and reduces reliability and employer trust.'}</p>}
    </div>
  </section>;
}

function EventPanel({ event, bg, busy, onChoice }: { event: NonNullable<JobsState['activeShift']>['currentEvent'] extends infer T ? Exclude<T, null> : never; bg: boolean; busy: boolean; onChoice: (eventId: string, choiceId: string) => void }) {
  if (!event) return null;
  return <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[.06] p-4"><div className="text-[10px] font-black uppercase tracking-[.17em] text-amber-300">{event.kind === 'opportunity' ? (bg ? 'Възможност' : 'Opportunity') : event.kind === 'responsibility' ? (bg ? 'Отговорност' : 'Responsibility') : (bg ? 'Неочаквана ситуация' : 'Unexpected situation')}</div><h2 className="mt-2 text-xl font-black">{bg ? event.titleBg : event.titleEn}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{bg ? event.descriptionBg : event.descriptionEn}</p><div className="mt-4 grid gap-2">{event.choices.map(choice => <button key={choice.id} disabled={busy || choice.locked} onClick={() => onChoice(event.id, choice.id)} className="min-h-14 rounded-xl border border-white/12 bg-white/[.04] px-4 text-left text-sm font-bold hover:border-amber-300/40 disabled:opacity-35"><span>{bg ? choice.labelBg : choice.labelEn}</span>{choice.requires && <small className="mt-1 block font-normal text-slate-500">{requirementText(choice.requires, bg)}</small>}</button>)}</div></div>;
}

function CareerView({ jobs, bg }: { jobs: JobsState; bg: boolean }) {
  const activeSkills = [...jobs.profile.skills].sort((a, b) => b.xp - a.xp);
  return <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-[#0c151b]/90 p-4 md:p-5"><div className="flex items-end justify-between"><div><small className="text-[10px] font-black uppercase tracking-[.15em] text-amber-300">{bg ? 'ПРОФЕСИОНАЛЕН ПРОФИЛ' : 'PROFESSIONAL PROFILE'}</small><h2 className="mt-1 text-xl font-black">{bg ? 'Умения' : 'Skills'}</h2></div><span className="text-xs text-slate-500">XP {jobs.profile.careerXp}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{activeSkills.map(skill => <div key={skill.skill} className={`rounded-xl border px-3 py-2 ${skill.xp > 0 ? 'border-white/10 bg-white/[.03]' : 'border-white/[.05] bg-black/10 opacity-55'}`}><span className="flex justify-between gap-2"><b className="text-sm">{skillName(skill.skill, bg)}</b><small className="text-amber-200">Lv {skill.level}</small></span><div className="mt-2 h-1 overflow-hidden rounded bg-black/30"><div className="h-full bg-amber-400" style={{ width: skill.nextLevelXp ? `${Math.min(100, skill.xp / skill.nextLevelXp * 100)}%` : '100%' }} /></div><small className="mt-1 block text-[10px] text-slate-500">{skill.nextLevelXp ? `${skill.xp} / ${skill.nextLevelXp} XP` : `${skill.xp} XP · MAX`}</small></div>)}</div></section>
    <div className="space-y-4"><section className="rounded-2xl border border-white/10 bg-[#0c151b]/90 p-4 md:p-5"><h2 className="text-xl font-black">{bg ? 'Работодатели' : 'Employers'}</h2>{jobs.employers.length ? <div className="mt-3 space-y-2">{jobs.employers.map(employer => <div key={employer.employerKey} className="rounded-xl border border-white/8 bg-white/[.025] p-3"><span className="flex items-start justify-between gap-2"><span><b className="block text-sm">{bg ? employer.employerBg : employer.employerEn}</b><small className="text-slate-500">{bg ? TIER_BG[employer.responsibilityTier] : TIER_EN[employer.responsibilityTier]} · {employer.completedShifts} {bg ? 'смени' : 'shifts'}</small></span><b className="text-amber-200">{employer.reputation}/100</b></span><div className="mt-2 h-1.5 overflow-hidden rounded bg-black/30"><div className="h-full bg-amber-400" style={{ width: `${employer.reputation}%` }} /></div></div>)}</div> : <p className="mt-3 text-sm text-slate-500">{bg ? 'Завърши смяна, за да изградиш отношения с работодател.' : 'Complete a shift to build an employer relationship.'}</p>}</section>
      <section className="rounded-2xl border border-white/10 bg-[#0c151b]/90 p-4 md:p-5"><h2 className="text-xl font-black">{bg ? 'Milestones' : 'Milestones'}</h2><div className="mt-3 space-y-2">{jobs.milestones.map(item => <div key={item.id} className={`rounded-xl border p-3 ${item.unlocked ? 'border-emerald-400/20 bg-emerald-400/[.04]' : 'border-white/8 bg-white/[.02]'}`}><span className="flex justify-between gap-3"><span><b className="block text-sm">{item.unlocked ? '✓ ' : ''}{bg ? item.titleBg : item.titleEn}</b><small className="text-slate-500">{bg ? item.descriptionBg : item.descriptionEn}</small></span><small className="shrink-0 text-slate-400">{item.current}/{item.target}</small></span></div>)}</div></section>
    </div>
  </div>;
}

function QualificationsView({ jobs, bg, busy, onClaim }: { jobs: JobsState; bg: boolean; busy: boolean; onClaim: (key: string) => void }) {
  return <div className="grid gap-3 md:grid-cols-2">{jobs.qualifications.map(item => <section key={item.key} className={`rounded-2xl border p-4 ${item.earned ? 'border-emerald-400/20 bg-emerald-400/[.035]' : item.eligible ? 'border-amber-300/30 bg-amber-300/[.045]' : 'border-white/10 bg-[#0c151b]/90'}`}><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.15em] text-slate-500">{item.earned ? (bg ? 'ПОЛУЧЕНА' : 'EARNED') : item.eligible ? (bg ? 'ГОТОВА ЗА ПОЛУЧАВАНЕ' : 'READY TO CLAIM') : (bg ? 'В ПРОГРЕС' : 'IN PROGRESS')}</div><h3 className="mt-1 text-lg font-black">{bg ? item.titleBg : item.titleEn}</h3></div><span className="text-xl">{item.earned ? '✓' : '◈'}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{bg ? item.descriptionBg : item.descriptionEn}</p><div className="mt-3 flex flex-wrap gap-1.5"><Chip>{bg ? `Career Lv ${item.careerLevel}` : `Career Lv ${item.careerLevel}`}</Chip>{item.requirements.map(req => <Chip key={`${req.skill}-${req.level}`}>{skillName(req.skill, bg)} Lv {req.level}</Chip>)}</div>{!item.earned && !item.eligible && item.missing.length > 0 && <div className="mt-3 text-xs text-slate-500">{bg ? 'Липсва: ' : 'Missing: '}{item.missing.map(entry => entry.skill ? `${skillName(entry.skill, bg)} Lv ${entry.level}` : entry.qualification?.startsWith('career_level:') ? `Career Lv ${entry.qualification.split(':')[1]}` : entry.qualification).join(' · ')}</div>}{item.eligible && <button disabled={busy} onClick={() => onClaim(item.key)} className="mt-4 min-h-11 w-full rounded-xl bg-amber-400 px-4 text-sm font-black text-slate-950 disabled:opacity-40">{bg ? 'Получи квалификация' : 'Claim qualification'}</button>}</section>)}</div>;
}

function HistoryView({ jobs, bg }: { jobs: JobsState; bg: boolean }) {
  if (!jobs.history.length) return <div className="rounded-2xl border border-white/10 bg-[#0c151b]/90 p-6 text-sm text-slate-500">{bg ? 'Все още няма приключени смени.' : 'No completed shifts yet.'}</div>;
  return <div className="space-y-2">{jobs.history.map(entry => <details key={entry.id} className="group rounded-2xl border border-white/10 bg-[#0c151b]/90 p-4"><summary className="cursor-pointer list-none"><span className="flex flex-wrap items-center justify-between gap-3"><span><b className="block text-sm">{bg ? entry.titleBg : entry.titleEn}</b><small className="text-slate-500">{bg ? entry.employerBg : entry.employerEn} · {bg ? entry.offerTitleBg : entry.offerTitleEn} · {new Date(entry.createdAt).toLocaleString(bg ? 'bg-BG' : 'en-US')}</small></span><span className="text-right"><b className={entry.performance === 'abandoned' ? 'text-red-300' : 'text-emerald-300'}>{money(entry.payoutCents)}</b><small className="ml-2 text-slate-500">{performanceLabel(entry.performance, bg)}</small></span></span></summary><div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 sm:grid-cols-5"><Metric label={bg ? 'База' : 'Base'} value={money(entry.payout.basePayCents)} /><Metric label={bg ? 'Задачи' : 'Tasks'} value={signedMoney(entry.payout.taskBonusCents)} /><Metric label={bg ? 'Ситуации' : 'Events'} value={signedMoney(entry.payout.eventBonusCents)} /><Metric label={bg ? 'Представяне' : 'Performance'} value={signedMoney(entry.payout.performanceBonusCents)} /><Metric label={bg ? 'Доверие' : 'Trust'} value={signedMoney(entry.payout.trustBonusCents)} /></div></details>)}</div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-bold ${active ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:bg-white/[.04]'}`}>{children}</button>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2"><small className="block text-[9px] uppercase tracking-wider text-slate-500">{label}</small><b className="mt-1 block text-sm text-slate-100">{value}</b></div>; }
function Chip({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-white/10 bg-white/[.035] px-2 py-1 text-[9px] text-slate-400">{children}</span>; }
function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function signedMoney(cents: number) { return `${cents > 0 ? '+' : cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`; }
function skillName(skill: string, bg: boolean) { return SKILLS[skill]?.[bg ? 'bg' : 'en'] ?? skill; }
function requirementText(value: string, bg: boolean) { const [skill, level] = value.split(':'); return `${bg ? 'Изисква' : 'Requires'} ${skillName(skill ?? '', bg)} Lv ${level ?? '?'}`; }
function performanceLabel(value: string, bg: boolean) { const labels: Record<string, { bg: string; en: string }> = { excellent:{bg:'Отлична',en:'Excellent'},good:{bg:'Добра',en:'Good'},completed:{bg:'Завършена',en:'Completed'},needs_improvement:{bg:'Нужно подобрение',en:'Needs improvement'},abandoned:{bg:'Прекратена',en:'Abandoned'} }; return labels[value]?.[bg ? 'bg' : 'en'] ?? value; }
function messageForError(code: string, bg: boolean) {
  const clean = code.replace(/^Error:\s*/, '');
  const messages: Record<string, { bg: string; en: string }> = {
    job_too_exhausted:{bg:'Нямаш достатъчно Energy за тази работна стъпка. Възстанови се или прекрати смяната.',en:'You do not have enough Energy for this work step. Recover or abandon the shift.'},
    job_requirements_not_met:{bg:'Все още не покриваш изискванията за тази работа.',en:'You do not meet this job’s requirements yet.'},
    job_offer_not_available:{bg:'Този тип смяна вече не е достъпен.',en:'That shift offer is no longer available.'},
    job_offer_trust_too_low:{bg:'Работодателят още не ти дава това ниво отговорност.',en:'The employer does not trust you with that responsibility level yet.'},
    job_event_requires_choice:{bg:'Първо реши активната ситуация.',en:'Resolve the active situation first.'},
    job_shift_not_ready:{bg:'Трябва да изпълниш минималния брой задачи за тази смяна.',en:'Complete the minimum number of tasks for this shift.'},
    job_qualification_requirements_not_met:{bg:'Още не покриваш условията за квалификацията.',en:'You do not meet the qualification requirements yet.'},
    job_qualification_already_earned:{bg:'Вече имаш тази квалификация.',en:'You already have this qualification.'}
  };
  return messages[clean]?.[bg ? 'bg' : 'en'] ?? clean;
}
