import { useI18n, type TranslationKey } from '../../i18n';

const copy: Record<string, ReadonlyArray<TranslationKey>> = {
  finance: ['integration.finance.1', 'integration.finance.2', 'integration.finance.3'],
  vehicles: ['integration.vehicles.1', 'integration.vehicles.2', 'integration.vehicles.3'],
  property: ['integration.property.1', 'integration.property.2', 'integration.property.3'],
  jobs: ['integration.jobs.1', 'integration.jobs.2', 'integration.jobs.3'],
  hospitality: ['integration.hospitality.1', 'integration.hospitality.2', 'integration.hospitality.3'],
  police: ['integration.police.1', 'integration.police.2', 'integration.police.3']
} as const;

const titles: Record<keyof typeof copy, TranslationKey> = { finance: 'nav.finance', vehicles: 'nav.vehicles', property: 'nav.property', jobs: 'nav.jobs', hospitality: 'nav.hospitality', police: 'nav.police' };

export function IntegrationView({ feature }: { feature: keyof typeof copy }) {
  const { t } = useI18n();
  return <section className="glass-panel migration-panel"><div className="feature-badge feature-badge-migration"><span /> {t('integration.notPlayable')}</div><span className="eyebrow">{t('integration.migration')}</span><h1>{t(titles[feature])}</h1><p>{t('integration.description')}</p><div className="migration-grid">{copy[feature].map((item, index) => <div key={item}><b>0{index + 1}</b><span>{t(item)}</span></div>)}</div></section>;
}
