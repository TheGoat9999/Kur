import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { BootstrapState, FinanceState } from '@sol-dorado/contracts';
import type { PhoneAppId, PhoneSettings, PhoneState, PhoneThread } from '@sol-dorado/contracts/phone';
import {
  getFinance,
  getPhone,
  moveFinanceInternal,
  patchPhoneSettings,
  readPhoneNotification,
  savePhoneNote,
  sendPhoneMessage,
  setPhoneTask
} from '../../lib/api';
import { useI18n } from '../../i18n';
import { PhoneVehiclesApp } from './PhoneVehiclesApp';
import './phone.css';

interface PhoneOverlayProps {
  state: BootstrapState;
  onClose: () => void;
  onOpenFeature: (feature: 'finance' | 'jobs') => void;
  onLocateVehicle: (vehicleId: string) => void;
}

const APP_ORDER: PhoneAppId[] = [
  'messages', 'contacts', 'maps', 'vehicles', 'bank', 'tasks', 'jobs',
  'mail', 'notes', 'camera', 'gallery', 'settings', 'phone'
];
const DOCK_APPS: PhoneAppId[] = ['phone', 'messages', 'maps', 'bank'];
const GALLERY_STORAGE = 'sd_phone_gallery_v1';

const APP_COLORS: Record<PhoneAppId, string> = {
  phone: '#3bc76b', messages: '#2e9bf4', contacts: '#8e7cf0', maps: '#56b68b', vehicles: '#4f8f9a',
  bank: '#d4a84d', tasks: '#ef775f', jobs: '#cf8d43', mail: '#4f8be8',
  notes: '#f0bf49', camera: '#79848d', gallery: '#bc6dd6', settings: '#6d7780'
};

const APP_LABELS: Record<'bg' | 'en', Record<PhoneAppId, string>> = {
  bg: {
    phone: 'Телефон', messages: 'Съобщения', contacts: 'Контакти', maps: 'Карти', vehicles: 'Моите коли', bank: 'Банка', tasks: 'Задачи',
    jobs: 'Работа', mail: 'Поща', notes: 'Бележки', camera: 'Камера', gallery: 'Галерия', settings: 'Настройки'
  },
  en: {
    phone: 'Phone', messages: 'Messages', contacts: 'Contacts', maps: 'Maps', vehicles: 'My Cars', bank: 'Bank', tasks: 'Tasks',
    jobs: 'Work', mail: 'Mail', notes: 'Notes', camera: 'Camera', gallery: 'Gallery', settings: 'Settings'
  }
};

export function PhoneLauncher({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="phone-launcher" onClick={onOpen} aria-label="Open phone" title="Phone · P">
      <PhoneGlyph name="phone" />
      <span className="phone-launcher-pulse" />
      <kbd>P</kbd>
    </button>
  );
}

export function PhoneOverlay({ state, onClose, onOpenFeature, onLocateVehicle }: PhoneOverlayProps) {
  const { locale } = useI18n();
  const labels = APP_LABELS[locale];
  const [phone, setPhone] = useState<PhoneState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(true);
  const [activeApp, setActiveApp] = useState<PhoneAppId | null>(null);
  const [controlOpen, setControlOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [callTarget, setCallTarget] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date(state.serverTime));
  const unlockStart = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    getPhone()
      .then(next => { if (active) setPhone(next); })
      .catch(reason => {
        if (!active) return;
        const code = reason instanceof Error ? reason.message : String(reason);
        setError(code.includes('phone_not_carried')
          ? L(locale, 'Нямаш телефон в инвентара си.', 'You are not carrying a phone.')
          : L(locale, 'Телефонът не можа да се зареди.', 'The phone could not be loaded.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locale]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(value => new Date(value.getTime() + 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (controlOpen) setControlOpen(false);
        else if (activeApp) { setActiveApp(null); setSelectedThreadId(null); }
        else onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeApp, controlOpen, onClose]);

  const unread = phone?.notifications.filter(item => !item.read).length ?? 0;
  const style = phone ? {
    '--phone-accent': phone.device.settings.accent,
    '--phone-scale': String(phone.device.settings.uiScale)
  } as CSSProperties : undefined;

  async function applySettings(patch: Partial<PhoneSettings>) {
    if (!phone) return;
    const previous = phone;
    setPhone({ ...phone, device: { ...phone.device, settings: { ...phone.device.settings, ...patch } } });
    try { setPhone(await patchPhoneSettings(patch)); }
    catch { setPhone(previous); }
  }

  function openApp(appId: PhoneAppId) {
    setLocked(false);
    setControlOpen(false);
    setActiveApp(appId);
    if (appId !== 'messages') setSelectedThreadId(null);
  }

  async function openNotification(id: string, appId: PhoneAppId) {
    if (!phone) return;
    openApp(appId);
    const notification = phone.notifications.find(item => item.id === id);
    if (!notification?.read) {
      try { setPhone(await readPhoneNotification(id)); } catch { /* non-blocking */ }
    }
  }

  function goHome() {
    setActiveApp(null);
    setSelectedThreadId(null);
    setControlOpen(false);
  }

  return (
    <div className="phone-overlay-layer" style={style} aria-label={L(locale, 'Телефон', 'Phone')}>
      <div className="phone-device-wrap">
        <button className="phone-side-button phone-side-silent" aria-label="Silent" onClick={() => phone && void applySettings({ soundEnabled: !phone.device.settings.soundEnabled })} />
        <button className="phone-side-button phone-side-volume-up" aria-label="Volume up" />
        <button className="phone-side-button phone-side-volume-down" aria-label="Volume down" />
        <button className="phone-side-button phone-side-power" aria-label="Lock phone" onClick={() => { setLocked(value => !value); setControlOpen(false); }} />

        <section className={`phone-device ${phone?.device.settings.theme === 'light' ? 'phone-theme-light' : 'phone-theme-dark'}`}>
          <div className="phone-bezel-shine" />
          <div className="phone-screen">
            <div className={`phone-wallpaper phone-wallpaper-${phone?.device.settings.wallpaper ?? 'dorado'}`} />

            {loading && <PhoneLoading locale={locale} />}
            {!loading && error && <PhoneError locale={locale} error={error} onClose={onClose} />}

            {!loading && phone && (
              <>
                <StatusBar
                  phone={phone}
                  clock={clock}
                  unread={unread}
                  callTarget={callTarget}
                  onControl={() => setControlOpen(value => !value)}
                />

                {locked ? (
                  <LockScreen
                    phone={phone}
                    clock={clock}
                    locale={locale}
                    onNotification={openNotification}
                    onCamera={() => openApp('camera')}
                    onPointerDown={y => { unlockStart.current = y; }}
                    onPointerUp={y => {
                      if (unlockStart.current !== null && unlockStart.current - y > 42) setLocked(false);
                      unlockStart.current = null;
                    }}
                    onUnlock={() => setLocked(false)}
                  />
                ) : activeApp ? (
                  <PhoneAppView
                    appId={activeApp}
                    phone={phone}
                    state={state}
                    locale={locale}
                    selectedThreadId={selectedThreadId}
                    callTarget={callTarget}
                    onThread={setSelectedThreadId}
                    onState={setPhone}
                    onCall={setCallTarget}
                    onHome={goHome}
                    onOpenApp={openApp}
                    onSettings={patch => void applySettings(patch)}
                    onOpenFeature={feature => { onClose(); onOpenFeature(feature); }}
                    onLocateVehicle={vehicleId => { onClose(); onLocateVehicle(vehicleId); }}
                  />
                ) : (
                  <HomeScreen
                    phone={phone}
                    clock={clock}
                    locale={locale}
                    labels={labels}
                    onOpenApp={openApp}
                    onNotification={openNotification}
                  />
                )}

                {controlOpen && !locked && (
                  <ControlCenter phone={phone} locale={locale} onClose={() => setControlOpen(false)} onSettings={patch => void applySettings(patch)} />
                )}

                {callTarget && (
                  <CallOverlay target={callTarget} locale={locale} onEnd={() => setCallTarget(null)} />
                )}

                {!locked && (
                  <button className="phone-home-indicator" onClick={goHome} aria-label={L(locale, 'Начален екран', 'Home screen')}><span /></button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PhoneLoading({ locale }: { locale: 'bg' | 'en' }) {
  return <div className="phone-system-state"><div className="phone-boot-logo">SD</div><b>DoradoOS</b><span>{L(locale, 'Стартиране...', 'Starting...')}</span></div>;
}

function PhoneError({ locale, error, onClose }: { locale: 'bg' | 'en'; error: string; onClose: () => void }) {
  return <div className="phone-system-state phone-system-error"><PhoneGlyph name="phone" /><b>{error}</b><span>{L(locale, 'Вземи телефон в инвентара си и опитай отново.', 'Carry a phone in your inventory and try again.')}</span><button onClick={onClose}>{L(locale, 'Затвори', 'Close')}</button></div>;
}

function StatusBar({
  phone, clock, unread, callTarget, onControl
}: {
  phone: PhoneState; clock: Date; unread: number; callTarget: string | null; onControl: () => void;
}) {
  const time = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bars = phone.device.settings.airplaneMode ? 0 : phone.device.signalBars;
  return (
    <header className="phone-status-bar">
      <span className="phone-status-time">{time}</span>
      <button className={`phone-live-capsule ${callTarget ? 'phone-live-capsule-call' : unread ? 'phone-live-capsule-alert' : ''}`} aria-label="Live status">
        {callTarget ? <><span className="phone-live-dot" /><small>{callTarget}</small></> : unread ? <><span className="phone-live-dot" /><small>{unread}</small></> : <span className="phone-camera-dot" />}
      </button>
      <button className="phone-status-right" onClick={onControl} aria-label="Control Center">
        <span className="phone-signal-bars">{[1, 2, 3, 4].map(value => <i key={value} className={value <= bars ? 'active' : ''} />)}</span>
        <small>{phone.device.settings.airplaneMode ? '✈' : phone.device.network.toUpperCase()}</small>
        <span className="phone-battery"><i style={{ width: `${phone.device.batteryPercent}%` }} /></span>
      </button>
    </header>
  );
}

function LockScreen({
  phone, clock, locale, onNotification, onCamera, onPointerDown, onPointerUp, onUnlock
}: {
  phone: PhoneState; clock: Date; locale: 'bg' | 'en';
  onNotification: (id: string, appId: PhoneAppId) => void;
  onCamera: () => void;
  onPointerDown: (y: number) => void;
  onPointerUp: (y: number) => void;
  onUnlock: () => void;
}) {
  const notifications = phone.notifications.filter(item => !item.read).slice(0, 3);
  return (
    <main className="phone-lock-screen" onPointerDown={event => onPointerDown(event.clientY)} onPointerUp={event => onPointerUp(event.clientY)}>
      <div className="phone-lock-time">
        <small>{clock.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
        <strong>{clock.toLocaleTimeString(locale === 'bg' ? 'bg-BG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</strong>
      </div>

      <div className="phone-lock-notifications">
        {notifications.map(item => (
          <button key={item.id} onClick={() => void onNotification(item.id, item.appId)}>
            <AppIcon appId={item.appId} compact />
            <span><b>{item.title}</b>{phone.device.settings.showNotificationPreviews && <small>{item.body}</small>}</span>
            <time>{relativeTime(item.createdAt, locale)}</time>
          </button>
        ))}
      </div>

      <div className="phone-lock-bottom">
        <button aria-label="Flashlight"><PhoneGlyph name="flashlight" /></button>
        <button aria-label="Camera" onClick={onCamera}><PhoneGlyph name="camera" /></button>
      </div>
      <button className="phone-swipe-up" onClick={onUnlock}><span /><small>{L(locale, 'плъзни нагоре', 'swipe up')}</small></button>
    </main>
  );
}

function HomeScreen({
  phone, clock, locale, labels, onOpenApp, onNotification
}: {
  phone: PhoneState; clock: Date; locale: 'bg' | 'en'; labels: Record<PhoneAppId, string>;
  onOpenApp: (id: PhoneAppId) => void; onNotification: (id: string, appId: PhoneAppId) => void;
}) {
  const layout = sanitizeLayout(phone.device.settings.homeLayout);
  const gridApps = layout.filter(app => !DOCK_APPS.includes(app));
  const unreadByApp = unreadCounts(phone);
  const nextTask = phone.tasks.find(task => !task.completed);
  const notifications = phone.notifications.filter(item => !item.read).slice(0, 2);
  return (
    <main className="phone-home-screen">
      <section className="phone-widget-stack">
        <div className="phone-widget phone-widget-time">
          <span><small>SOL DORADO</small><b>{clock.toLocaleTimeString(locale === 'bg' ? 'bg-BG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</b></span>
          <span className="phone-widget-weather"><i>26°</i><small>{L(locale, 'Ясно', 'Clear')}</small></span>
        </div>
        {nextTask && <button className="phone-widget phone-widget-task" onClick={() => onOpenApp('tasks')}><PhoneGlyph name="tasks" /><span><small>{L(locale, 'Следваща задача', 'Next task')}</small><b>{nextTask.title}</b></span></button>}
      </section>

      <section className="phone-app-grid">
        {gridApps.map(appId => <AppButton key={appId} appId={appId} label={labels[appId]} badge={unreadByApp.get(appId) ?? 0} onClick={() => onOpenApp(appId)} />)}
      </section>

      {notifications.length > 0 && (
        <section className="phone-home-notices">
          {notifications.map(item => <button key={item.id} onClick={() => void onNotification(item.id, item.appId)}><AppIcon appId={item.appId} compact /><span><b>{item.title}</b><small>{item.body}</small></span></button>)}
        </section>
      )}

      <nav className="phone-dock">
        {DOCK_APPS.map(appId => <AppButton key={appId} appId={appId} label={labels[appId]} badge={unreadByApp.get(appId) ?? 0} dock onClick={() => onOpenApp(appId)} />)}
      </nav>
    </main>
  );
}

function PhoneAppView({
  appId, phone, state, locale, selectedThreadId, callTarget, onThread, onState, onCall, onHome, onOpenApp, onSettings, onOpenFeature, onLocateVehicle
}: {
  appId: PhoneAppId; phone: PhoneState; state: BootstrapState; locale: 'bg' | 'en'; selectedThreadId: string | null;
  callTarget: string | null; onThread: (id: string | null) => void; onState: (state: PhoneState) => void;
  onCall: (target: string | null) => void; onHome: () => void; onOpenApp: (id: PhoneAppId) => void;
  onSettings: (patch: Partial<PhoneSettings>) => void; onOpenFeature: (feature: 'finance' | 'jobs') => void;
  onLocateVehicle: (vehicleId: string) => void;
}) {
  const labels = APP_LABELS[locale];
  return (
    <main className="phone-app-view">
      <AppHeader appId={appId} title={labels[appId]} locale={locale} onHome={onHome} />
      <div className="phone-app-content">
        {appId === 'phone' && <DialerApp phone={phone} locale={locale} onCall={onCall} />}
        {appId === 'messages' && <MessagesApp phone={phone} locale={locale} selectedThreadId={selectedThreadId} onThread={onThread} onState={onState} onCall={onCall} />}
        {appId === 'contacts' && <ContactsApp phone={phone} locale={locale} onCall={onCall} onThread={thread => { onThread(thread); onOpenApp('messages'); }} />}
        {appId === 'maps' && <MapsApp state={state} locale={locale} />}
        {appId === 'vehicles' && <PhoneVehiclesApp locale={locale} onLocateVehicle={onLocateVehicle} />}
        {appId === 'bank' && <BankApp locale={locale} onOpenFull={() => onOpenFeature('finance')} />}
        {appId === 'tasks' && <TasksApp phone={phone} locale={locale} onState={onState} />}
        {appId === 'jobs' && <JobsApp locale={locale} onOpenFull={() => onOpenFeature('jobs')} />}
        {appId === 'mail' && <MailApp phone={phone} locale={locale} />}
        {appId === 'notes' && <NotesApp phone={phone} locale={locale} onState={onState} />}
        {appId === 'camera' && <CameraApp locale={locale} />}
        {appId === 'gallery' && <GalleryApp locale={locale} />}
        {appId === 'settings' && <SettingsApp phone={phone} locale={locale} onSettings={onSettings} />}
      </div>
      {callTarget && <span className="phone-app-call-live" />}
    </main>
  );
}

function AppHeader({ appId, title, locale, onHome }: { appId: PhoneAppId; title: string; locale: 'bg' | 'en'; onHome: () => void }) {
  return <header className="phone-app-header"><button onClick={onHome} aria-label={L(locale, 'Начало', 'Home')}><PhoneGlyph name="chevron" /></button><AppIcon appId={appId} compact /><b>{title}</b><span /></header>;
}

function DialerApp({ phone, locale, onCall }: { phone: PhoneState; locale: 'bg' | 'en'; onCall: (target: string) => void }) {
  const [dial, setDial] = useState('');
  const favorites = phone.contacts.filter(contact => contact.favorite);
  return (
    <section className="phone-dialer-app">
      <div className="phone-section-title"><span><small>{L(locale, 'МОЯТ НОМЕР', 'MY NUMBER')}</small><b>{phone.device.phoneNumber}</b></span></div>
      <div className="phone-favorites-row">{favorites.map(contact => <button key={contact.id} onClick={() => onCall(contact.name)}><Avatar name={contact.name} color={contact.color} /><small>{contact.name.split(' ')[0]}</small></button>)}</div>
      <div className="phone-dial-display">{dial || <span>{L(locale, 'Въведи номер', 'Enter number')}</span>}</div>
      <div className="phone-keypad">{['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => <button key={key} onClick={() => setDial(value => (value + key).slice(0, 18))}>{key}</button>)}</div>
      <div className="phone-dial-actions"><button className="phone-call-button" disabled={!dial} onClick={() => dial && onCall(dial)}><PhoneGlyph name="phone" /></button><button disabled={!dial} onClick={() => setDial(value => value.slice(0, -1))}><PhoneGlyph name="backspace" /></button></div>
    </section>
  );
}

function MessagesApp({ phone, locale, selectedThreadId, onThread, onState, onCall }: {
  phone: PhoneState; locale: 'bg' | 'en'; selectedThreadId: string | null; onThread: (id: string | null) => void;
  onState: (state: PhoneState) => void; onCall: (target: string) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const thread = phone.threads.find(item => item.id === selectedThreadId) ?? null;

  async function send() {
    if (!thread || !text.trim() || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    try { onState(await sendPhoneMessage(thread.id, body)); }
    catch { setText(body); }
    finally { setSending(false); }
  }

  if (thread) {
    return (
      <section className="phone-thread-view">
        <header><button onClick={() => onThread(null)}><PhoneGlyph name="chevron" /></button><Avatar name={thread.title} color="#567f94" /><span><b>{thread.title}</b><small>{thread.phoneNumber}</small></span><button onClick={() => onCall(thread.title)}><PhoneGlyph name="phone" /></button></header>
        <div className="phone-thread-messages">{thread.messages.map(message => <div key={message.id} className={`phone-message-bubble phone-message-${message.sender}`}><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleTimeString(locale === 'bg' ? 'bg-BG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</small></div>)}</div>
        <div className="phone-message-composer"><input value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void send(); }} placeholder={L(locale, 'Съобщение', 'Message')} /><button disabled={!text.trim() || sending} onClick={() => void send()}><PhoneGlyph name="send" /></button></div>
      </section>
    );
  }

  return (
    <section className="phone-list-app">
      <div className="phone-app-large-title"><h2>{L(locale, 'Съобщения', 'Messages')}</h2><span>{phone.threads.reduce((sum, item) => sum + item.unreadCount, 0)} {L(locale, 'непрочетени', 'unread')}</span></div>
      {phone.threads.map(item => {
        const last = item.messages[item.messages.length - 1];
        return <button className="phone-thread-row" key={item.id} onClick={() => onThread(item.id)}><Avatar name={item.title} color="#567f94" /><span><b>{item.title}</b><small>{last?.body ?? L(locale, 'Няма съобщения', 'No messages')}</small></span><time>{last ? relativeTime(last.createdAt, locale) : ''}</time>{item.unreadCount > 0 && <i>{item.unreadCount}</i>}</button>;
      })}
    </section>
  );
}

function ContactsApp({ phone, locale, onCall, onThread }: { phone: PhoneState; locale: 'bg' | 'en'; onCall: (target: string) => void; onThread: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const contacts = phone.contacts.filter(contact => contact.name.toLowerCase().includes(query.toLowerCase()) || contact.phoneNumber.includes(query));
  return (
    <section className="phone-list-app">
      <div className="phone-app-large-title"><h2>{L(locale, 'Контакти', 'Contacts')}</h2><span>{phone.contacts.length}</span></div>
      <label className="phone-search"><PhoneGlyph name="search" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={L(locale, 'Търси', 'Search')} /></label>
      {contacts.map(contact => {
        const thread = phone.threads.find(item => item.contactId === contact.id);
        return <div className="phone-contact-row" key={contact.id}><Avatar name={contact.name} color={contact.color} /><span><b>{contact.name}</b><small>{contact.phoneNumber}</small></span><button onClick={() => onCall(contact.name)}><PhoneGlyph name="phone" /></button><button disabled={!thread} onClick={() => thread && onThread(thread.id)}><PhoneGlyph name="messages" /></button></div>;
      })}
    </section>
  );
}

function MapsApp({ state, locale }: { state: BootstrapState; locale: 'bg' | 'en' }) {
  return (
    <section className="phone-maps-app">
      <div className="phone-map-canvas"><div className="phone-map-road road-a" /><div className="phone-map-road road-b" /><div className="phone-map-road road-c" /><div className="phone-map-block block-a" /><div className="phone-map-block block-b" /><div className="phone-map-block block-c" /><span className="phone-map-you"><i /></span><div className="phone-map-label">{state.location.district}</div></div>
      <div className="phone-location-card"><span className="phone-map-pin"><PhoneGlyph name="maps" /></span><div><small>{L(locale, 'ТЕКУЩО МЕСТОПОЛОЖЕНИЕ', 'CURRENT LOCATION')}</small><b>{state.location.streetSegment}</b><p>{state.location.district} · {state.location.zone}</p></div></div>
      <div className="phone-route-shortcuts"><button><PhoneGlyph name="home" /><span><b>{L(locale, 'Дом', 'Home')}</b><small>{L(locale, 'Запази адрес', 'Save address')}</small></span></button><button><PhoneGlyph name="star" /><span><b>{L(locale, 'Любими', 'Favorites')}</b><small>0</small></span></button></div>
    </section>
  );
}

function BankApp({ locale, onOpenFull }: { locale: 'bg' | 'en'; onOpenFull: () => void }) {
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getFinance().then(setFinance).catch(() => setError(L(locale, 'Банката е недостъпна.', 'Bank unavailable.'))); }, [locale]);

  async function transfer(direction: 'checking_to_savings' | 'savings_to_checking') {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0 || busy) return;
    setBusy(true); setError(null);
    try { const result = await moveFinanceInternal(direction, cents); setFinance(result.finance); setAmount(''); }
    catch { setError(L(locale, 'Трансферът не беше изпълнен.', 'Transfer failed.')); }
    finally { setBusy(false); }
  }

  if (!finance) return <div className="phone-inline-loading">{error ?? L(locale, 'Свързване с Dorado Bank...', 'Connecting to Dorado Bank...')}</div>;
  return (
    <section className="phone-bank-app">
      <div className="phone-bank-hero"><small>DORADO BANK</small><b>{money(finance.balances.checkingCents)}</b><span>{L(locale, 'Разплащателна сметка', 'Checking account')}</span></div>
      <div className="phone-bank-balances"><div><small>{L(locale, 'Спестявания', 'Savings')}</small><b>{money(finance.balances.savingsCents)}</b></div><div><small>{L(locale, 'Кредитен рейтинг', 'Credit score')}</small><b>{finance.creditScore}</b></div></div>
      <div className="phone-bank-transfer"><label>{L(locale, 'Бърз трансфер', 'Quick transfer')}<span><b>$</b><input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" /></span></label><div><button disabled={busy} onClick={() => void transfer('checking_to_savings')}>{L(locale, 'Към спестявания', 'To savings')}</button><button disabled={busy} onClick={() => void transfer('savings_to_checking')}>{L(locale, 'Към разплащателна', 'To checking')}</button></div>{error && <small className="phone-error-text">{error}</small>}</div>
      <div className="phone-bank-ledger"><h3>{L(locale, 'Последни операции', 'Recent activity')}</h3>{finance.ledger.slice(0, 5).map(entry => <div key={entry.id}><span><b>{entry.title}</b><small>{entry.detail}</small></span><em className={entry.direction === 'in' ? 'positive' : ''}>{entry.direction === 'in' ? '+' : '-'}{money(entry.amountCents)}</em></div>)}</div>
      <button className="phone-full-feature-button" onClick={onOpenFull}>{L(locale, 'Пълно банкиране', 'Full banking')} <PhoneGlyph name="arrow" /></button>
    </section>
  );
}

function TasksApp({ phone, locale, onState }: { phone: PhoneState; locale: 'bg' | 'en'; onState: (state: PhoneState) => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  async function toggle(id: string, completed: boolean) {
    setBusyId(id);
    try { onState(await setPhoneTask(id, completed)); } finally { setBusyId(null); }
  }
  const completed = phone.tasks.filter(task => task.completed).length;
  return <section className="phone-list-app"><div className="phone-app-large-title"><h2>{L(locale, 'Задачи', 'Tasks')}</h2><span>{completed}/{phone.tasks.length}</span></div>{phone.tasks.map(task => <button className={`phone-task-row ${task.completed ? 'done' : ''}`} key={task.id} disabled={busyId === task.id} onClick={() => void toggle(task.id, !task.completed)}><i>{task.completed && <PhoneGlyph name="check" />}</i><span><b>{task.title}</b><small>{task.source}{task.dueAt ? ` · ${new Date(task.dueAt).toLocaleTimeString(locale === 'bg' ? 'bg-BG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></span></button>)}</section>;
}

function JobsApp({ locale, onOpenFull }: { locale: 'bg' | 'en'; onOpenFull: () => void }) {
  return <section className="phone-jobs-app"><div className="phone-jobs-hero"><PhoneGlyph name="jobs" /><small>{L(locale, 'CAREER HUB', 'CAREER HUB')}</small><h2>{L(locale, 'Работа в Sol Dorado', 'Work in Sol Dorado')}</h2><p>{L(locale, 'Телефонът ще бъде бързата точка за смени, оферти, employer messages и задачи. Пълният career flow остава отделна система.', 'The phone is the quick access point for shifts, offers, employer messages and tasks. Full career progression remains a dedicated system.')}</p></div><div className="phone-job-cards"><article><span>01</span><div><b>{L(locale, 'Активна смяна', 'Active shift')}</b><small>{L(locale, 'Няма започната смяна', 'No active shift')}</small></div></article><article><span>02</span><div><b>{L(locale, 'Нови оферти', 'New offers')}</b><small>{L(locale, 'Провери Career Center', 'Check Career Center')}</small></div></article></div><button className="phone-full-feature-button" onClick={onOpenFull}>{L(locale, 'Отвори Career Center', 'Open Career Center')} <PhoneGlyph name="arrow" /></button></section>;
}

function MailApp({ phone, locale }: { phone: PhoneState; locale: 'bg' | 'en' }) {
  const mail = phone.notifications.filter(item => item.appId === 'mail');
  return <section className="phone-list-app"><div className="phone-app-large-title"><h2>{L(locale, 'Поща', 'Mail')}</h2><span>{mail.length}</span></div>{mail.length ? mail.map(item => <div className="phone-mail-row" key={item.id}><span className={!item.read ? 'unread' : ''} /><div><b>{item.title}</b><p>{item.body}</p><small>{relativeTime(item.createdAt, locale)}</small></div></div>) : <EmptyState icon="mail" title={L(locale, 'Входящата поща е празна', 'Inbox is empty')} text={L(locale, 'Системни и бизнес съобщения ще се появяват тук.', 'System and business mail will appear here.')} />}</section>;
}

function NotesApp({ phone, locale, onState }: { phone: PhoneState; locale: 'bg' | 'en'; onState: (state: PhoneState) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  function edit(noteId?: string) {
    const note = noteId ? phone.notes.find(item => item.id === noteId) : null;
    setEditingId(note?.id ?? 'new'); setTitle(note?.title ?? ''); setBody(note?.body ?? '');
  }
  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try { onState(await savePhoneNote({ noteId: editingId === 'new' ? undefined : editingId ?? undefined, title: title.trim(), body })); setEditingId(null); }
    finally { setSaving(false); }
  }
  if (editingId) return <section className="phone-note-editor"><input className="phone-note-title" value={title} onChange={event => setTitle(event.target.value)} placeholder={L(locale, 'Заглавие', 'Title')} /><textarea value={body} onChange={event => setBody(event.target.value)} placeholder={L(locale, 'Запиши нещо...', 'Write something...')} /><div><button onClick={() => setEditingId(null)}>{L(locale, 'Отказ', 'Cancel')}</button><button className="primary" disabled={!title.trim() || saving} onClick={() => void save()}>{L(locale, 'Запази', 'Save')}</button></div></section>;
  return <section className="phone-list-app"><div className="phone-app-large-title"><h2>{L(locale, 'Бележки', 'Notes')}</h2><button onClick={() => edit()}><PhoneGlyph name="plus" /></button></div><div className="phone-notes-grid">{phone.notes.map(note => <button key={note.id} onClick={() => edit(note.id)}><small>{note.pinned ? '● ' : ''}{new Date(note.updatedAt).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US')}</small><b>{note.title}</b><p>{note.body}</p></button>)}</div></section>;
}

function CameraApp({ locale }: { locale: 'bg' | 'en' }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'request' | 'ready' | 'denied'>('request');
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus('denied'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!alive) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => undefined); }
        setStatus('ready');
      } catch { if (alive) setStatus('denied'); }
    }
    void start();
    return () => { alive = false; streamRef.current?.getTracks().forEach(track => track.stop()); };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const width = Math.min(480, video.videoWidth || 480);
    const ratio = video.videoWidth ? video.videoHeight / video.videoWidth : 4 / 3;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = Math.round(width * ratio);
    const context = canvas.getContext('2d'); if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const src = canvas.toDataURL('image/jpeg', 0.62);
    setCaptured(src); saveGalleryPhoto(src);
  }

  return <section className="phone-camera-app"><div className="phone-camera-viewport">{status !== 'denied' && <video ref={videoRef} playsInline muted />}{status === 'request' && <span>{L(locale, 'Изчакване за достъп до камерата...', 'Waiting for camera permission...')}</span>}{status === 'denied' && <EmptyState icon="camera" title={L(locale, 'Камерата е недостъпна', 'Camera unavailable')} text={L(locale, 'Разреши camera permission в браузъра.', 'Allow camera permission in your browser.')} />}{captured && <img src={captured} alt="Last capture" />}</div><div className="phone-camera-controls"><button className="phone-camera-thumb" onClick={() => setCaptured(null)}>{captured && <img src={captured} alt="" />}</button><button className="phone-shutter" disabled={status !== 'ready'} onClick={capture}><span /></button><button><PhoneGlyph name="rotate" /></button></div></section>;
}

function GalleryApp({ locale }: { locale: 'bg' | 'en' }) {
  const [photos] = useState(readGallery);
  return <section className="phone-list-app"><div className="phone-app-large-title"><h2>{L(locale, 'Галерия', 'Gallery')}</h2><span>{photos.length}</span></div>{photos.length ? <div className="phone-gallery-grid">{photos.map(photo => <figure key={photo.id}><img src={photo.src} alt="" /><figcaption>{new Date(photo.createdAt).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US')}</figcaption></figure>)}</div> : <EmptyState icon="gallery" title={L(locale, 'Няма снимки', 'No photos yet')} text={L(locale, 'Снимките от камерата ще се появят тук.', 'Camera captures will appear here.')} />}</section>;
}

function SettingsApp({ phone, locale, onSettings }: { phone: PhoneState; locale: 'bg' | 'en'; onSettings: (patch: Partial<PhoneSettings>) => void }) {
  const settings = phone.device.settings;
  function moveApp(appId: PhoneAppId, direction: -1 | 1) {
    const layout = sanitizeLayout(settings.homeLayout);
    const index = layout.indexOf(appId); const target = index + direction;
    if (target < 0 || target >= layout.length) return;
    const next = [...layout]; [next[index], next[target]] = [next[target], next[index]];
    onSettings({ homeLayout: next });
  }
  return <section className="phone-settings-app"><div className="phone-settings-device"><div className="phone-settings-device-icon"><PhoneGlyph name="phone" /></div><span><b>{phone.device.deviceName}</b><small>{phone.device.phoneNumber}</small></span></div><SettingsGroup title={L(locale, 'Външен вид', 'Appearance')}><SettingChoice label={L(locale, 'Тема', 'Theme')} value={settings.theme === 'dark' ? L(locale, 'Тъмна', 'Dark') : L(locale, 'Светла', 'Light')} onClick={() => onSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} /><div className="phone-wallpaper-picker">{(['dorado','midnight','coast','graphite'] as const).map(value => <button key={value} className={`${settings.wallpaper === value ? 'active' : ''} wallpaper-${value}`} onClick={() => onSettings({ wallpaper: value })}><span /></button>)}</div><label className="phone-accent-setting"><span>{L(locale, 'Акцент', 'Accent')}</span><input type="color" value={settings.accent} onChange={event => onSettings({ accent: event.target.value })} /></label><div className="phone-scale-choices"><span>{L(locale, 'Размер на телефона', 'Phone size')}</span>{[0.9,1,1.1].map(value => <button key={value} className={Math.abs(settings.uiScale - value) < 0.01 ? 'active' : ''} onClick={() => onSettings({ uiScale: value })}>{Math.round(value * 100)}%</button>)}</div></SettingsGroup><SettingsGroup title={L(locale, 'Известия и звук', 'Notifications & sound')}><SettingToggle label={L(locale, 'Не безпокой', 'Do Not Disturb')} value={settings.doNotDisturb} onChange={value => onSettings({ doNotDisturb: value })} /><SettingToggle label={L(locale, 'Звук', 'Sound')} value={settings.soundEnabled} onChange={value => onSettings({ soundEnabled: value })} /><SettingToggle label={L(locale, 'Вибрация', 'Vibration')} value={settings.vibrationEnabled} onChange={value => onSettings({ vibrationEnabled: value })} /><SettingToggle label={L(locale, 'Преглед на известия', 'Notification previews')} value={settings.showNotificationPreviews} onChange={value => onSettings({ showNotificationPreviews: value })} /></SettingsGroup><SettingsGroup title={L(locale, 'Начален екран', 'Home screen')}><div className="phone-layout-editor">{sanitizeLayout(settings.homeLayout).map((appId, index) => <div key={appId}><AppIcon appId={appId} compact /><span>{APP_LABELS[locale][appId]}</span><button disabled={index === 0} onClick={() => moveApp(appId, -1)}>↑</button><button disabled={index === settings.homeLayout.length - 1} onClick={() => moveApp(appId, 1)}>↓</button></div>)}</div></SettingsGroup></section>;
}

function ControlCenter({ phone, locale, onClose, onSettings }: { phone: PhoneState; locale: 'bg' | 'en'; onClose: () => void; onSettings: (patch: Partial<PhoneSettings>) => void }) {
  const settings = phone.device.settings;
  return <section className="phone-control-center"><button className="phone-control-scrim" onClick={onClose} aria-label="Close" /><div className="phone-control-sheet"><div className="phone-control-grab" /><div className="phone-control-grid"><button className={settings.airplaneMode ? 'active' : ''} onClick={() => onSettings({ airplaneMode: !settings.airplaneMode })}><PhoneGlyph name="airplane" /><span>{L(locale, 'Самолет', 'Airplane')}</span></button><button className={!settings.airplaneMode ? 'active-blue' : ''} onClick={() => onSettings({ airplaneMode: false })}><PhoneGlyph name="signal" /><span>{phone.device.network.toUpperCase()}</span></button><button className={settings.doNotDisturb ? 'active' : ''} onClick={() => onSettings({ doNotDisturb: !settings.doNotDisturb })}><PhoneGlyph name="moon" /><span>{L(locale, 'Фокус', 'Focus')}</span></button><button className={settings.soundEnabled ? 'active-blue' : ''} onClick={() => onSettings({ soundEnabled: !settings.soundEnabled })}><PhoneGlyph name="speaker" /><span>{L(locale, 'Звук', 'Sound')}</span></button></div><div className="phone-control-info"><span><PhoneGlyph name="battery" /><b>{phone.device.batteryPercent}%</b><small>{phone.device.charging ? L(locale, 'Зарежда се', 'Charging') : L(locale, 'Батерия', 'Battery')}</small></span><span><PhoneGlyph name="signal" /><b>{phone.device.signalBars}/4</b><small>{L(locale, 'Сигнал', 'Signal')}</small></span></div><button className="phone-control-close" onClick={onClose}>{L(locale, 'Готово', 'Done')}</button></div></section>;
}

function CallOverlay({ target, locale, onEnd }: { target: string; locale: 'bg' | 'en'; onEnd: () => void }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setSeconds(value => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  return <section className="phone-call-overlay"><div className="phone-call-blur" /><div className="phone-call-content"><Avatar name={target} color="#597887" large /><small>{seconds < 3 ? L(locale, 'Свързване...', 'Calling...') : duration(seconds)}</small><h2>{target}</h2><div className="phone-call-controls"><button><PhoneGlyph name="mute" /><span>{L(locale, 'Заглуши', 'Mute')}</span></button><button><PhoneGlyph name="speaker" /><span>{L(locale, 'Говорител', 'Speaker')}</span></button></div><button className="phone-end-call" onClick={onEnd}><PhoneGlyph name="phone" /></button></div></section>;
}

function AppButton({ appId, label, badge, dock = false, onClick }: { appId: PhoneAppId; label: string; badge: number; dock?: boolean; onClick: () => void }) {
  return <button className={`phone-app-button ${dock ? 'phone-app-button-dock' : ''}`} onClick={onClick}><span className="phone-app-icon-wrap"><AppIcon appId={appId} />{badge > 0 && <i className="phone-app-badge">{badge > 99 ? '99+' : badge}</i>}</span>{!dock && <small>{label}</small>}</button>;
}

function AppIcon({ appId, compact = false }: { appId: PhoneAppId; compact?: boolean }) {
  return <span className={`phone-app-icon phone-app-icon-${compact ? 'compact' : 'full'}`} style={{ '--app-color': APP_COLORS[appId] } as CSSProperties}><PhoneGlyph name={appId} /></span>;
}

function Avatar({ name, color, large = false }: { name: string; color: string; large?: boolean }) {
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className={`phone-avatar ${large ? 'phone-avatar-large' : ''}`} style={{ '--avatar-color': color } as CSSProperties}>{initials}</span>;
}

function EmptyState({ icon, title, text }: { icon: GlyphName; title: string; text: string }) {
  return <div className="phone-empty-state"><span><PhoneGlyph name={icon} /></span><b>{title}</b><p>{text}</p></div>;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="phone-settings-group"><h3>{title}</h3><div>{children}</div></section>;
}
function SettingChoice({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return <button className="phone-setting-row" onClick={onClick}><span>{label}</span><b>{value}</b><PhoneGlyph name="arrow" /></button>;
}
function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="phone-setting-toggle"><span>{label}</span><input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} /><i /></label>;
}

function unreadCounts(phone: PhoneState) {
  const map = new Map<PhoneAppId, number>();
  for (const item of phone.notifications) if (!item.read) map.set(item.appId, (map.get(item.appId) ?? 0) + 1);
  const messageUnread = phone.threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
  if (messageUnread) map.set('messages', Math.max(map.get('messages') ?? 0, messageUnread));
  return map;
}

function sanitizeLayout(layout: PhoneAppId[]) {
  const valid = layout.filter((value, index) => APP_ORDER.includes(value) && layout.indexOf(value) === index);
  return [...valid, ...APP_ORDER.filter(value => !valid.includes(value))];
}

function relativeTime(value: string, locale: 'bg' | 'en') {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return L(locale, 'сега', 'now');
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
function money(cents: number) { return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function duration(total: number) { return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; }
function L(locale: 'bg' | 'en', bg: string, en: string) { return locale === 'bg' ? bg : en; }

interface GalleryPhoto { id: string; src: string; createdAt: string; }
function readGallery(): GalleryPhoto[] {
  try { const parsed = JSON.parse(localStorage.getItem(GALLERY_STORAGE) ?? '[]') as GalleryPhoto[]; return Array.isArray(parsed) ? parsed.slice(0, 8) : []; }
  catch { return []; }
}
function saveGalleryPhoto(src: string) {
  try {
    const next = [{ id: crypto.randomUUID(), src, createdAt: new Date().toISOString() }, ...readGallery()].slice(0, 8);
    localStorage.setItem(GALLERY_STORAGE, JSON.stringify(next));
  } catch { /* browser storage may be unavailable or full */ }
}

type GlyphName = PhoneAppId | 'flashlight' | 'chevron' | 'backspace' | 'send' | 'search' | 'home' | 'star' | 'check' | 'plus' | 'rotate' | 'arrow' | 'airplane' | 'signal' | 'moon' | 'speaker' | 'battery' | 'mute';
function PhoneGlyph({ name }: { name: GlyphName }) {
  let body: React.ReactNode;
  switch (name) {
    case 'phone': body = <path d="M7 3 10 7 8 10c1.5 3 3 4.5 6 6l3-2 4 3c-1 4-4 5-7 4C8 19 5 16 3 10 2 7 3 4 7 3Z" />; break;
    case 'messages': body = <><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9h8M8 12h5" /></>; break;
    case 'contacts': body = <><circle cx="12" cy="8" r="3" /><path d="M6 19c1-4 3-6 6-6s5 2 6 6M4 4h16v16H4Z" /></>; break;
    case 'maps': body = <><path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2V5Z" /><path d="M9 3v16M15 5v16" /></>; break;
    case 'vehicles': body = <><path d="M5 16h14l-1.4-5.2A2 2 0 0 0 15.7 9H8.3a2 2 0 0 0-1.9 1.8L5 16Z" /><path d="M4 16v3m16-3v3M7 19h10M7.5 13h.01M16.5 13h.01" /></>; break;
    case 'bank': body = <><path d="m3 9 9-5 9 5H3ZM5 10h14M6 10v7M10 10v7M14 10v7M18 10v7M4 18h16M3 21h18" /></>; break;
    case 'tasks': body = <><path d="M9 5h11M9 12h11M9 19h11" /><path d="m3 5 1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2" /></>; break;
    case 'jobs': body = <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2" /></>; break;
    case 'mail': body = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>; break;
    case 'notes': body = <><path d="M5 3h14v18H5Z" /><path d="M8 8h8M8 12h8M8 16h5" /></>; break;
    case 'camera': body = <><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="4" /><path d="m8 6 1-2h6l1 2" /></>; break;
    case 'gallery': body = <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m5 18 5-5 3 3 2-2 4 4" /></>; break;
    case 'settings': body = <><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /></>; break;
    case 'flashlight': body = <><path d="M8 3h8l-1 5h-6L8 3Zm2 5v4h4V8M9 12h6l-1 9h-4l-1-9Z" /></>; break;
    case 'chevron': body = <path d="m15 5-7 7 7 7" />; break;
    case 'backspace': body = <><path d="M20 6H9l-5 6 5 6h11V6Z" /><path d="m12 9 5 6m0-6-5 6" /></>; break;
    case 'send': body = <><path d="m21 3-8 18-3-8-8-3 19-7Z" /><path d="m10 13 11-10" /></>; break;
    case 'search': body = <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>; break;
    case 'home': body = <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>; break;
    case 'star': body = <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9L12 3Z" />; break;
    case 'check': body = <path d="m5 12 4 4L19 6" />; break;
    case 'plus': body = <path d="M12 4v16M4 12h16" />; break;
    case 'rotate': body = <><path d="M4 8V4h4M20 16v4h-4" /><path d="M5 5a9 9 0 0 1 14 3M19 19a9 9 0 0 1-14-3" /></>; break;
    case 'arrow': body = <path d="M5 12h14m-5-5 5 5-5 5" />; break;
    case 'airplane': body = <path d="m3 11 18-7-6 16-3-7-9-2Zm9 2 9-9" />; break;
    case 'signal': body = <><path d="M5 13a10 10 0 0 1 14 0M8 16a6 6 0 0 1 8 0M11 19a2 2 0 0 1 2 0" /></>; break;
    case 'moon': body = <path d="M20 15a8 8 0 0 1-11-11 9 9 0 1 0 11 11Z" />; break;
    case 'speaker': body = <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="M16 9c2 2 2 4 0 6M19 6c4 4 4 8 0 12" /></>; break;
    case 'battery': body = <><rect x="3" y="7" width="17" height="10" rx="2" /><path d="M22 10v4" /></>; break;
    case 'mute': body = <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="m17 10 4 4m0-4-4 4" /></>; break;
    default: body = <circle cx="12" cy="12" r="7" />;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{body}</svg>;
}
