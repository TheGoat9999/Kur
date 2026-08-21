import { describe, expect, it } from 'vitest';
import { CORE_ITEM_CATALOG, CORE_JOBS, CORE_PERMISSION_KEYS, CORE_ROLE_KEYS } from '../src/domain/core-registry.js';
import { JOBS } from '../src/domain/jobs-catalog.js';

describe('Sol Dorado core registry', () => {
  it('reuses the canonical item catalog rather than maintaining a duplicate list', () => {
    expect(CORE_ITEM_CATALOG.length).toBeGreaterThan(0);
    expect(new Set(CORE_ITEM_CATALOG.map(item => item.key)).size).toBe(CORE_ITEM_CATALOG.length);
  });

  it('contains every AIO job plus the institutional careers', () => {
    for (const job of JOBS) expect(CORE_JOBS.some(entry => entry.id === job.id && entry.source === 'jobs')).toBe(true);
    expect(CORE_JOBS.find(entry => entry.id === 'police')?.source).toBe('police');
    expect(CORE_JOBS.find(entry => entry.id === 'ems')?.source).toBe('ems');
    expect(CORE_JOBS.find(entry => entry.id === 'real_estate')?.source).toBe('real_estate');
  });

  it('keeps RBAC definitions unique and includes self-service test controls', () => {
    expect(new Set(CORE_PERMISSION_KEYS).size).toBe(CORE_PERMISSION_KEYS.length);
    expect(new Set(CORE_ROLE_KEYS).size).toBe(CORE_ROLE_KEYS.length);
    expect(CORE_PERMISSION_KEYS).toEqual(expect.arrayContaining(['admin.roles','admin.money','admin.items','admin.vehicles','admin.jobs']));
  });
});
