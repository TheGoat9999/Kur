import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(resolve(here, '../migrations/025_world_atlas_overhaul.sql'), 'utf8');

describe('world atlas overhaul migration', () => {
  it('adds ten deterministic atlas streets to every district', () => {
    expect(migration).toContain('FROM world_districts d');
    expect(migration).toContain('generate_series(1, 10)');
    expect(migration).toContain("'atlas_' || district_id || '_' || n");
  });

  it('keeps visual-only street segments non-playable until authored street scenes exist', () => {
    expect(migration).toMatch(/geometry,playable,sort_order\)\s*SELECT[\s\S]*false,/);
    expect(migration).toContain('playable=false');
  });

  it('fails migration if any district still has fewer than ten streets', () => {
    expect(migration).toContain('HAVING COUNT(s.id) < 10');
    expect(migration).toContain('world_atlas_overhaul_requires_ten_streets_per_district');
  });

  it('contains curved, looped and diagonal multi-point street geometry instead of parallel straight rows', () => {
    const pathPointCount = (migration.match(/jsonb_build_object\('x'/g) ?? []).length;
    expect(pathPointCount).toBeGreaterThan(40);
    expect(migration).toContain("jsonb_build_object('x',18,'y',39)");
    expect(migration).toContain("jsonb_build_object('x',86,'y',10)");
  });
});
