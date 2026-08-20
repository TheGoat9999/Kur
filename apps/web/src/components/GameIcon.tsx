import type { ReactNode } from 'react';

export type GameIconName =
  | 'world' | 'user' | 'package' | 'landmark' | 'briefcase' | 'car' | 'building'
  | 'utensils' | 'shield' | 'heart' | 'zap' | 'drumstick' | 'droplet' | 'brain'
  | 'flame' | 'map-pin' | 'clock' | 'panel-left-close' | 'panel-left-open'
  | 'arrow-left-right' | 'mouse-pointer' | 'lock' | 'wifi' | 'coins'
  | 'wallet' | 'credit-card' | 'receipt' | 'chart' | 'smartphone' | 'banknote'
  | 'send' | 'arrow-down-left' | 'arrow-up-right' | 'check' | 'x' | 'sparkles'
  | 'chevron-down' | 'languages' | 'info' | 'alert-triangle' | 'gift'
  | 'store' | 'trash' | 'eye' | 'message' | 'footprints' | 'door-open' | 'search' | 'arrow-right';

const paths: Record<GameIconName, ReactNode> = {
  world: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  package: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 0 10 8 4 8-4V7M12 11v10" /></>,
  landmark: <><path d="m3 10 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 18h16M3 21h18" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  car: <><path d="m5 17-1 2v2M19 17l1 2v2M5 17h14l-1.4-6.2A2 2 0 0 0 15.7 9H8.3a2 2 0 0 0-1.9 1.8L5 17Z" /><path d="M7 14h.01M17 14h.01M4 17h16" /></>,
  building: <><path d="M4 21V5l8-3v19M12 8h8v13M8 7h.01M8 11h.01M8 15h.01M16 12h.01M16 16h.01M2 21h20" /></>,
  utensils: <><path d="M6 3v7a3 3 0 0 0 6 0V3M9 3v18M17 3v18M17 3c3 2 3 7 0 9" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-5" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  drumstick: <><path d="M15 9a5 5 0 1 1-7-7c3-1 7 3 7 7Z" /><path d="m12 12 7 7M19 16l2 2a2.1 2.1 0 0 1-3 3l-2-2" /></>,
  droplet: <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" />,
  brain: <><path d="M9.5 4A3 3 0 0 0 4 5.5 3.5 3.5 0 0 0 5 12a3.5 3.5 0 0 0 4.5 5.5V4ZM14.5 4A3 3 0 0 1 20 5.5a3.5 3.5 0 0 1-1 6.5 3.5 3.5 0 0 1-4.5 5.5V4Z" /><path d="M9.5 8H7M14.5 8H17M9.5 13H7M14.5 13H17" /></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-3 5 0-4-2-7-4-9 0 5-3 7-3 12 0 5 3 8 8 8Z" />,
  'map-pin': <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  'panel-left-close': <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 9l-3 3 3 3" /></>,
  'panel-left-open': <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M12 9l3 3-3 3" /></>,
  'arrow-left-right': <><path d="M8 7 4 11l4 4M4 11h16M16 17l4-4-4-4" /></>,
  'mouse-pointer': <path d="m4 3 7 17 2-7 7-2L4 3Z" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  wifi: <><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7M3 11v4c0 1.7 2.7 3 6 3 1.1 0 2-.1 3-.4" /><path d="M15 11c3.3 0 6 1.3 6 3s-2.7 3-6 3-6-1.3-6-3M9 14v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" /></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12" /><path d="M16 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" /></>,
  'credit-card': <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
  receipt: <><path d="M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z" /><path d="M9 9h6M9 13h6" /></>,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-5 3 3 5-7" /></>,
  smartphone: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 5h4M11 18h2" /></>,
  banknote: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10a2 2 0 0 0 2-2h8a2 2 0 0 0 2 2v4a2 2 0 0 0-2 2H8a2 2 0 0 0-2-2v-4Z" /><circle cx="12" cy="12" r="2" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>,
  'arrow-down-left': <><path d="M17 7 7 17M7 8v9h9" /></>,
  'arrow-up-right': <><path d="M7 17 17 7M8 7h9v9" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7L5 14ZM19 13l.7 2.3 2.3.7-2.3.7L19 19l-.7-2.3L16 16l2.3-.7L19 13Z" /></>
  , 'chevron-down': <path d="m6 9 6 6 6-6" />
  , languages: <><path d="m5 8 6 6M4 14l6-7M2 5h12M7 3v2M22 21l-5-10-5 10M14 17h6" /></>
  , info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>
  , 'alert-triangle': <><path d="M10.3 3.6 2.4 17.4A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.6L13.7 3.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>
  , gift: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.5 4.8 5.2 6 3.2 9 5 12 8M16.5 8c2.5 0 3.5-1.5 2.7-2.8C18 3.2 15 5 12 8" /></>
  , store: <><path d="M4 10v10h16V10" /><path d="M3 4h18l-2 6a3 3 0 0 1-4 0 3 3 0 0 1-6 0 3 3 0 0 1-4 0L3 4Z" /><path d="M8 20v-6h8v6" /></>
  , trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>
  , eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>
  , message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /><path d="M8 9h8M8 13h5" /></>
  , footprints: <><path d="M8.5 13.5c2 1.2 2.5 3.8 1.1 5.9-1.4 2.1-4.4 1.9-5.5.1-1.2-1.9.4-4.9 2.1-6.1.7-.5 1.5-.4 2.3.1ZM15.5 3.2c2-1.2 4.5.2 4.5 2.5 0 2.2-2.5 4.1-4.4 4.6-2.2.5-3.7-1.7-2.7-3.8.7-1.5 1.5-2.7 2.6-3.3Z" /></>
  , 'door-open': <><path d="M4 21h16M6 21V4l10-2v19M16 5h3v16" /><path d="M12 12h.01" /></>
  , search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>
  , 'arrow-right': <><path d="M4 12h16M14 6l6 6-6 6" /></>
};

export function GameIcon({ name, size = 18, className = '' }: { name: GameIconName; size?: number; className?: string }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
