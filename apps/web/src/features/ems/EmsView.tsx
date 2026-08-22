import { useEffect, useMemo, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import type { EmsCall, EmsOutcome, EmsPriority, EmsState, EmsTreatment } from '@sol-dorado/contracts/ems';
import { useI18n } from '../../i18n';
import { getBootstrap } from '../../lib/api';
import {
  acceptEmsCall, applyEmsTreatment, getEms, handoffEmsCall,
  saveEmsAssessment, setEmsDuty, updateEmsStatus
} from './ems-api';

type Tab = 'dispatch' | 'mdt';

const PRIORITY_COPY: Record<EmsPriority, { bg: string; en: string }> = {
  p1: { bg: 'P1 · Критично', en: 'P1 · Critical' },
  p2: { bg: 'P2 · Спешно', en: 'P2 · Urgent' },
  p3: { bg: 'P3 · Стабилно', en: 'P3 · Stable' },
  p4: { bg: 'P4 · Нисък риск', en: 'P4 · Low risk' }
};
const TREATMENTS: EmsTreatment[] = ['bandage','trauma_dressing','tourniquet','splint','oxygen','saline','cpr'];
const TREATMENT_BG: Record<EmsTreatment,string> = {bandage:'Превръзка',trauma_dressing:'Травма превръзка',tourniquet:'Турникет',splint:'Шина',oxygen:'Кислород',saline:'Физиологичен разтвор',cpr:'CPR'};
const OUTCOMES: EmsOutcome[] = ['treated_scene','transported','refused','deceased'];
const OUTCOME_BG: Record<EmsOutcome,string> = {treated_scene:'Лекуван на място',transported:'Транспортиран',refused:'Отказал лечение',deceased:'Починал'};

export function EmsView({ onClose, onStateChange }:{ onClose:()=>void; onStateChange:(state:BootstrapState)=>void }) {
  const { locale } = useI18n();
  const bg = locale === 'bg';
  const [ems,setEms] = useState<EmsState|null>(null);
  const [tab,setTab] = useState<Tab>('dispatch');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [notice,setNotice] = useState<string|null>(null);
  const [recordQuery,setRecordQuery] = useState('');

  useEffect(()=>{ getEms().then(setEms).catch(error=>setError(error instanceof Error?error.message:String(error))); },[]);

  async function mutate(work:()=>Promise<{ems:EmsState;noticeBg:string;noticeEn:string}>, refreshHud=false) {
    setBusy(true); setError(null);
    try {
      const result=await work(); setEms(result.ems); setNotice(bg?result.noticeBg:result.noticeEn);
      if(refreshHud) onStateChange(await getBootstrap());
    } catch(error) { setError(error instanceof Error?error.message:String(error)); }
    finally { setBusy(false); }
  }

  const records=useMemo(()=>{
    const q=recordQuery.trim().toLocaleLowerCase();
    return !q?ems?.records??[]:(ems?.records??[]).filter(record=>`${record.patientName} ${record.incidentType} ${record.callNumber}`.toLocaleLowerCase().includes(q));
  },[ems,recordQuery]);

  return <div className="absolute inset-2 z-50 overflow-hidden rounded-3xl border border-cyan-200/15 bg-[#071116]/[.985] shadow-[0_28px_90px_rgba(0,0,0,.7)] backdrop-blur-xl md:inset-5">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0b171d] px-4 py-3 md:px-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-red-300/25 bg-red-400/10 text-xl">✚</div>
        <div className="min-w-0 flex-1"><div className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">SOL DORADO MEDICAL</div><h2 className="truncate text-base font-black md:text-lg">{bg?'EMS · Дежурство и MDT':'EMS · Duty & MDT'}</h2></div>
        {ems&&<div className="hidden gap-2 text-xs md:flex"><Metric label={bg?'Ранг':'Rank'} value={rankLabel(ems.profile.rank,bg)}/><Metric label={bg?'Случаи':'Cases'} value={String(ems.profile.callsCompleted)}/><Metric label={bg?'Репутация':'Reputation'} value={`${ems.profile.reputation}%`}/></div>}
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-xl hover:bg-white/[.08]" aria-label={bg?'Затвори EMS':'Close EMS'}>×</button>
      </header>

      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/8 bg-black/20 p-2.5">
        <TabButton active={tab==='dispatch'} onClick={()=>setTab('dispatch')}>{bg?'Диспечер':'Dispatch'}</TabButton>
        <TabButton active={tab==='mdt'} onClick={()=>setTab('mdt')}>MDT</TabButton>
        {ems&&<button disabled={busy||Boolean(ems.profile.activeCallId&&!ems.profile.onDuty)} onClick={()=>mutate(()=>setEmsDuty(!ems.profile.onDuty))} className={`ml-auto min-h-10 shrink-0 rounded-xl border px-4 text-xs font-black ${ems.profile.onDuty?'border-emerald-300/30 bg-emerald-400/10 text-emerald-200':'border-white/10 bg-white/[.04] text-slate-300'}`}>{ems.profile.onDuty?(bg?'НА ДЕЖУРСТВО':'ON DUTY'):(bg?'Започни дежурство':'Start duty')}</button>}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 md:p-5">
        {notice&&<div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100">{notice}</div>}
        {error&&<div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-100">{errorCode(error,bg)}</div>}
        {!ems?<div className="grid min-h-64 place-items-center text-sm text-slate-400">{bg?'Зареждане на EMS…':'Loading EMS…'}</div>:
          tab==='dispatch'?<DispatchView ems={ems} bg={bg} busy={busy} mutate={mutate}/>:
          <MdtView records={records} query={recordQuery} onQuery={setRecordQuery} bg={bg}/>
        }
      </main>
    </div>
  </div>;
}

function DispatchView({ems,bg,busy,mutate}:{ems:EmsState;bg:boolean;busy:boolean;mutate:(work:()=>Promise<any>,refreshHud?:boolean)=>Promise<void>}) {
  const call=ems.activeCall;
  if(call) return <ActiveCall call={call} bg={bg} busy={busy} mutate={mutate}/>;
  return <div className="mx-auto max-w-5xl space-y-4">
    <section className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(9,28,36,.96),rgba(7,15,19,.96))] p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">EMS DISPATCH</div><h3 className="mt-1 text-xl font-black">{bg?'Активни повиквания':'Open calls'}</h3><p className="mt-1 text-sm text-slate-400">{bg?'Приеми един случай, излез към адреса и работи по него до handoff.':'Accept one case, respond physically and carry it through handoff.'}</p></div><div className="text-xs text-slate-400">{bg?'Печалба за смяната':'Shift earnings'} <b className="ml-1 text-slate-100">${(ems.profile.shiftEarningsCents/100).toFixed(2)}</b></div></div>
    </section>
    {!ems.profile.onDuty&&<Hint>{bg?'Трябва да започнеш дежурство, преди да приемеш повикване.':'Start duty before accepting a call.'}</Hint>}
    {ems.dispatch.length===0?<Empty>{bg?'Няма чакащи сигнали. 112 сигналите от телефоните на гражданите се появяват тук в реално време.':'No pending calls. Civilian phone 112 reports appear here in real time.'}</Empty>:
      <div className="grid gap-3 md:grid-cols-2">{ems.dispatch.map(call=><article key={call.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-base">#{call.callNumber} · {call.incidentType}</b><p className="mt-1 text-sm text-slate-400">{call.patientName}</p></div><Priority value={call.priority} bg={bg}/></div><p className="mt-3 text-sm leading-6 text-slate-300">{call.summary}</p><div className="mt-3 rounded-xl bg-black/20 p-3 text-xs text-slate-400"><b className="text-slate-200">{call.location.streetLabel}</b><br/>{bg?'Позиция':'Position'} {Math.round(call.location.positionX)} / {Math.round(call.location.positionY)}</div><button disabled={busy||!ems.profile.onDuty} onClick={()=>mutate(()=>acceptEmsCall(call.id))} className="mt-3 min-h-11 w-full rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950 disabled:opacity-35">{bg?'Приеми повикването':'Accept call'}</button></article>)}</div>}
  </div>;
}

function ActiveCall({call,bg,busy,mutate}:{call:EmsCall;bg:boolean;busy:boolean;mutate:(work:()=>Promise<any>,refreshHud?:boolean)=>Promise<void>}) {
  const [consciousness,setConsciousness]=useState<'alert'|'confused'|'unresponsive'>(call.assessment?.consciousness??'alert');
  const [breathing,setBreathing]=useState<'normal'|'labored'|'absent'>(call.assessment?.breathing??'normal');
  const [bleeding,setBleeding]=useState<'none'|'minor'|'major'>(call.assessment?.bleeding??'none');
  const [pain,setPain]=useState(call.assessment?.pain??0);
  const [notes,setNotes]=useState(call.assessment?.notes??'');
  const [outcome,setOutcome]=useState<EmsOutcome>('treated_scene');
  const [handoffNotes,setHandoffNotes]=useState('');
  const clinical=call.status==='on_scene'||call.status==='transporting';
  return <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.1fr_.9fr]">
    <section className="space-y-4"><div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.05] p-4 md:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">{bg?'АКТИВЕН СЛУЧАЙ':'ACTIVE CASE'}</div><h3 className="mt-1 text-xl font-black">#{call.callNumber} · {call.incidentType}</h3><p className="mt-1 text-sm text-slate-400">{call.patientName} · {call.location.streetLabel}</p></div><Priority value={call.priority} bg={bg}/></div><p className="mt-4 text-sm leading-6 text-slate-300">{call.summary}</p><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"><Metric label={bg?'Статус':'Status'} value={statusLabel(call.status,bg)}/><Metric label={bg?'X позиция':'X position'} value={String(Math.round(call.location.positionX))}/><Metric label={bg?'Y позиция':'Y position'} value={String(Math.round(call.location.positionY))}/><Metric label={bg?'Процедури':'Procedures'} value={String(call.treatments.length)}/></div></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h4 className="font-black">{bg?'Реакция на екипа':'Unit response'}</h4><p className="mt-1 text-xs leading-5 text-slate-400">{bg?'За „На място“ трябва физически да си на street segment-а на сигнала и достатъчно близо до координатите. Затвори EMS, придвижи се по картата и отвори отново от страничната навигация.':'To mark on scene you must physically be on the call street segment and close enough to its coordinates. Close EMS, move on the map, then reopen it from the sidebar.'}</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><Action disabled={busy||call.status!=='assigned'} onClick={()=>mutate(()=>updateEmsStatus(call.id,'en_route'))}>{bg?'Тръгвам':'En route'}</Action><Action disabled={busy||call.status!=='en_route'} onClick={()=>mutate(()=>updateEmsStatus(call.id,'on_scene'))}>{bg?'На място':'On scene'}</Action><Action disabled={busy||call.status!=='on_scene'} onClick={()=>mutate(()=>updateEmsStatus(call.id,'transporting'))}>{bg?'Транспорт':'Transport'}</Action></div></div>
      <div className={`rounded-2xl border p-4 ${clinical?'border-white/10 bg-white/[.03]':'border-white/5 bg-white/[.015] opacity-45'}`}><h4 className="font-black">{bg?'Първична оценка':'Primary assessment'}</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><Select label={bg?'Съзнание':'Consciousness'} value={consciousness} onChange={value=>setConsciousness(value as any)} options={bg?[['alert','Буден'],['confused','Объркан'],['unresponsive','Без реакция']]:[['alert','Alert'],['confused','Confused'],['unresponsive','Unresponsive']]}/><Select label={bg?'Дишане':'Breathing'} value={breathing} onChange={value=>setBreathing(value as any)} options={bg?[['normal','Нормално'],['labored','Затруднено'],['absent','Липсва']]:[['normal','Normal'],['labored','Labored'],['absent','Absent']]}/><Select label={bg?'Кървене':'Bleeding'} value={bleeding} onChange={value=>setBleeding(value as any)} options={bg?[['none','Няма'],['minor','Леко'],['major','Силно']]:[['none','None'],['minor','Minor'],['major','Major']]}/><label className="text-xs text-slate-400">{bg?'Болка 0–10':'Pain 0–10'}<input disabled={!clinical} type="number" min={0} max={10} value={pain} onChange={e=>setPain(Math.max(0,Math.min(10,Number(e.target.value))))} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-slate-100"/></label></div><textarea disabled={!clinical} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={bg?'Бележки за състоянието…':'Assessment notes…'} className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"/><button disabled={busy||!clinical} onClick={()=>mutate(()=>saveEmsAssessment({callId:call.id,consciousness,breathing,bleeding,pain,notes}))} className="mt-3 min-h-11 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-950 disabled:opacity-35">{bg?'Запиши оценката':'Save assessment'}</button></div>
    </section>
    <aside className="space-y-4"><div className="rounded-2xl border border-white/10 bg-[#0a151a] p-4"><h4 className="font-black">{bg?'Лечение':'Treatment'}</h4><p className="mt-1 text-xs text-slate-500">{bg?'Процедурите са gameplay abstraction и се записват към случая.':'Procedures are gameplay abstractions and are persisted to the case.'}</p><div className="mt-3 grid grid-cols-2 gap-2">{TREATMENTS.map(item=><Action key={item} disabled={busy||!clinical||!call.assessment} onClick={()=>mutate(()=>applyEmsTreatment(call.id,item),true)}>{bg?TREATMENT_BG[item]:item.replaceAll('_',' ')}</Action>)}</div>{call.treatments.length>0&&<div className="mt-3 space-y-1 text-xs text-slate-400">{call.treatments.map(t=><div key={t.id}>✓ {bg?TREATMENT_BG[t.treatment]:t.treatment.replaceAll('_',' ')}</div>)}</div>}</div><div className="rounded-2xl border border-white/10 bg-[#0a151a] p-4"><h4 className="font-black">{bg?'Handoff / приключване':'Handoff / close'}</h4><select value={outcome} onChange={e=>setOutcome(e.target.value as EmsOutcome)} className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#081116] px-3 text-sm">{OUTCOMES.map(value=><option key={value} value={value}>{bg?OUTCOME_BG[value]:value.replaceAll('_',' ')}</option>)}</select><textarea value={handoffNotes} onChange={e=>setHandoffNotes(e.target.value)} placeholder={bg?'Кратък handoff запис…':'Handoff note…'} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"/><button disabled={busy||!clinical} onClick={()=>mutate(()=>handoffEmsCall(call.id,outcome,handoffNotes),true)} className="mt-3 min-h-12 w-full rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950 disabled:opacity-35">{bg?'Приключи случая':'Close case'}</button></div></aside>
  </div>;
}

function MdtView({records,query,onQuery,bg}:{records:EmsState['records'];query:string;onQuery:(v:string)=>void;bg:boolean}) { return <div className="mx-auto max-w-5xl"><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">EMS MDT</div><h3 className="mt-1 text-xl font-black">{bg?'Медицински случаи':'Medical cases'}</h3><input value={query} onChange={e=>onQuery(e.target.value)} placeholder={bg?'Търси пациент, тип или номер…':'Search patient, type or case number…'} className="mt-4 min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm"/></div><div className="mt-3 space-y-2">{records.length===0?<Empty>{bg?'Няма намерени приключени случаи.':'No closed cases found.'}</Empty>:records.map(record=><article key={record.id} className="rounded-2xl border border-white/10 bg-[#0b151a] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><b>#{record.callNumber} · {record.patientName}</b><p className="mt-1 text-xs text-slate-500">{record.incidentType} · {new Date(record.createdAt).toLocaleString(bg?'bg-BG':'en-US')}</p></div><Priority value={record.priority} bg={bg}/></div><div className="mt-3 text-sm text-slate-300">{bg?'Изход':'Outcome'}: <b>{bg?OUTCOME_BG[record.outcome]:record.outcome.replaceAll('_',' ')}</b></div>{record.procedures.length>0&&<p className="mt-2 text-xs text-slate-400">{bg?'Процедури':'Procedures'}: {record.procedures.map(p=>bg?TREATMENT_BG[p]:p.replaceAll('_',' ')).join(', ')}</p>}{record.notes&&<p className="mt-2 rounded-xl bg-black/20 p-3 text-sm leading-6 text-slate-300">{record.notes}</p>}<p className="mt-2 text-xs text-slate-500">{bg?'Екип':'Responder'}: {record.responderName}</p></article>)}</div></div> }

function TabButton({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}) { return <button onClick={onClick} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-black ${active?'bg-cyan-300 text-slate-950':'border border-white/10 bg-white/[.03] text-slate-300'}`}>{children}</button> }
function Action({disabled,onClick,children}:{disabled:boolean;onClick:()=>void;children:React.ReactNode}) { return <button disabled={disabled} onClick={onClick} className="min-h-11 rounded-xl border border-white/10 bg-white/[.045] px-3 text-sm font-bold hover:border-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-30">{children}</button> }
function Metric({label,value}:{label:string;value:string}) { return <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2"><small className="block text-[9px] uppercase tracking-wider text-slate-500">{label}</small><b className="mt-0.5 block text-xs text-slate-100">{value}</b></div> }
function Priority({value,bg}:{value:EmsPriority;bg:boolean}) { const cls=value==='p1'?'border-red-300/30 bg-red-400/10 text-red-200':value==='p2'?'border-orange-300/30 bg-orange-400/10 text-orange-200':value==='p3'?'border-amber-300/30 bg-amber-400/10 text-amber-200':'border-slate-300/20 bg-white/[.04] text-slate-300';return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${cls}`}>{bg?PRIORITY_COPY[value].bg:PRIORITY_COPY[value].en}</span> }
function Hint({children}:{children:React.ReactNode}) { return <div className="rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-sm text-amber-100">{children}</div> }
function Empty({children}:{children:React.ReactNode}) { return <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">{children}</div> }
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[][]}) { return <label className="text-xs text-slate-400">{label}<select value={value} onChange={e=>onChange(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#081116] px-3 text-sm">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label> }
function rankLabel(rank:EmsState['profile']['rank'],bg:boolean){const map:any={emt:bg?'EMT':'EMT',paramedic:bg?'Парамедик':'Paramedic',senior_paramedic:bg?'Старши парамедик':'Senior paramedic',supervisor:bg?'Супервайзор':'Supervisor'};return map[rank]}
function statusLabel(status:EmsCall['status'],bg:boolean){const map:any={pending:['Чака','Pending'],assigned:['Приет','Assigned'],en_route:['На път','En route'],on_scene:['На място','On scene'],transporting:['Транспорт','Transporting'],closed:['Приключен','Closed'],cancelled:['Отказан','Cancelled']};return map[status][bg?0:1]}
function errorCode(code:string,bg:boolean){const map:Record<string,[string,string]>={ems_employment_required:['Нямаш EMS служебен достъп.','You do not have EMS staff access.'],ems_not_on_duty:['Не си на EMS дежурство.','You are not on EMS duty.'],ems_responder_already_assigned:['Вече имаш активен случай.','You already have an active case.'],ems_call_not_available:['Повикването вече не е достъпно.','The call is no longer available.'],ems_invalid_status_transition:['Невалиден преход на статуса.','Invalid status transition.'],ems_not_at_patient:['Трябва да си на място при пациента.','You must be on scene with the patient.'],ems_not_close_enough:['Още не си достатъчно близо до сигнала.','You are not close enough to the call location.'],ems_assessment_required:['Първо запиши оценка на пациента.','Save a patient assessment first.'],ems_active_call_blocks_off_duty:['Приключи активния случай преди края на дежурството.','Close the active case before ending duty.']};return map[code]?.[bg?0:1]??code}
