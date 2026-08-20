import { useCallback, useEffect, useState } from 'react';
import type { BootstrapState, StreetObjectId, StreetState, WorldActionId, WorldNoticeId } from '@sol-dorado/contracts';
import { getStreetSpawnPosition, type StreetPosition } from '@sol-dorado/contracts/world-position';
import { GameIcon } from '../../components/GameIcon';
import { useNotifications, type NotificationTone } from '../../components/Notifications';
import { useI18n, type TranslationKey } from '../../i18n';
import { ApiCommandError, getBootstrap, getStreetPosition, getStreetState, moveStreetPlayer, runWorldAction } from '../../lib/api';
import { StreetScene } from './StreetScene';

interface Props { state: BootstrapState; onStateChange: (state: BootstrapState) => void; }

const notices: Record<WorldNoticeId, { title: TranslationKey; message: TranslationKey; tone: NotificationTone }> = {
  travel_market: notice('world.notice.travelMarket.title', 'world.notice.travelMarket.message', 'info'),
  travel_cypress: notice('world.notice.travelCypress.title', 'world.notice.travelCypress.message', 'info'),
  travel_alley: notice('world.notice.travelAlley.title', 'world.notice.travelAlley.message', 'info'),
  corner_inspected: notice('world.notice.cornerInspected.title', 'world.notice.cornerInspected.message', 'info'),
  corner_entered: notice('world.notice.cornerEntered.title', 'world.notice.cornerEntered.message', 'info'),
  shoplift_witnessed: notice('world.notice.shopliftWitnessed.title', 'world.notice.shopliftWitnessed.message', 'warning'),
  shoplift_clean: notice('world.notice.shopliftClean.title', 'world.notice.shopliftClean.message', 'reward'),
  clerk_spoken: notice('world.notice.clerkSpoken.title', 'world.notice.clerkSpoken.message', 'info'),
  delivery_complete: notice('world.notice.delivery.title', 'world.notice.delivery.message', 'success'),
  restaurant_inspected: notice('world.notice.restaurantInspected.title', 'world.notice.restaurantInspected.message', 'info'),
  restaurant_entered: notice('world.notice.restaurantEntered.title', 'world.notice.restaurantEntered.message', 'info'),
  apartment_inspected: notice('world.notice.apartmentInspected.title', 'world.notice.apartmentInspected.message', 'info'),
  alley_inspected: notice('world.notice.alleyInspected.title', 'world.notice.alleyInspected.message', 'info'),
  dumpster_salvage: notice('world.notice.dumpster.title', 'world.notice.dumpster.message', 'reward'),
  maya_greeting: notice('world.notice.mayaGreeting.title', 'world.notice.mayaGreeting.message', 'info'),
  maya_tip: notice('world.notice.mayaTip.title', 'world.notice.mayaTip.message', 'info')
};

export function WorldView({ state, onStateChange }: Props) {
  const { t } = useI18n();
  const { push } = useNotifications();
  const [street, setStreet] = useState<StreetState | null>(null);
  const [position, setPosition] = useState<StreetPosition | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<StreetObjectId | null>(null);
  const [busy, setBusy] = useState<WorldActionId | null>(null);
  const [moving, setMoving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [nextStreet, spatial] = await Promise.all([getStreetState(), getStreetPosition()]);
      setStreet(nextStreet);
      setPosition(spatial.position);
    } catch { setLoadError(true); }
  }, []);

  const refreshAuthoritative = useCallback(async () => {
    setLoadError(false);
    try {
      const [nextStreet, nextState, spatial] = await Promise.all([getStreetState(), getBootstrap(), getStreetPosition()]);
      setStreet(nextStreet); setPosition(spatial.position); onStateChange(nextState);
    } catch { setLoadError(true); }
  }, [onStateChange]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!street) return;
    const now = Date.now();
    const nextCooldown = street.actionStates.map(action => action.cooldownEndsAt ? new Date(action.cooldownEndsAt).getTime() : null).filter((value): value is number => value !== null && value > now).sort((a, b) => a - b)[0];
    if (!nextCooldown) return;
    const timer = window.setTimeout(() => void load(), Math.max(250, nextCooldown - now + 150));
    return () => window.clearTimeout(timer);
  }, [street, load]);

  async function move(target: StreetPosition) {
    if (moving || !street || !position) return;
    const previous = position;
    setMoving(true);
    setPosition(target);
    try {
      const result = await moveStreetPlayer(target);
      setPosition(result.position);
    } catch (reason) {
      setPosition(previous);
      const code = reason instanceof ApiCommandError ? reason.code : 'world_move_failed';
      push({ tone: 'error', title: t('common.actionBlocked'), message: worldError(code, t) });
    } finally { setMoving(false); }
  }

  async function act(actionId: WorldActionId) {
    if (busy || moving || !street) return;
    setBusy(actionId);
    try {
      const result = await runWorldAction(actionId, state.version);
      const copy = notices[result.noticeId];
      const changedSegment = result.street.currentSegmentId !== street.currentSegmentId;
      setStreet(result.street);
      onStateChange(result.state);
      if (changedSegment) {
        setSelectedObjectId(null);
        setPosition(getStreetSpawnPosition(result.street.currentSegmentId));
      }
      push({ tone: copy.tone, title: t(copy.title), message: t(copy.message, { count: result.reward?.quantity ?? 1 }) });
    } catch (reason) {
      const code = reason instanceof ApiCommandError ? reason.code : 'world_action_failed';
      push({ tone: 'error', title: t('common.actionBlocked'), message: worldError(code, t) });
      if (reason instanceof ApiCommandError && reason.code === 'state_version_conflict') await refreshAuthoritative();
      else if (reason instanceof ApiCommandError && ['world_action_cooldown', 'world_action_too_far'].includes(reason.code)) await load();
    } finally { setBusy(null); }
  }

  if ((!street || !position) && !loadError) return <div className="street-loading"><span><GameIcon name="map-pin" size={22} /></span><p>{t('world.loadingStreet')}</p></div>;
  if (!street || !position) return <div className="street-load-error"><GameIcon name="alert-triangle" size={24} /><h1>{t('world.loadFailed')}</h1><p>{t('world.loadFailedDetail')}</p><button className="primary-button" onClick={() => void load()}>{t('world.retry')}</button></div>;

  return <section className="world-screen"><StreetScene street={street} position={position} moving={moving} selectedObjectId={selectedObjectId} busy={busy} onMove={target => void move(target)} onSelectObject={objectId => setSelectedObjectId(objectId as StreetObjectId)} onAction={actionId => void act(actionId)} onCloseSelection={() => setSelectedObjectId(null)} /></section>;
}

function notice(title: TranslationKey, message: TranslationKey, tone: NotificationTone) { return { title, message, tone }; }
function worldError(code: string, t: ReturnType<typeof useI18n>['t']) {
  const errors: Record<string, TranslationKey> = {
    state_version_conflict: 'world.error.stateConflict', world_action_cooldown: 'world.error.cooldown', world_action_locked: 'world.error.locked',
    world_action_already_done: 'world.error.alreadyDone', world_action_wrong_location: 'world.error.wrongLocation', world_action_too_far: 'world.error.wrongLocation',
    world_position_blocked: 'world.error.wrongLocation', inventory_container_full: 'world.error.inventoryFull', inventory_capacity_exceeded: 'world.error.inventoryHeavy', inventory_container_not_found: 'world.error.inventoryMissing'
  };
  return t(errors[code] ?? 'world.error.generic');
}
