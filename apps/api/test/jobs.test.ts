import { describe, expect, it } from 'vitest';
import { JobDefinitionSchema, JobMutationResultSchema, JobsStateSchema } from '@sol-dorado/contracts/jobs';
import { eventPool, JOBS, QUALIFICATIONS } from '../src/domain/jobs-catalog.js';
import { levelFromXp } from '../src/services/jobs.js';

describe('jobs progression', () => {
  it('keeps skill progression threshold based', () => {
    expect(levelFromXp(0, [0,35,95,180])).toBe(0);
    expect(levelFromXp(35, [0,35,95,180])).toBe(1);
    expect(levelFromXp(179, [0,35,95,180])).toBe(2);
    expect(levelFromXp(180, [0,35,95,180])).toBe(3);
  });

  it('ships a broad AIO catalog with production-valid definitions', () => {
    expect(JOBS.length).toBeGreaterThanOrEqual(18);
    expect(new Set(JOBS.map(job => job.id)).size).toBe(JOBS.length);
    for (const job of JOBS) {
      expect(() => JobDefinitionSchema.parse(job)).not.toThrow();
      expect(job.tasks.length).toBeGreaterThanOrEqual(3);
      expect(job.gainSkills.length).toBeGreaterThan(0);
      expect(job.basePayCents).toBeGreaterThan(0);
      expect(eventPool(job).length).toBeGreaterThanOrEqual(2);
    }
    expect(JOBS.map(job => job.id)).toEqual(expect.arrayContaining([
      'warehouse','grounds','farmhand','retail','delivery','courier','sanitation','construction','kitchen','barista','hotel_service',
      'dock','mechanic_assistant','electrical_apprentice','delivery_driver','taxi','fishing_deckhand','mining','forestry'
    ]));
  });

  it('separates job proficiency from shared employer progression', () => {
    const quickDropJobs = JOBS.filter(job => job.employerKey === 'quickdrop').map(job => job.id);
    expect(quickDropJobs).toEqual(expect.arrayContaining(['warehouse','delivery','delivery_driver']));
    expect(quickDropJobs.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps qualifications reachable from skills that can be trained before claiming them', () => {
    const qualificationKeys = new Set(QUALIFICATIONS.map(item => item.key));
    expect(qualificationKeys.size).toBe(QUALIFICATIONS.length);
    for (const qualification of QUALIFICATIONS) {
      expect(qualification.careerLevel).toBeGreaterThan(0);
      for (const requirement of qualification.requirements) {
        const trainers = JOBS.filter(job => job.gainSkills.includes(requirement.skill) && job.qualification !== qualification.key);
        expect(trainers.length, `${qualification.key}:${requirement.skill}`).toBeGreaterThan(0);
      }
    }
  });

  it('requires structured server state and canonical cash on mutations', () => {
    expect(JobsStateSchema.safeParse({}).success).toBe(false);
    expect(JobMutationResultSchema.safeParse({ jobs: {}, cashCents: 10, noticeBg: '', noticeEn: '' }).success).toBe(false);
  });
});
