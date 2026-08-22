import { useState } from 'react';
import type { EmsPriority } from '@sol-dorado/contracts/ems';
import { reportEmsCall } from '../ems/ems-api';
import './phone-emergency.css';

const PRIORITIES: Array<{ value: EmsPriority; bg: string; en: string }> = [
  { value: 'p1', bg: 'Критично', en: 'Critical' },
  { value: 'p2', bg: 'Спешно', en: 'Urgent' },
  { value: 'p3', bg: 'Стабилно', en: 'Stable' },
  { value: 'p4', bg: 'Нисък риск', en: 'Low risk' }
];

export function PhoneEmergencyApp({ locale }: { locale: 'bg' | 'en' }) {
  const bg = locale === 'bg';
  const [priority, setPriority] = useState<EmsPriority>('p2');
  const [incidentType, setIncidentType] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    const type = incidentType.trim();
    const details = summary.trim();
    if (type.length < 2 || details.length < 2) {
      setError(bg ? 'Опиши инцидента и какво се е случило.' : 'Describe the incident and what happened.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await reportEmsCall(priority, type, details);
      setNotice(bg ? result.noticeBg : result.noticeEn);
      setPriority('p2');
      setIncidentType('');
      setSummary('');
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : String(reason);
      setError(code === 'ems_location_unavailable'
        ? (bg ? 'Текущата ти локация не е налична.' : 'Your current location is unavailable.')
        : (bg ? 'Сигналът не можа да бъде изпратен.' : 'The emergency report could not be sent.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="phone-ems-app">
      <div className="phone-ems-hero">
        <span className="phone-ems-number">112</span>
        <div>
          <small>SOL DORADO EMERGENCY</small>
          <h2>{bg ? 'Медицинска помощ' : 'Medical emergency'}</h2>
          <p>{bg ? 'Изпрати сигнал към EMS. Текущата ти позиция се добавя автоматично.' : 'Send a report to EMS. Your current position is attached automatically.'}</p>
        </div>
      </div>

      {notice && <div className="phone-ems-notice success">{notice}</div>}
      {error && <div className="phone-ems-notice error">{error}</div>}

      <div className="phone-ems-priorities" role="group" aria-label={bg ? 'Спешност' : 'Urgency'}>
        {PRIORITIES.map(item => (
          <button
            key={item.value}
            className={priority === item.value ? 'active' : ''}
            onClick={() => setPriority(item.value)}
            type="button"
          >
            <b>{item.value.toUpperCase()}</b>
            <small>{bg ? item.bg : item.en}</small>
          </button>
        ))}
      </div>

      <label className="phone-ems-field">
        <span>{bg ? 'Какъв е инцидентът?' : 'What is the incident?'}</span>
        <input
          value={incidentType}
          onChange={event => setIncidentType(event.target.value)}
          maxLength={80}
          placeholder={bg ? 'Падане, ПТП, загуба на съзнание…' : 'Fall, collision, unconscious person…'}
        />
      </label>

      <label className="phone-ems-field">
        <span>{bg ? 'Какво се е случило?' : 'What happened?'}</span>
        <textarea
          value={summary}
          onChange={event => setSummary(event.target.value)}
          maxLength={300}
          rows={5}
          placeholder={bg ? 'Кратка информация за диспечера…' : 'Short information for dispatch…'}
        />
        <small>{summary.length}/300</small>
      </label>

      <div className="phone-ems-location">
        <i />
        <span>
          <b>{bg ? 'Локацията се споделя със сигнала' : 'Location is attached to the report'}</b>
          <small>{bg ? 'Използва се server-authoritative позицията на героя.' : 'Uses the character server-authoritative position.'}</small>
        </span>
      </div>

      <button className="phone-ems-submit" disabled={busy} onClick={() => void submit()} type="button">
        {busy ? (bg ? 'Изпращане…' : 'Sending…') : (bg ? 'Изпрати сигнал към 112' : 'Send report to 112')}
      </button>
    </section>
  );
}
