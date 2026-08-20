import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GameIcon, type GameIconName } from './GameIcon';
import { useI18n } from '../i18n';

export type NotificationTone = 'success' | 'error' | 'warning' | 'info' | 'reward';
interface NotificationInput { tone?: NotificationTone; title: string; message: string; duration?: number; }
interface NotificationEntry extends NotificationInput { id: number; tone: NotificationTone; duration: number; count: number; revision: number; }
interface NotificationValue { push: (notification: NotificationInput) => void; }

const NotificationContext = createContext<NotificationValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  const remove = useCallback((id: number) => {
    setNotifications(current => current.filter(notification => notification.id !== id));
  }, []);

  const push = useCallback((input: NotificationInput) => {
    setNotifications(current => {
      const duplicate = current.find(notification => notification.title === input.title && notification.message === input.message);
      if (duplicate) {
        return current.map(notification => notification.id === duplicate.id
          ? { ...notification, count: notification.count + 1, revision: notification.revision + 1 }
          : notification);
      }
      return [...current, {
        ...input,
        id: Date.now() + Math.round(Math.random() * 1000),
        tone: input.tone ?? 'info',
        duration: input.duration ?? 4600,
        count: 1,
        revision: 0
      }];
    });
  }, []);

  const value = useMemo(() => ({ push }), [push]);
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-viewport" aria-live="polite" aria-label={t('common.notifications')}>
        {notifications.slice(0, 3).map(notification => <NotificationCard key={notification.id} notification={notification} onDismiss={remove} />)}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}

function NotificationCard({ notification, onDismiss }: { notification: NotificationEntry; onDismiss: (id: number) => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(notification.id), notification.duration);
    return () => window.clearTimeout(timeout);
  }, [notification.duration, notification.id, notification.revision, onDismiss]);

  const icons: Record<NotificationTone, GameIconName> = {
    success: 'check', error: 'x', warning: 'alert-triangle', info: 'info', reward: 'gift'
  };

  return (
    <article className={`notification-card notification-${notification.tone}`}>
      <span className="notification-glow" />
      <span className="notification-icon"><GameIcon name={icons[notification.tone]} size={18} /></span>
      <div className="notification-copy">
        <div><b>{notification.title}</b>{notification.count > 1 && <small>×{notification.count}</small>}</div>
        <p>{notification.message}</p>
      </div>
      <button aria-label={t('common.dismiss')} onClick={() => onDismiss(notification.id)}><GameIcon name="x" size={14} /></button>
      <i className="notification-progress" key={notification.revision} style={{ animationDuration: `${notification.duration}ms` }} />
    </article>
  );
}
