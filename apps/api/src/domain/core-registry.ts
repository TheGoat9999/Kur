import type { CoreJobDefinition } from '@sol-dorado/contracts/admin';
import { CORE_ITEM_CATALOG } from './items/index.js';
import { JOBS } from './jobs-catalog.js';

export const CORE_PERMISSION_KEYS = Object.freeze([
  'core.view',
  'admin.roles',
  'admin.money',
  'admin.items',
  'admin.vehicles',
  'admin.jobs'
] as const);

export const CORE_ROLE_KEYS = Object.freeze(['owner', 'developer', 'tester', 'moderator'] as const);

export const CORE_JOBS: readonly CoreJobDefinition[] = Object.freeze([
  ...JOBS.map(job => ({
    id: job.id,
    titleBg: job.titleBg,
    titleEn: job.titleEn,
    kind: 'standard' as const,
    category: job.category,
    source: 'jobs' as const
  })),
  { id: 'police', titleBg: 'Полиция', titleEn: 'Police', kind: 'institutional', category: 'public_safety', source: 'police' },
  { id: 'ems', titleBg: 'Спешна медицинска помощ', titleEn: 'Emergency Medical Services', kind: 'institutional', category: 'public_safety', source: 'ems' },
  { id: 'real_estate', titleBg: 'Недвижими имоти', titleEn: 'Real Estate', kind: 'institutional', category: 'profession', source: 'real_estate' }
]);

export { CORE_ITEM_CATALOG };
