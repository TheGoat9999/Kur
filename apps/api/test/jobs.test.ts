import { describe, expect, it } from 'vitest';
import { JobDefinitionSchema, JobMutationResultSchema, JobsStateSchema } from '@sol-dorado/contracts/jobs';
import { JOBS, levelFromXp } from '../src/services/jobs.js';

describe('jobs progression', () => {
  it('keeps skill progression threshold based', () => {
    expect(levelFromXp(0, [0,35,95,180])).toBe(0);
    expect(levelFromXp(35, [0,35,95,180])).toBe(1);
    expect(levelFromXp(179, [0,35,95,180])).toBe(2);
    expect(levelFromXp(180, [0,35,95,180])).toBe(3);
  });

  it('ships playable AIO jobs with at least two contextual tasks', () => {
    expect(JOBS.length).toBeGreaterThanOrEqual(8);
    for (const job of JOBS) {
      expect(() => JobDefinitionSchema.parse(job)).not.toThrow();
      expect(job.tasks.length).toBeGreaterThanOrEqual(2);
      expect(job.gainSkills.length).toBeGreaterThan(0);
    }
    expect(JOBS.map(job => job.id)).toEqual(expect.arrayContaining(['warehouse','grounds','sanitation','delivery','construction','retail','kitchen','dock']));
  });

  it('requires structured server state and canonical cash on mutations', () => {
    expect(JobsStateSchema.safeParse({}).success).toBe(false);
    expect(JobMutationResultSchema.safeParse({ jobs: {}, cashCents: 10, noticeBg: '', noticeEn: '' }).success).toBe(false);
  });
});
