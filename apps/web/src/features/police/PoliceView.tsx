import { useEffect, useMemo, useState } from 'react';
import type { PoliceState } from '@sol-dorado/contracts/police';
import { useI18n } from '../../i18n';
import {
  createPoliceBolo,
  createPoliceDispatch,
  createPoliceEvidence,
  createPoliceIntel,
  createPoliceReport,
  createPoliceWarrant,
  getPolice,
  policeBoloAction,
  policeCareer,
  policeDispatchAction,
  policeDuty,
  policeEncounterAction,
  policeEvidenceAction,
  policePursuitAction,
  policeWarrantAction,
  startPoliceEncounter,
  startPolicePursuit
} from '../../lib/api';
import './police.css';

type Tab = 'overview' | 'dispatch' | 'field' | 'records' | 'evidence' | 'pursuit' | 'audit';

export function PoliceView() {
  const { locale } = useI18n();
  const bg = locale === 'bg';
  const [state, setState] = useState<PoliceState | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callsign, setCallsign] = useState('24');

  const copy = useMemo(() => bg ? {
    title: 'Полицейско управление', subtitle: 'SDPD · Операции и MDT', loading: 'Зареждане на полицейските системи…',
    overview: 'Обзор', dispatch: 'Dispatch', field: 'На терен', records: 'MDT записи', evidence: 'Доказателства', pursuit: 'Преследване', audit: 'Одит',
    offDuty: 'ИЗВЪН ДЕЖУРСТВО', onDuty: 'НА ДЕЖУРСТВО', enterDuty: 'Влез на дежурство', leaveDuty: 'Приключи дежурство',
    applicant: 'Кандидат', cadet: 'Курсант', officer: 'Полицай', apply: 'Кандидатствай в SDPD Academy', graduate: 'Завърши Academy training',
    activeCalls: 'Активни сигнали', warrants: 'Активни заповеди', bolos: 'Активни BOLO', officers: 'Полицаи на смяна', reports: 'Отворени доклади',
    noAccess: 'MDT оперативните функции се отключват след завършване на Academy и влизане на дежурство.',
    callsign: 'Позивна', createTestCall: 'Създай тестов сигнал', accept: 'Приеми', arrive: 'На място', clear: 'Приключи',
    noCalls: 'Няма активни сигнали.', intel: 'Разузнавателна картина', noIntel: 'Няма придобита полицейска информация.',
    addWitness: 'Добави свидетелски intel', startTraffic: 'Traffic stop', startPed: 'Pedestrian stop', noEncounter: 'Няма активен контакт на терен.',
    detain: 'Временно задържане', search: 'Претърси', citation: 'Глоба', arrest: 'Арест', release: 'Освободи', probable: 'Тест: probable cause',
    legal: 'Правно основание', complaints: 'Процедурни нарушения', citations: 'Глоби', arrests: 'Арести',
    createReport: 'Нов доклад', createWarrant: 'Нова заповед', createBolo: 'Нов BOLO', subject: 'Лице / цел', reason: 'Основание / описание', save: 'Запиши',
    noReports: 'Няма доклади.', noWarrants: 'Няма заповеди.', noBolos: 'Няма BOLO записи.', serve: 'Изпълни', resolve: 'Приключи', cancel: 'Отмени',
    collectEvidence: 'Регистрирай доказателство', noEvidence: 'Няма регистрирани доказателства.', store: 'В склад', checkout: 'Вземи', releaseEvidence: 'Освободи', chain: 'Chain of custody',
    startPursuit: 'Стартирай преследване', noPursuit: 'Няма активно преследване.', visual: 'Visual', lost: 'Загубен visual', distance: 'Дистанция', risk: 'Риск', confidence: 'Search confidence', lkp: 'Последна известна позиция',
    aggressive: 'Агресивно преследване', maintain: 'Запази visual', predict: 'Предвиди маршрут', backup: 'Поискай подкрепление', containment: 'Containment', backoff: 'Отдръпни се', loseVisual: 'Симулация: загуби visual', refresh: 'Обнови search', contain: 'Блокирай автомобила', end: 'Прекрати',
    noAudit: 'Няма audit събития.', systemNote: 'Полицията вижда само придобитото knowledge. Heat, evidence, intelligence и recognition не се смесват автоматично.'
  } : {
    title: 'Police Department', subtitle: 'SDPD · Operations & MDT', loading: 'Loading police systems…',
    overview: 'Overview', dispatch: 'Dispatch', field: 'Field', records: 'MDT records', evidence: 'Evidence', pursuit: 'Pursuit', audit: 'Audit',
    offDuty: 'OFF DUTY', onDuty: 'ON DUTY', enterDuty: 'Go on duty', leaveDuty: 'End duty', applicant: 'Applicant', cadet: 'Cadet', officer: 'Officer', apply: 'Apply to SDPD Academy', graduate: 'Complete Academy training',
    activeCalls: 'Active calls', warrants: 'Active warrants', bolos: 'Active BOLOs', officers: 'Officers on duty', reports: 'Open reports', noAccess: 'Operational MDT functions unlock after Academy and while on duty.',
    callsign: 'Callsign', createTestCall: 'Create test call', accept: 'Accept', arrive: 'On scene', clear: 'Clear', noCalls: 'No active calls.', intel: 'Intelligence picture', noIntel: 'No acquired police intelligence.', addWitness: 'Add witness intel', startTraffic: 'Traffic stop', startPed: 'Pedestrian stop', noEncounter: 'No active field contact.',
    detain: 'Detain', search: 'Search', citation: 'Citation', arrest: 'Arrest', release: 'Release', probable: 'Test: probable cause', legal: 'Legal ground', complaints: 'Procedural violations', citations: 'Citations', arrests: 'Arrests',
    createReport: 'New report', createWarrant: 'New warrant', createBolo: 'New BOLO', subject: 'Subject / target', reason: 'Reason / description', save: 'Save', noReports: 'No reports.', noWarrants: 'No warrants.', noBolos: 'No BOLO records.', serve: 'Serve', resolve: 'Resolve', cancel: 'Cancel',
    collectEvidence: 'Register evidence', noEvidence: 'No evidence records.', store: 'Store', checkout: 'Check out', releaseEvidence: 'Release', chain: 'Chain of custody', startPursuit: 'Start pursuit', noPursuit: 'No active pursuit.', visual: 'Visual', lost: 'Visual lost', distance: 'Distance', risk: 'Risk', confidence: 'Search confidence', lkp: 'Last known position',
    aggressive: 'Aggressive pursuit', maintain: 'Maintain visual', predict: 'Predict route', backup: 'Request backup', containment: 'Containment', backoff: 'Back off', loseVisual: 'Test: lose visual', refresh: 'Refresh search', contain: 'Contain vehicle', end: 'End', noAudit: 'No audit events.', systemNote: 'Police only sees acquired knowledge. Heat, evidence, intelligence and recognition do not merge automatically.'
  }, [bg]);

  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (state?.profile.callsign) setCallsign(state.profile.callsign); }, [state?.profile.callsign]);

  async function refresh() { try { setError(null); setState(await getPolice()); } catch (e) { setError(message(e)); } }
  async function run(action: () => Promise<PoliceState>) {
    try { setBusy(true); setError(null); setState(await action()); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }

  if (!state) return <section className="police-shell"><div className="police-loading">{error ?? copy.loading}</div></section>;
  const operational = state.profile.careerStatus === 'officer' && state.profile.onDuty;
  const careerLabel = state.profile.careerStatus === 'applicant' ? copy.applicant : state.profile.careerStatus === 'cadet' ? copy.cadet : copy.officer;

  return (
    <section className="police-shell">
      <header className="police-hero">
        <div><small>SOL DORADO POLICE DEPARTMENT</small><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
        <div className="police-duty-card">
          <span className={state.profile.onDuty ? 'duty-live' : 'duty-off'}>{state.profile.onDuty ? copy.onDuty : copy.offDuty}</span>
          <b>{careerLabel}{state.profile.badgeNumber ? ` · ${state.profile.badgeNumber}` : ''}</b>
          {state.profile.careerStatus === 'officer' && <div className="police-duty-controls"><label>{copy.callsign}<input value={callsign} maxLength={8} onChange={e => setCallsign(e.target.value)} disabled={state.profile.onDuty || busy} /></label><button disabled={busy} onClick={() => run(() => policeDuty(!state.profile.onDuty, callsign))}>{state.profile.onDuty ? copy.leaveDuty : copy.enterDuty}</button></div>}
        </div>
      </header>

      {error && <div className="police-error">{error}</div>}

      <nav className="police-tabs" aria-label="Police MDT">
        {([['overview', copy.overview], ['dispatch', copy.dispatch], ['field', copy.field], ['records', copy.records], ['evidence', copy.evidence], ['pursuit', copy.pursuit], ['audit', copy.audit]] as [Tab,string][]).map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === 'overview' && <Overview />}
      {tab === 'dispatch' && <Dispatch />}
      {tab === 'field' && <Field />}
      {tab === 'records' && <Records />}
      {tab === 'evidence' && <Evidence />}
      {tab === 'pursuit' && <Pursuit />}
      {tab === 'audit' && <Audit />}
    </section>
  );

  function Overview() {
    return <div className="police-grid police-grid-overview">
      <div className="police-panel police-span-2"><div className="panel-eyebrow">SDPD OPERATIONS</div><h2>{careerLabel}</h2><p>{copy.systemNote}</p>{state.profile.careerStatus === 'applicant' && <button disabled={busy} onClick={() => run(() => policeCareer('apply'))}>{copy.apply}</button>}{state.profile.careerStatus === 'cadet' && <button disabled={busy} onClick={() => run(() => policeCareer('academy_step'))}>{copy.graduate}</button>}{state.profile.careerStatus === 'officer' && !state.profile.onDuty && <p className="police-warning">{copy.noAccess}</p>}</div>
      <Metric label={copy.activeCalls} value={state.dashboard.activeCalls} /><Metric label={copy.warrants} value={state.dashboard.activeWarrants} /><Metric label={copy.bolos} value={state.dashboard.activeBolos} /><Metric label={copy.officers} value={state.dashboard.officersOnDuty} /><Metric label={copy.reports} value={state.dashboard.openReports} />
      <div className="police-panel"><div className="panel-eyebrow">ACCOUNTABILITY</div><div className="accountability"><span>{copy.citations}<b>{state.profile.citations}</b></span><span>{copy.arrests}<b>{state.profile.arrests}</b></span><span>{copy.complaints}<b>{state.profile.complaints}</b></span></div></div>
      <div className="police-panel police-span-2"><div className="panel-eyebrow">UNITS</div><div className="unit-strip">{state.units.map(unit => <div key={unit.id} className={unit.isSelf ? 'unit self' : 'unit'}><b>{unit.isNpc ? 'NPC ' : ''}Unit {unit.callsign}</b><span>{unit.status} · {unit.district}</span></div>)}</div></div>
    </div>;
  }

  function Dispatch() {
    return <div className="police-grid"><div className="police-panel police-span-2"><div className="panel-head"><div><div className="panel-eyebrow">LIVE CAD</div><h2>{copy.activeCalls}</h2></div><button disabled={!operational || busy} onClick={() => run(() => createPoliceDispatch({ callCode: '10-31', title: bg ? 'Възможен обир' : 'Possible robbery', description: bg ? 'Аларма от Southside Market. Самоличността е неизвестна.' : 'Southside Market alarm. Identity unknown.', priority: 3, district: 'Las Palmas West', streetSegment: 'market_block_3', sourceKind: 'alarm', knowledge: { suspects: 'unknown', weapons: 'unknown', identity: 'unknown' } }))}>{copy.createTestCall}</button></div>
        <div className="dispatch-list">{state.calls.length ? state.calls.map(call => <article key={call.id} className={`dispatch-call priority-${call.priority}`}><header><span>{call.callCode}</span><b>{call.title}</b><i>P{call.priority}</i></header><p>{call.description}</p><div className="call-meta"><span>{call.district}</span><span>{call.streetSegment}</span><span>{call.status}</span><span>{call.assignedUnitCallsigns.length ? `Units ${call.assignedUnitCallsigns.join(', ')}` : 'Unassigned'}</span></div><div className="police-actions"><button disabled={!operational || busy} onClick={() => run(() => policeDispatchAction(call.id,'accept'))}>{copy.accept}</button><button disabled={!operational || busy} onClick={() => run(() => policeDispatchAction(call.id,'arrive'))}>{copy.arrive}</button><button disabled={!operational || busy} onClick={() => run(() => policeDispatchAction(call.id,'clear'))}>{copy.clear}</button></div></article>) : <Empty text={copy.noCalls} />}</div>
      </div><div className="police-panel"><div className="panel-head"><div><div className="panel-eyebrow">KNOWLEDGE</div><h2>{copy.intel}</h2></div><button disabled={!operational || busy} onClick={() => run(() => createPoliceIntel({ callId: state.calls[0]?.id ?? null, sourceType: 'witness', label: bg ? 'Свидетел' : 'Witness', summary: bg ? 'Тъмна кола се е отдалечила на изток. Марката не е потвърдена.' : 'Dark vehicle left eastbound. Make is unconfirmed.', reliability: 58, fields: { vehicle: 'dark sedan', direction: 'eastbound' } }))}>{copy.addWitness}</button></div>{state.intel.length ? state.intel.slice(0,12).map(item => <div className="intel-row" key={item.id}><b>{item.label}</b><span>{item.summary}</span><em>{item.reliability}%</em></div>) : <Empty text={copy.noIntel} />}</div></div>;
  }

  function Field() {
    const e = state.activeEncounter;
    return <div className="police-grid"><div className="police-panel police-span-2"><div className="panel-head"><div><div className="panel-eyebrow">FIELD CONTACT</div><h2>{copy.field}</h2></div><div className="police-actions"><button disabled={!operational || busy || !!e} onClick={() => run(() => startPoliceEncounter({ encounterType:'traffic', subjectName: bg ? 'Алекс Мърсър' : 'Alex Mercer', legalGround:'traffic_violation' }))}>{copy.startTraffic}</button><button disabled={!operational || busy || !!e} onClick={() => run(() => startPoliceEncounter({ encounterType:'pedestrian', subjectName: bg ? 'Джордан Блейк' : 'Jordan Blake', legalGround:'none' }))}>{copy.startPed}</button></div></div>{!e ? <Empty text={copy.noEncounter} /> : <div className="encounter-card"><div className="encounter-status"><span>{e.encounterType}</span><b>{e.subjectName ?? 'UNKNOWN'}</b><em>{e.status}</em></div><div className="legal-ground"><small>{copy.legal}</small><b>{e.legalGround}</b><span>{e.detained ? 'DETAINED' : 'CONTACT'} · {e.searched ? 'SEARCHED' : 'NOT SEARCHED'}</span></div><div className="police-actions wrap"><button onClick={() => run(() => policeEncounterAction(e.id,'detain'))}>{copy.detain}</button><button onClick={() => run(() => policeEncounterAction(e.id,'search'))}>{copy.search}</button><button onClick={() => run(() => policeEncounterAction(e.id,'citation'))}>{copy.citation}</button><button onClick={() => run(() => policeEncounterAction(e.id,'arrest'))}>{copy.arrest}</button><button onClick={() => run(() => policeEncounterAction(e.id,'release'))}>{copy.release}</button><button className="soft" onClick={() => run(() => policeEncounterAction(e.id,'set_probable_cause'))}>{copy.probable}</button></div></div>}</div><div className="police-panel"><div className="panel-eyebrow">PROCEDURE</div><h3>{copy.complaints}</h3><strong className={state.profile.complaints ? 'danger-number' : ''}>{state.profile.complaints}</strong><p>{bg ? 'Неправомерните действия не се скриват от системата. Те се изпълняват като RP действие, но оставят audit следа и риск от жалба.' : 'Improper actions are not magically hidden. They execute as RP actions but leave an audit trail and complaint risk.'}</p></div></div>;
  }

  function Records() {
    return <div className="records-layout"><RecordCreator /><div className="police-panel"><div className="panel-eyebrow">REPORTS</div>{state.reports.length ? state.reports.map(r => <div className="record-row" key={r.id}><span>#{r.reportNumber}</span><div><b>{r.title}</b><small>{r.reportType} · {r.status}</small></div></div>) : <Empty text={copy.noReports} />}</div><div className="police-panel"><div className="panel-eyebrow">WARRANTS</div>{state.warrants.length ? state.warrants.map(w => <div className="record-row" key={w.id}><span className={`record-priority ${w.priority}`}>{w.priority}</span><div><b>{w.subjectName}</b><small>{w.reason} · {w.status}</small>{w.status === 'active' && <div className="police-actions"><button onClick={() => run(() => policeWarrantAction(w.id,'serve'))}>{copy.serve}</button><button onClick={() => run(() => policeWarrantAction(w.id,'cancel'))}>{copy.cancel}</button></div>}</div></div>) : <Empty text={copy.noWarrants} />}</div><div className="police-panel"><div className="panel-eyebrow">BOLO</div>{state.bolos.length ? state.bolos.map(b => <div className="record-row" key={b.id}><span className={`record-priority ${b.priority}`}>{b.targetType}</span><div><b>{b.targetLabel}</b><small>{b.description} · {b.status}</small>{b.status === 'active' && <div className="police-actions"><button onClick={() => run(() => policeBoloAction(b.id,'resolve'))}>{copy.resolve}</button><button onClick={() => run(() => policeBoloAction(b.id,'cancel'))}>{copy.cancel}</button></div>}</div></div>) : <Empty text={copy.noBolos} />}</div></div>;
  }

  function RecordCreator() {
    const [kind,setKind] = useState<'report'|'warrant'|'bolo'>('report'); const [subject,setSubject] = useState(''); const [reason,setReason] = useState('');
    const submit = () => { if (!subject.trim()) return; if (kind === 'report') run(() => createPoliceReport({ title:subject, narrative:reason, finalize:false })); else if (kind === 'warrant') run(() => createPoliceWarrant({ subjectName:subject, reason:reason || subject, priority:'medium' })); else run(() => createPoliceBolo({ targetType:'person', targetLabel:subject, description:reason || subject, priority:'medium', expiresInHours:24 })); setSubject(''); setReason(''); };
    return <div className="police-panel record-create"><div className="segmented"><button className={kind==='report'?'active':''} onClick={() => setKind('report')}>{copy.createReport}</button><button className={kind==='warrant'?'active':''} onClick={() => setKind('warrant')}>{copy.createWarrant}</button><button className={kind==='bolo'?'active':''} onClick={() => setKind('bolo')}>{copy.createBolo}</button></div><label>{copy.subject}<input value={subject} onChange={e=>setSubject(e.target.value)} /></label><label>{copy.reason}<textarea value={reason} onChange={e=>setReason(e.target.value)} rows={4} /></label><button disabled={!operational || busy || !subject.trim()} onClick={submit}>{copy.save}</button></div>;
  }

  function Evidence() {
    return <div className="police-grid"><div className="police-panel"><div className="panel-head"><div><div className="panel-eyebrow">EVIDENCE LOCKER</div><h2>{copy.evidence}</h2></div><button disabled={!operational || busy} onClick={() => run(() => createPoliceEvidence({ evidenceType:'trace', label:bg?'Фрагмент от ръкавица':'Glove fragment', description:bg?'Събрано от местопроизшествие':'Collected at scene', location:'Southside Market' }))}>{copy.collectEvidence}</button></div>{state.evidence.length ? state.evidence.map(item => <article className="evidence-card" key={item.id}><header><span>EV-{item.evidenceNumber}</span><b>{item.label}</b><em>{item.status}</em></header><p>{item.description}</p><small>{item.location}</small><div className="police-actions"><button onClick={() => run(() => policeEvidenceAction(item.id,'store',bg?'Предадено в evidence locker':'Stored in evidence locker'))}>{copy.store}</button><button onClick={() => run(() => policeEvidenceAction(item.id,'check_out',bg?'Взето за разследване':'Checked out for investigation'))}>{copy.checkout}</button><button onClick={() => run(() => policeEvidenceAction(item.id,'release',bg?'Освободено от evidence':'Released from evidence'))}>{copy.releaseEvidence}</button></div><details><summary>{copy.chain}</summary>{item.events.map(ev => <div key={ev.id} className="chain-row"><b>{ev.eventType}</b><span>{ev.note}</span><time>{new Date(ev.createdAt).toLocaleString()}</time></div>)}</details></article>) : <Empty text={copy.noEvidence} />}</div></div>;
  }

  function Pursuit() {
    const p = state.pursuit;
    return <div className="police-grid"><div className="police-panel police-span-2"><div className="panel-head"><div><div className="panel-eyebrow">PURSUIT MANAGEMENT</div><h2>{copy.pursuit}</h2></div>{!p && <button disabled={!operational || busy} onClick={() => run(() => startPolicePursuit({ callId:state.calls[0]?.id ?? null,district:'Las Palmas West',streetSegment:'market_block_3',direction:'eastbound' }))}>{copy.startPursuit}</button>}</div>{!p ? <Empty text={copy.noPursuit} /> : <><div className="pursuit-status"><div><small>{p.visualContact?copy.visual:copy.lost}</small><b>{p.status}</b></div><Metric label={copy.distance} value={p.distanceIndex} suffix="%" /><Metric label={copy.risk} value={p.risk} suffix="%" /><Metric label={copy.confidence} value={p.searchConfidence} suffix="%" /></div>{!p.visualContact && <div className="lkp-card"><small>{copy.lkp}</small><b>{p.district} · {p.streetSegment}</b><span>{p.direction}</span><div className="confidence-bar"><i style={{width:`${p.searchConfidence}%`}} /></div></div>}<div className="police-actions wrap pursuit-actions"><button onClick={()=>run(()=>policePursuitAction(p.id,'aggressive'))}>{copy.aggressive}</button><button onClick={()=>run(()=>policePursuitAction(p.id,'maintain_visual'))}>{copy.maintain}</button><button onClick={()=>run(()=>policePursuitAction(p.id,'predict_route'))}>{copy.predict}</button><button onClick={()=>run(()=>policePursuitAction(p.id,'request_backup'))}>{copy.backup}</button><button onClick={()=>run(()=>policePursuitAction(p.id,'containment'))}>{copy.containment}</button><button onClick={()=>run(()=>policePursuitAction(p.id,'back_off'))}>{copy.backoff}</button>{p.visualContact?<button className="soft" onClick={()=>run(()=>policePursuitAction(p.id,'lose_visual'))}>{copy.loseVisual}</button>:<button onClick={()=>run(()=>policePursuitAction(p.id,'refresh_search'))}>{copy.refresh}</button>}<button onClick={()=>run(()=>policePursuitAction(p.id,'contain'))}>{copy.contain}</button><button onClick={()=>run(()=>policePursuitAction(p.id,'end'))}>{copy.end}</button></div></>}</div></div>;
  }

  function Audit() { return <div className="police-panel"><div className="panel-eyebrow">IMMUTABLE ACTIVITY TRAIL</div><h2>{copy.audit}</h2>{state.audit.length ? state.audit.map(a => <div className="audit-row" key={a.id}><time>{new Date(a.createdAt).toLocaleString()}</time><b>{a.action}</b><span>{a.entityType}</span></div>) : <Empty text={copy.noAudit} />}</div>; }
}

function Metric({label,value,suffix=''}:{label:string;value:number;suffix?:string}) { return <div className="police-metric"><small>{label}</small><b>{value}{suffix}</b></div>; }
function Empty({text}:{text:string}) { return <div className="police-empty">{text}</div>; }
function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
