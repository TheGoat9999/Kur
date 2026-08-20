import { useCallback, useEffect, useState } from 'react';
import type { BootstrapState, StreetObjectId, StreetState, WorldActionId, WorldNoticeId } from '@sol-dorado/contracts';
import { GameIcon } from '../../components/GameIcon';
import { useNotifications, type NotificationTone } from '../../components/Notifications';
import { useI18n, type TranslationKey } from '../../i18n';
import { ApiCommandError, getStreetState, runWorldAction } from '../../lib/api';
import { StreetScene } from './StreetScene';

interface Props {
  state: BootstrapState;
  onStateChange: (state: BootstrapState) => void;
}

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
  const [selectedObjectId, setSelectedObjectId] = useState<StreetObjectId | null>(null);
  const [busy, setBusy] = useState<WorldActionId | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try { setStreet(await getStreetState()); }
    catch { setLoadError(true); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function act(actionId: WorldActionId) {
    if (busy || !street) return;
    setBusy(actionId);
    try {
      const result = await runWorldAction(actionId, state.version);
      const copy = notices[result.noticeId];
      setStreet(result.street);
      onStateChange(result.state);
      if (result.street.currentSegmentId !== street.currentSegmentId) setSelectedObjectId(null);
      push({
        tone: copy.tone,
        title: t(copy.title),
        message: t(copy.message, { count: result.reward?.quantity ?? 1 })
      });
    } catch (reason) {
      const code = reason instanceof ApiCommandError ? reason.code : 'world_action_failed';
      push({ tone: 'error', title: t('common.actionBlocked'), message: worldError(code, t) });
      if (reason instanceof ApiCommandError && ['world_action_cooldown', 'state_version_conflict'].includes(reason.code)) await load();
    } finally {
      setBusy(null);
    }
  }

  if (!street && !loadError) {
    return <div className="street-loading"><span><GameIcon name="map-pin" size={22} /></span><p>{t('world.loadingStreet')}</p></div>;
  }
  if (!street) {
    return <div className="street-load-error"><GameIcon name="alert-triangle" size={24} /><h1>{t('world.loadFailed')}</h1><p>{t('world.loadFailedDetail')}</p><button className="primary-button" onClick={() => void load()}>{t('world.retry')}</button></div>;
  }

  return (
    <section className="world-screen">
      <StreetScene
        street={street}
        selectedObjectId={selectedObjectId}
        busy={busy}
        onSelectObject={objectId => setSelectedObjectId(objectId as StreetObjectId)}
        onAction={actionId => void act(actionId)}
        onCloseSelection={() => setSelectedObjectId(null)}
      />
    </section>
  );
}

function notice(title: TranslationKey, message: TranslationKey, tone: NotificationTone) {
  return { title, message, tone };
}

function worldError(code: string, t: ReturnType<typeof useI18n>['t']) {
  const errors: Record<string, TranslationKey> = {
    state_version_conflict: 'world.error.stateConflict',
    world_action_cooldown: 'world.error.cooldown',
    world_action_locked: 'world.error.locked',
    world_action_already_done: 'world.error.alreadyDone',
    world_action_wrong_location: 'world.error.wrongLocation',
    inventory_container_full: 'world.error.inventoryFull',
    inventory_capacity_exceeded: 'world.error.inventoryHeavy',
    inventory_container_not_found: 'world.error.inventoryMissing'
  };
  return t(errors[code] ?? 'world.error.generic');
}
