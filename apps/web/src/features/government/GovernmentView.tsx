import { useEffect, useMemo, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import type { GovernmentLicense, GovernmentState } from '@sol-dorado/contracts/government';
import { getBootstrap } from '../../lib/api';
import { useI18n } from '../../i18n';
import {
  getGovernmentState,
  payGovernmentFine,
  requestBusinessLicense,
  requestDrivingLicense,
  requestIdCard,
  updateGovernmentIdentity
} from './governmentApi';

type Tab = 'documents' | 'licenses' | 'vehicles' | 'fines' | 'records';

export function GovernmentView({ onStateChange }: { onStateChange: (state: BootstrapState) => void }) {
  const { locale } = useI18n();
  const c = locale === 'bg' ? BG : EN;
  const [state, setState] = useState<GovernmentState | null>(null);
  const [tab, setTab] = useState<Tab>('documents');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationalityCode, setNationalityCode] = useState('SD');
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    getGovernmentState().then(next => {
      setState(next);
      setDateOfBirth(next.identity.dateOfBirth ?? '');
      setNationalityCode(next.identity.nationalityCode);
    }).catch(reason => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  const activeDriving = useMemo(() => state?.licenses.find(item => item.kind === 'driving' && item.status === 'active') ?? null, [state]);

  async function run(key: string, action: () => Promise<GovernmentState>, refreshHud = false) {
    setBusy(key); setError('');
    try {
      setState(await action());
      if (refreshHud) onStateChange(await getBootstrap());
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : String(reason);
      setError(c.errors[code] ?? code);
    } finally { setBusy(''); }
  }

  if (!state) return <section className="glass-panel p-5 text-sm text-slate-300">{error ? `${c.loadError}: ${error}` : c.loading}</section>;

  const identityReady = Boolean(state.identity.dateOfBirth && state.identity.verifiedAt);
  const tabs: Array<[Tab, string]> = [['documents', c.tabs.documents], ['licenses', c.tabs.licenses], ['vehicles', c.tabs.vehicles], ['fines', c.tabs.fines], ['records', c.tabs.records]];

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <header className="overflow-hidden rounded-2xl border border-amber-300/15 bg-[linear-gradient(135deg,rgba(12,26,31,.98),rgba(9,17,21,.98))] shadow-xl">
        <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">SOL DORADO · CIVIC REGISTRY</span>
            <h1 className="mt-2 text-2xl font-black text-slate-50">{c.title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{c.description}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
            <small className="block text-[10px] uppercase tracking-[.16em] text-slate-500">{c.citizenNumber}</small>
            <b className="mt-1 block font-mono text-base tracking-wider text-amber-100">{state.identity.citizenNumber}</b>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-white/8 px-3 py-2">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-bold ${tab === id ? 'bg-amber-300/12 text-amber-100' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>)}
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-100">{error}</div>}

      {tab === 'documents' && <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <article className="rounded-2xl border border-white/10 bg-[#0a151a] p-5 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div><span className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">{c.canonicalIdentity}</span><h2 className="mt-2 text-xl font-black text-white">{state.identity.legalName}</h2></div>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${identityReady ? 'border-emerald-300/25 bg-emerald-300/8 text-emerald-200' : 'border-amber-300/25 bg-amber-300/8 text-amber-100'}`}>{identityReady ? c.verified : c.unverified}</span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Field label={c.citizenNumber} value={state.identity.citizenNumber} />
            <Field label={c.residency} value={state.identity.residencyStatus} />
            <Field label={c.birthDate} value={state.identity.dateOfBirth ?? c.notSet} />
            <Field label={c.nationality} value={state.identity.nationalityCode} />
          </dl>
          <div className="mt-5 border-t border-white/8 pt-4">
            <h3 className="text-xs font-black text-slate-200">{c.verifyDetails}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{c.nameSource}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
              <input type="date" value={dateOfBirth} onChange={event => setDateOfBirth(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-slate-100" />
              <input value={nationalityCode} maxLength={3} onChange={event => setNationalityCode(event.target.value.toUpperCase())} aria-label={c.nationality} className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm uppercase text-slate-100" />
              <button disabled={busy !== '' || !dateOfBirth} onClick={() => run('identity', () => updateGovernmentIdentity({ dateOfBirth, nationalityCode }))} className="min-h-11 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-xs font-black text-cyan-100 disabled:opacity-40">{busy === 'identity' ? c.saving : c.verify}</button>
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-amber-300/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.12),transparent_35%),linear-gradient(145deg,#10212a,#091216)] p-5 shadow-xl">
          <div className="absolute right-4 top-3 text-5xl font-black text-white/[.035]">SD</div>
          <span className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">{c.idCard}</span>
          {state.idCard ? <>
            <div className="mt-5"><small className="text-slate-500">{c.holder}</small><div className="mt-1 text-lg font-black text-white">{state.identity.legalName}</div></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><Field label={c.documentNumber} value={state.idCard.documentNumber} /><Field label={c.status} value={state.idCard.status} /><Field label={c.issued} value={fmt(state.idCard.issuedAt, locale)} /><Field label={c.expires} value={fmt(state.idCard.expiresAt, locale)} /></div>
          </> : <div className="mt-6 rounded-xl border border-dashed border-white/12 p-4"><b className="text-sm text-slate-200">{c.noId}</b><p className="mt-1 text-xs leading-5 text-slate-500">{c.idRequirement}</p><button disabled={busy !== '' || !identityReady} onClick={() => run('id', requestIdCard, true)} className="mt-4 min-h-11 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 text-xs font-black text-amber-100 disabled:opacity-40">{busy === 'id' ? c.processing : c.issueId}</button></div>}
        </article>
      </div>}

      {tab === 'licenses' && <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
        <article className="rounded-2xl border border-white/10 bg-[#0a151a] p-5">
          <h2 className="text-base font-black text-white">{c.licensesTitle}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{c.licensesDescription}</p>
          <div className="mt-4 space-y-2">{state.licenses.length ? state.licenses.map(item => <LicenseRow key={item.id} license={item} locale={locale} />) : <Empty text={c.noLicenses} />}</div>
        </article>
        <div className="space-y-4">
          <article className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[.035] p-5"><span className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">DMV</span><h3 className="mt-2 font-black text-white">{c.drivingLicense}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{activeDriving ? `${c.active}: ${activeDriving.licenseNumber} · ${activeDriving.classCode}` : c.drivingRequirement}</p>{!activeDriving && <button disabled={busy !== '' || !state.idCard} onClick={() => run('driving', requestDrivingLicense, true)} className="mt-4 min-h-11 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-xs font-black text-cyan-100 disabled:opacity-40">{busy === 'driving' ? c.processing : c.issueDriving}</button>}</article>
          <article className="rounded-2xl border border-violet-300/12 bg-violet-300/[.035] p-5"><span className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">BUSINESS LICENSING</span><h3 className="mt-2 font-black text-white">{c.businessLicense}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{c.businessDescription}</p><div className="mt-3 flex gap-2"><input value={businessName} onChange={event => setBusinessName(event.target.value)} placeholder={c.businessPlaceholder} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-slate-100" /><button disabled={busy !== '' || !state.idCard || businessName.trim().length < 2} onClick={() => run('business', () => requestBusinessLicense({ businessName: businessName.trim() }))} className="min-h-11 rounded-xl border border-violet-300/25 bg-violet-300/10 px-4 text-xs font-black text-violet-100 disabled:opacity-40">{c.apply}</button></div></article>
        </div>
      </div>}

      {tab === 'vehicles' && <article className="rounded-2xl border border-white/10 bg-[#0a151a] p-5"><h2 className="text-base font-black text-white">{c.vehicleRegistrations}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{c.vehicleDescription}</p><div className="mt-4 grid gap-3 md:grid-cols-2">{state.vehicleRegistrations.length ? state.vehicleRegistrations.map(reg => <div key={reg.id} className="rounded-xl border border-white/8 bg-black/15 p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-sm text-slate-100">{reg.vehicleName}</b><small className="mt-1 block text-slate-500">{reg.modelId}</small></div><span className="font-mono text-sm font-black text-amber-100">{reg.registrationNumber}</span></div><div className="mt-3 text-[11px] text-slate-500">{c.status}: <span className="text-slate-300">{reg.status}</span> · {c.registered}: {fmt(reg.registeredAt, locale)}</div></div>) : <Empty text={c.noVehicles} />}</div></article>}

      {tab === 'fines' && <article className="rounded-2xl border border-white/10 bg-[#0a151a] p-5"><h2 className="text-base font-black text-white">{c.finesTitle}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{c.finesDescription}</p><div className="mt-4 space-y-3">{state.fines.length ? state.fines.map(fine => <div key={fine.id} className="rounded-xl border border-white/8 bg-black/15 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="text-sm text-slate-100">{fine.reason}</b><small className="mt-1 block text-slate-500">{fine.issuingAgency} · {fine.fineNumber}</small></div><div className="text-right"><b className="text-sm text-amber-100">${(fine.balanceCents / 100).toFixed(2)}</b><small className="block text-slate-500">{fine.status}</small></div></div>{fine.balanceCents > 0 && ['outstanding','partial'].includes(fine.status) && <button disabled={busy !== ''} onClick={() => run(`fine-${fine.id}`, () => payGovernmentFine({ fineId: fine.id, amountCents: fine.balanceCents }), true)} className="mt-3 min-h-10 rounded-lg border border-amber-300/20 bg-amber-300/8 px-3 text-xs font-black text-amber-100 disabled:opacity-40">{c.payBalance}</button>}</div>) : <Empty text={c.noFines} />}</div></article>}

      {tab === 'records' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><article className="rounded-2xl border border-white/10 bg-[#0a151a] p-5"><h2 className="text-base font-black text-white">{c.recordsTitle}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{c.recordsDescription}</p><div className="mt-4 space-y-2">{state.records.length ? state.records.map(record => <div key={record.id} className="border-l border-amber-300/25 py-2 pl-4"><div className="flex flex-wrap gap-x-3 gap-y-1"><b className="text-xs text-slate-200">{record.agency}</b><small className="text-slate-600">{fmt(record.createdAt, locale)}</small></div><p className="mt-1 text-xs leading-5 text-slate-400">{record.summary}</p></div>) : <Empty text={c.noRecords} />}</div></article><article className="rounded-2xl border border-white/10 bg-[#0a151a] p-5"><h2 className="text-base font-black text-white">{c.permitsTitle}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{c.permitsDescription}</p><div className="mt-4 space-y-2">{state.permits.length ? state.permits.map(permit => <div key={permit.id} className="rounded-xl border border-white/8 p-3"><b className="text-xs text-slate-200">{permit.kind}</b><small className="mt-1 block text-slate-500">{permit.permitNumber} · {permit.status}</small></div>) : <Empty text={c.noPermits} />}</div></article></div>}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] uppercase tracking-[.14em] text-slate-600">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-200">{value}</dd></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-slate-500">{text}</div>; }
function fmt(value: string, locale: 'bg' | 'en') { return new Date(value).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US'); }
function licenseName(license: GovernmentLicense, locale: 'bg' | 'en') {
  const map: Record<string, [string,string]> = { standard: ['Шофьорска книжка', 'Driving license'], real_estate_agent: ['Лиценз за брокер на имоти', 'Real estate agent license'], workplace_safety: ['Безопасност на труда', 'Workplace safety'], food_handler: ['Работа с храни', 'Food handler'], general_business: ['Общ бизнес лиценз', 'General business license'] };
  return map[license.code]?.[locale === 'bg' ? 0 : 1] ?? license.code.replaceAll('_', ' ');
}
function LicenseRow({ license, locale }: { license: GovernmentLicense; locale: 'bg' | 'en' }) { return <div className="rounded-xl border border-white/8 bg-black/15 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><b className="text-xs text-slate-200">{licenseName(license, locale)}</b><small className="mt-1 block text-slate-500">{license.licenseNumber}{license.classCode ? ` · ${license.classCode}` : ''}</small></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${license.status === 'active' ? 'border-emerald-300/20 text-emerald-200' : 'border-amber-300/20 text-amber-100'}`}>{license.status}</span></div>{license.subjectRef && <div className="mt-2 text-[10px] text-slate-500">{license.subjectRef}</div>}</div>; }

const BG = {
  loading:'Зареждане на гражданския регистър…',loadError:'Регистърът не може да се зареди',title:'Идентичност и държавни услуги',description:'Единен граждански запис за документи, лицензи, регистрации, разрешителни, глоби и официална история.',citizenNumber:'Граждански №',canonicalIdentity:'Canonical гражданска идентичност',verified:'Потвърдена',unverified:'Непотвърдена',residency:'Статут',birthDate:'Дата на раждане',nationality:'Гражданство',notSet:'Не е зададена',verifyDetails:'Потвърди гражданските данни',nameSource:'Името идва от активния character record и не се поддържа отделно тук.',saving:'Записване…',verify:'Потвърди',idCard:'Лична карта',holder:'Притежател',documentNumber:'Документ №',status:'Статус',issued:'Издадена',expires:'Валидна до',noId:'Няма активна лична карта',idRequirement:'Първо потвърди гражданските данни. Издаването струва $25 и се записва в официалната история.',processing:'Обработка…',issueId:'Издай лична карта · $25',licensesTitle:'Лицензи и квалификации',licensesDescription:'Шофьорските, професионалните и бизнес лицензите използват един и същ authoritative registry.',noLicenses:'Все още няма издадени или заявени лицензи.',drivingLicense:'Шофьорска книжка',drivingRequirement:'Изисква активна лична карта, потвърдена възраст 18+ и такса $120.',active:'Активна',issueDriving:'Издай стандартна книжка · $120',businessLicense:'Бизнес лиценз',businessDescription:'Подай заявление. То остава pending, докато бъде свързано с бъдещия canonical Business entity и бъде одобрено.',businessPlaceholder:'Име на бизнеса',apply:'Кандидатствай',vehicleRegistrations:'Регистрация на МПС',vehicleDescription:'Всеки придобит автомобил получава server-side registration record автоматично.',registered:'Регистрирано',noVehicles:'Няма регистрирани автомобили.',finesTitle:'Глоби и задължения',finesDescription:'Глобите са отделни от Police Heat и evidence. Плащането променя държавния запис и Cash atomically.',payBalance:'Плати остатъка',noFines:'Няма глоби или непогасени задължения.',recordsTitle:'Официална история',recordsDescription:'Audit timeline на държавни действия. Police evidence и EMS medical data не се смесват в този регистър.',noRecords:'Все още няма официални събития.',permitsTitle:'Разрешителни',permitsDescription:'Foundation за бъдещи property, event, commercial и други permits.',noPermits:'Няма активни разрешителни.',tabs:{documents:'Идентичност',licenses:'Лицензи',vehicles:'МПС',fines:'Глоби',records:'Записи'},errors:{identity_verification_required:'Първо потвърди гражданските данни.',id_card_already_active:'Вече имаш активна лична карта.',active_id_card_required:'Необходима е активна лична карта.',driving_license_age_required:'Шофьорска книжка изисква навършени 18 години.',driving_license_already_active:'Вече имаш активна шофьорска книжка.',insufficient_cash:'Нямаш достатъчно Cash.',business_license_application_exists:'Вече има активно или чакащо заявление за този бизнес.',invalid_date_of_birth:'Датата на раждане е невалидна.',fine_not_payable:'Тази глоба не може да бъде платена.'} as Record<string,string>
};
const EN = {
  loading:'Loading citizen registry…',loadError:'The registry could not load',title:'Identity & Government Services',description:'One citizen record for documents, licenses, registrations, permits, fines and official history.',citizenNumber:'Citizen no.',canonicalIdentity:'Canonical citizen identity',verified:'Verified',unverified:'Unverified',residency:'Residency',birthDate:'Date of birth',nationality:'Nationality',notSet:'Not set',verifyDetails:'Verify citizen details',nameSource:'The legal name follows the active character record and is not maintained separately here.',saving:'Saving…',verify:'Verify',idCard:'Identity card',holder:'Holder',documentNumber:'Document no.',status:'Status',issued:'Issued',expires:'Expires',noId:'No active identity card',idRequirement:'Verify citizen details first. Issuance costs $25 and is recorded in official history.',processing:'Processing…',issueId:'Issue identity card · $25',licensesTitle:'Licenses & qualifications',licensesDescription:'Driving, professional and business licenses use the same authoritative registry.',noLicenses:'No issued or pending licenses yet.',drivingLicense:'Driving license',drivingRequirement:'Requires an active identity card, verified age 18+ and a $120 fee.',active:'Active',issueDriving:'Issue standard license · $120',businessLicense:'Business license',businessDescription:'Submit an application. It stays pending until linked to the future canonical Business entity and approved.',businessPlaceholder:'Business name',apply:'Apply',vehicleRegistrations:'Vehicle registrations',vehicleDescription:'Every acquired vehicle receives a server-side registration record automatically.',registered:'Registered',noVehicles:'No registered vehicles.',finesTitle:'Fines & obligations',finesDescription:'Fines are separate from Police Heat and evidence. Payment updates the government record and Cash atomically.',payBalance:'Pay balance',noFines:'No fines or outstanding obligations.',recordsTitle:'Official history',recordsDescription:'Audit timeline of government actions. Police evidence and EMS medical data do not get mixed into this registry.',noRecords:'No official events yet.',permitsTitle:'Permits',permitsDescription:'Foundation for future property, event, commercial and other permits.',noPermits:'No active permits.',tabs:{documents:'Identity',licenses:'Licenses',vehicles:'Vehicles',fines:'Fines',records:'Records'},errors:{identity_verification_required:'Verify your citizen details first.',id_card_already_active:'You already have an active identity card.',active_id_card_required:'An active identity card is required.',driving_license_age_required:'A driving license requires age 18 or older.',driving_license_already_active:'You already have an active driving license.',insufficient_cash:'You do not have enough Cash.',business_license_application_exists:'An active or pending application already exists for this business.',invalid_date_of_birth:'The date of birth is invalid.',fine_not_payable:'This fine cannot be paid.'} as Record<string,string>
};
