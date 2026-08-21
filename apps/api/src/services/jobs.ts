import type { PoolClient } from 'pg';
import {
  JobMutationResultSchema,
  JobsStateSchema,
  type JobDecision,
  type JobDefinition,
  type JobEvent,
  type JobMutationResult,
  type JobShiftOffer,
  type JobsState
} from '@sol-dorado/contracts/jobs';
import type { Database } from '../db.js';
import { CAREER_XP, eventPool, JOB_SKILLS, JOB_XP, JOBS, QUALIFICATIONS, SKILL_XP, type EventDefinition } from '../domain/jobs-catalog.js';

type Queryable = Database | PoolClient;

export class JobCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

export function levelFromXp(xp: number, table: number[]) {
  let level = 0;
  for (let index = 1; index < table.length; index += 1) if (xp >= table[index]!) level = index;
  return level;
}

function responsibilityTier(jobLevel: number, reputation: number) {
  if (jobLevel >= 7 && reputation >= 75) return 4 as const;
  if (jobLevel >= 5 && reputation >= 45) return 3 as const;
  if (jobLevel >= 3 && reputation >= 20) return 2 as const;
  return 1 as const;
}

function employerTier(reputation: number, completedShifts: number) {
  if (reputation >= 75 && completedShifts >= 12) return 4 as const;
  if (reputation >= 45 && completedShifts >= 6) return 3 as const;
  if (reputation >= 20 && completedShifts >= 2) return 2 as const;
  return 1 as const;
}

function eventPublic(event: EventDefinition, skills: Record<string, number>): JobEvent {
  return {
    id: event.id,
    kind: event.kind,
    titleBg: event.titleBg,
    titleEn: event.titleEn,
    descriptionBg: event.descriptionBg,
    descriptionEn: event.descriptionEn,
    choices: event.choices.map(choice => ({
      id: choice.id,
      labelBg: choice.labelBg,
      labelEn: choice.labelEn,
      locked: Boolean(choice.skill && choice.needLevel && (skills[choice.skill] ?? 0) < choice.needLevel),
      requires: choice.skill && choice.needLevel ? `${choice.skill}:${choice.needLevel}` : null
    }))
  };
}

function buildOffers(job: JobDefinition, tier: number, reputation: number, completedShifts: number): JobShiftOffer[] {
  const full = job.tasks.length;
  const offers: JobShiftOffer[] = [{
    id: 'standard', titleBg: 'Стандартна смяна', titleEn: 'Standard shift',
    descriptionBg: 'Гъвкава смяна с базова отговорност. Можеш да приключиш след основните задачи.',
    descriptionEn: 'Flexible shift with baseline responsibility. You may finish after the core tasks.',
    basePayCents: job.basePayCents, taskBonusCents: 180, requiredTier: 1, minTasks: Math.min(2, full), intensity: 'moderate',
    featured: (job.id.length + completedShifts) % 3 === 0
  }];
  if (tier >= 2) offers.push({
    id: 'rush', titleBg: 'Натоварена смяна', titleEn: 'Rush shift',
    descriptionBg: 'По-високо темпо, всички задачи са задължителни и наградата е по-добра.',
    descriptionEn: 'Higher pace, every task is required and compensation is better.',
    basePayCents: Math.round(job.basePayCents * 1.22), taskBonusCents: 240, requiredTier: 2, minTasks: full, intensity: 'heavy', featured: reputation < 45
  });
  if (tier >= 3) offers.push({
    id: 'precision', titleBg: 'Смяна с повишено доверие', titleEn: 'High-trust shift',
    descriptionBg: 'Работодателят очаква пълно изпълнение и по-добри решения при проблем.',
    descriptionEn: 'The employer expects full completion and stronger judgment under pressure.',
    basePayCents: Math.round(job.basePayCents * 1.42), taskBonusCents: 300, requiredTier: 3, minTasks: full, intensity: 'moderate', featured: reputation >= 45 && reputation < 75
  });
  if (tier >= 4) offers.push({
    id: 'responsible', titleBg: 'Отговорна смяна', titleEn: 'Responsible shift',
    descriptionBg: 'Най-високото ниво на доверие. По-висока компенсация и очакване за безупречно изпълнение.',
    descriptionEn: 'Highest trust level with stronger compensation and an expectation of excellent execution.',
    basePayCents: Math.round(job.basePayCents * 1.68), taskBonusCents: 360, requiredTier: 4, minTasks: full, intensity: 'heavy', featured: reputation >= 75
  });
  return offers;
}

async function ensureProfile(db: Queryable, playerId: string) {
  await db.query('INSERT INTO job_profiles(player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING', [playerId]);
}

export async function getJobsState(db: Queryable, playerId: string): Promise<JobsState> {
  await ensureProfile(db, playerId);
  const [profileResult, skillsResult, progressResult, employerResult, shiftResult, historyResult] = await Promise.all([
    db.query('SELECT * FROM job_profiles WHERE player_id=$1', [playerId]),
    db.query('SELECT skill_key,xp FROM job_skill_progress WHERE player_id=$1', [playerId]),
    db.query('SELECT job_id,xp,employer_reputation,completed_shifts FROM job_progress WHERE player_id=$1', [playerId]),
    db.query('SELECT employer_key,reputation,completed_shifts,total_earnings_cents FROM job_employer_progress WHERE player_id=$1', [playerId]),
    db.query("SELECT * FROM job_shifts WHERE player_id=$1 AND status='active' LIMIT 1", [playerId]),
    db.query('SELECT * FROM job_history WHERE player_id=$1 ORDER BY created_at DESC LIMIT 40', [playerId])
  ]);
  const profile = profileResult.rows[0];
  const careerLevel = levelFromXp(Number(profile.career_xp), CAREER_XP) + 1;
  const completedShifts = Number(profile.completed_shifts ?? 0);
  const skillXp = Object.fromEntries(skillsResult.rows.map(row => [String(row.skill_key), Number(row.xp)]));
  const skillLevels = Object.fromEntries(JOB_SKILLS.map(skill => [skill, levelFromXp(skillXp[skill] ?? 0, SKILL_XP)]));
  const progress = Object.fromEntries(progressResult.rows.map(row => [String(row.job_id), row]));
  const employerProgress = Object.fromEntries(employerResult.rows.map(row => [String(row.employer_key), row]));
  const qualifications = (profile.qualifications ?? []) as string[];

  const qualificationState = QUALIFICATIONS.map(qualification => {
    const missing = [
      ...(careerLevel < qualification.careerLevel ? [{ qualification: `career_level:${qualification.careerLevel}` }] : []),
      ...qualification.requirements.filter(req => (skillLevels[req.skill] ?? 0) < req.level).map(req => ({ skill: req.skill, level: req.level }))
    ];
    const earned = qualifications.includes(qualification.key);
    return { ...qualification, earned, eligible: !earned && missing.length === 0, missing };
  });

  const decorate = (job: JobDefinition) => {
    const p = progress[job.id];
    const xp = Number(p?.xp ?? 0);
    const jobLevel = levelFromXp(xp, JOB_XP) + 1;
    const employer = employerProgress[job.employerKey];
    const reputation = Number(employer?.reputation ?? p?.employer_reputation ?? 0);
    const employerCompletedShifts = Number(employer?.completed_shifts ?? 0);
    const tier = responsibilityTier(jobLevel, reputation);
    const missing = [
      ...job.requirements.filter(req => (skillLevels[req.skill] ?? 0) < req.level).map(req => ({ skill: req.skill, level: req.level })),
      ...(job.qualification && !qualifications.includes(job.qualification) ? [{ qualification: job.qualification }] : [])
    ];
    return {
      ...job,
      eligible: missing.length === 0,
      missing,
      jobXp: xp,
      jobLevel,
      employerReputation: reputation,
      employerCompletedShifts,
      responsibilityTier: tier,
      offers: buildOffers(job, tier, reputation, completedShifts)
    };
  };

  const all = JOBS.map(decorate);
  const opportunities = completedShifts < 2
    ? all.filter(job => job.category === 'entry')
    : [
        ...all.filter(job => job.eligible),
        ...all.filter(job => !job.eligible)
          .sort((a, b) => a.missing.length - b.missing.length || b.jobLevel - a.jobLevel)
          .slice(0, 6)
      ];

  const shift = shiftResult.rows[0];
  const activeShift = shift ? {
    id: shift.id,
    jobId: String(shift.job_id),
    offerId: String(shift.offer_id ?? 'standard'),
    offerTitleBg: String(shift.offer_title_bg ?? 'Стандартна смяна'),
    offerTitleEn: String(shift.offer_title_en ?? 'Standard shift'),
    basePayCents: Number(shift.base_pay_cents ?? 1800),
    taskBonusCents: Number(shift.task_bonus_cents ?? 180),
    minTasks: Number(shift.min_tasks ?? 2),
    intensity: String(shift.intensity ?? 'moderate'),
    completedTaskIds: (shift.completed_task_ids ?? []) as string[],
    currentEvent: shift.current_event as JobEvent | null,
    decisions: (shift.decisions ?? []) as JobDecision[],
    bonusCents: Number(shift.bonus_cents),
    goodCount: Number(shift.good_count),
    badCount: Number(shift.bad_count),
    energySpent: Number(shift.energy_spent ?? 0),
    stressAdded: Number(shift.stress_added ?? 0),
    canFinish: (shift.completed_task_ids ?? []).length >= Number(shift.min_tasks ?? 2) && !shift.current_event,
    startedAt: new Date(shift.started_at).toISOString()
  } : null;

  const employerNames = new Map<string, { bg: string; en: string }>();
  for (const job of JOBS) if (!employerNames.has(job.employerKey)) employerNames.set(job.employerKey, { bg: job.employerBg, en: job.employerEn });
  const employers = [...employerNames.entries()].map(([employerKey, names]) => {
    const row = employerProgress[employerKey];
    const reputation = Number(row?.reputation ?? 0);
    const shifts = Number(row?.completed_shifts ?? 0);
    return {
      employerKey,
      employerBg: names.bg,
      employerEn: names.en,
      reputation,
      responsibilityTier: employerTier(reputation, shifts),
      completedShifts: shifts,
      totalEarningsCents: Number(row?.total_earnings_cents ?? 0)
    };
  }).filter(item => item.completedShifts > 0 || item.reputation > 0).sort((a, b) => b.reputation - a.reputation);

  const milestones = [
    { id:'first_shift',titleBg:'Първа смяна',titleEn:'First shift',descriptionBg:'Завърши първата си платена смяна.',descriptionEn:'Complete your first paid shift.',unlocked:completedShifts >= 1,current:Math.min(completedShifts,1),target:1 },
    { id:'career_5',titleBg:'Утвърден работник',titleEn:'Established worker',descriptionBg:'Достигни Career ниво 5.',descriptionEn:'Reach Career level 5.',unlocked:careerLevel >= 5,current:Math.min(careerLevel,5),target:5 },
    { id:'reliable',titleBg:'Надежден професионалист',titleEn:'Reliable professional',descriptionBg:'Достигни 75 надеждност.',descriptionEn:'Reach 75 reliability.',unlocked:Number(profile.reliability) >= 75,current:Math.min(Number(profile.reliability),75),target:75 },
    { id:'excellent_5',titleBg:'Серия от силни смени',titleEn:'Strong performance record',descriptionBg:'Натрупай 5 отлични смени.',descriptionEn:'Accumulate 5 excellent shifts.',unlocked:Number(profile.excellent_shifts ?? 0) >= 5,current:Math.min(Number(profile.excellent_shifts ?? 0),5),target:5 },
    { id:'earn_500',titleBg:'Професионален доход',titleEn:'Professional earnings',descriptionBg:'Спечели общо $500 от работа.',descriptionEn:'Earn $500 total from jobs.',unlocked:Number(profile.total_earnings_cents ?? 0) >= 50000,current:Math.min(Math.floor(Number(profile.total_earnings_cents ?? 0) / 100),500),target:500 }
  ];

  return JobsStateSchema.parse({
    profile: {
      careerXp: Number(profile.career_xp),
      careerLevel,
      reliability: Number(profile.reliability),
      completedShifts,
      currentStreak: Number(profile.current_streak ?? 0),
      bestStreak: Number(profile.best_streak ?? 0),
      totalEarningsCents: Number(profile.total_earnings_cents ?? 0),
      excellentShifts: Number(profile.excellent_shifts ?? 0),
      abandonedShifts: Number(profile.abandoned_shifts ?? 0),
      qualifications,
      skills: JOB_SKILLS.map(skill => {
        const xp = skillXp[skill] ?? 0;
        const level = levelFromXp(xp, SKILL_XP);
        return { skill, xp, level, nextLevelXp: level >= SKILL_XP.length - 1 ? null : SKILL_XP[level + 1]! };
      })
    },
    opportunities,
    activeShift,
    qualifications: qualificationState,
    employers,
    milestones,
    history: historyResult.rows.map(row => {
      const job = JOBS.find(item => item.id === row.job_id);
      const basePayCents = Number(row.base_pay_cents ?? 0);
      const taskBonusCents = Number(row.task_bonus_cents ?? 0);
      const eventBonusCents = Number(row.event_bonus_cents ?? 0);
      const performanceBonusCents = Number(row.performance_bonus_cents ?? 0);
      const trustBonusCents = Number(row.trust_bonus_cents ?? 0);
      return {
        id: row.id,
        jobId: String(row.job_id),
        titleBg: job?.titleBg ?? String(row.job_id),
        titleEn: job?.titleEn ?? String(row.job_id),
        employerBg: job?.employerBg ?? '',
        employerEn: job?.employerEn ?? '',
        offerTitleBg: String(row.offer_title_bg ?? 'Стандартна смяна'),
        offerTitleEn: String(row.offer_title_en ?? 'Standard shift'),
        payoutCents: Number(row.payout_cents),
        performance: String(row.performance),
        completedTasks: Number(row.completed_tasks),
        qualityScore: Number(row.quality_score ?? 0),
        payout: { basePayCents, taskBonusCents, eventBonusCents, performanceBonusCents, trustBonusCents, totalCents: Number(row.payout_cents) },
        createdAt: new Date(row.created_at).toISOString()
      };
    })
  });
}

async function cashCents(db: Queryable, playerId: string) {
  const response = await db.query('SELECT cash_cents FROM player_state WHERE player_id=$1', [playerId]);
  return Number(response.rows[0]?.cash_cents ?? 0);
}

async function mutationResult(db: Queryable, playerId: string, noticeBg: string, noticeEn: string): Promise<JobMutationResult> {
  return JobMutationResultSchema.parse({ jobs: await getJobsState(db, playerId), cashCents: await cashCents(db, playerId), noticeBg, noticeEn });
}

export async function startJobShift(db: Database, playerId: string, jobId: string, offerId: string): Promise<JobMutationResult> {
  const state = await getJobsState(db, playerId);
  const job = state.opportunities.find(item => item.id === jobId);
  if (!job) throw new JobCommandError('job_not_available', 404);
  if (!job.eligible) throw new JobCommandError('job_requirements_not_met', 409);
  if (state.activeShift) throw new JobCommandError('job_shift_already_active', 409);
  const offer = job.offers.find(item => item.id === offerId);
  if (!offer) throw new JobCommandError('job_offer_not_available', 404);
  if (job.responsibilityTier < offer.requiredTier) throw new JobCommandError('job_offer_trust_too_low', 409);
  const player = await db.query('SELECT energy FROM player_state WHERE player_id=$1', [playerId]);
  if (!player.rows[0]) throw new JobCommandError('player_not_found', 404);
  if (Number(player.rows[0].energy) < 10) throw new JobCommandError('job_too_exhausted', 409);
  await db.query({
    text: `INSERT INTO job_shifts(player_id,job_id,offer_id,offer_title_bg,offer_title_en,base_pay_cents,task_bonus_cents,min_tasks,intensity)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    values: [playerId, jobId, offer.id, offer.titleBg, offer.titleEn, offer.basePayCents, offer.taskBonusCents, offer.minTasks, offer.intensity]
  });
  return mutationResult(db, playerId, 'Смяната започна. Избери първата конкретна задача.', 'Shift started. Choose your first concrete task.');
}

export async function completeJobTask(db: Database, playerId: string, shiftId: string, taskId: string): Promise<JobMutationResult> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const shiftResult = await client.query("SELECT * FROM job_shifts WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE", [shiftId, playerId]);
    const shift = shiftResult.rows[0];
    if (!shift) throw new JobCommandError('job_shift_not_found', 404);
    if (shift.current_event) throw new JobCommandError('job_event_requires_choice', 409);
    const job = JOBS.find(item => item.id === shift.job_id);
    if (!job) throw new JobCommandError('job_definition_missing', 500);
    const work = job.tasks.find(item => item.id === taskId);
    if (!work) throw new JobCommandError('job_task_not_found', 404);
    const done = (shift.completed_task_ids ?? []) as string[];
    if (done.includes(taskId)) throw new JobCommandError('job_task_already_done', 409);

    const playerResult = await client.query('SELECT energy,stress FROM player_state WHERE player_id=$1 FOR UPDATE', [playerId]);
    const player = playerResult.rows[0];
    if (!player) throw new JobCommandError('player_not_found', 404);
    const intensityExtra = shift.intensity === 'heavy' ? 2 : shift.intensity === 'light' ? -1 : 0;
    const energyCost = Math.max(1, work.energyCost + intensityExtra);
    const stressDelta = Math.max(-3, work.stressDelta + (shift.intensity === 'heavy' ? 1 : 0));
    if (Number(player.energy) < energyCost) throw new JobCommandError('job_too_exhausted', 409);

    await client.query(`UPDATE player_state
      SET energy=GREATEST(0,energy-$2),stress=GREATEST(0,LEAST(100,stress+$3)),version=version+1,updated_at=now()
      WHERE player_id=$1`, [playerId, energyCost, stressDelta]);
    await client.query(`INSERT INTO job_skill_progress(player_id,skill_key,xp) VALUES ($1,$2,7)
      ON CONFLICT(player_id,skill_key) DO UPDATE SET xp=job_skill_progress.xp+7,updated_at=now()`, [playerId, work.skill]);

    const nextDone = [...done, taskId];
    const seen = (shift.seen_event_ids ?? []) as string[];
    const skillRows = await client.query('SELECT skill_key,xp FROM job_skill_progress WHERE player_id=$1', [playerId]);
    const levels = Object.fromEntries(skillRows.rows.map(row => [String(row.skill_key), levelFromXp(Number(row.xp), SKILL_XP)]));
    const candidate = eventPool(job).find(event => !seen.includes(event.id));
    const currentEvent = candidate ? eventPublic(candidate, levels) : null;
    await client.query(`UPDATE job_shifts
      SET completed_task_ids=$3,seen_event_ids=$4,current_event=$5,energy_spent=energy_spent+$6,stress_added=stress_added+$7
      WHERE id=$1 AND player_id=$2`, [shiftId, playerId, nextDone, candidate ? [...seen, candidate.id] : seen, currentEvent, energyCost, Math.max(0, stressDelta)]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  return mutationResult(db, playerId, 'Задачата е изпълнена. Състоянието и уменията са актуализирани.', 'Task completed. Your condition and skills were updated.');
}

export async function chooseJobEvent(db: Database, playerId: string, shiftId: string, eventId: string, choiceId: string): Promise<JobMutationResult> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const shiftResult = await client.query("SELECT * FROM job_shifts WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE", [shiftId, playerId]);
    const shift = shiftResult.rows[0];
    if (!shift) throw new JobCommandError('job_shift_not_found', 404);
    const current = shift.current_event as JobEvent | null;
    if (!current || current.id !== eventId) throw new JobCommandError('job_event_not_active', 409);
    const job = JOBS.find(item => item.id === shift.job_id);
    if (!job) throw new JobCommandError('job_definition_missing', 500);
    const definition = eventPool(job).find(event => event.id === eventId);
    const choice = definition?.choices.find(item => item.id === choiceId);
    if (!choice) throw new JobCommandError('job_choice_not_found', 404);
    if (choice.skill && choice.needLevel) {
      const skill = await client.query('SELECT xp FROM job_skill_progress WHERE player_id=$1 AND skill_key=$2', [playerId, choice.skill]);
      if (levelFromXp(Number(skill.rows[0]?.xp ?? 0), SKILL_XP) < choice.needLevel) throw new JobCommandError('job_choice_locked', 409);
    }
    const decision: JobDecision = { eventId, choiceId, consequenceBg: choice.consequenceBg, consequenceEn: choice.consequenceEn, quality: choice.quality, payDeltaCents: choice.payDeltaCents };
    const decisions = [...((shift.decisions ?? []) as JobDecision[]), decision];
    if (choice.skill) await client.query(`INSERT INTO job_skill_progress(player_id,skill_key,xp) VALUES ($1,$2,9)
      ON CONFLICT(player_id,skill_key) DO UPDATE SET xp=job_skill_progress.xp+9,updated_at=now()`, [playerId, choice.skill]);
    await client.query(`UPDATE job_shifts
      SET decisions=$3,current_event=NULL,bonus_cents=bonus_cents+$4,good_count=good_count+$5,bad_count=bad_count+$6
      WHERE id=$1 AND player_id=$2`, [shiftId, playerId, JSON.stringify(decisions), choice.payDeltaCents, choice.quality > 0 ? 1 : 0, choice.quality < 0 ? 1 : 0]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  return mutationResult(db, playerId, 'Решението промени качеството и потенциалното заплащане на смяната.', 'Your decision changed shift quality and potential compensation.');
}

export async function finishJobShift(db: Database, playerId: string, shiftId: string): Promise<JobMutationResult> {
  const client = await db.connect();
  let noticeBg = 'Смяната приключи.';
  let noticeEn = 'Shift completed.';
  try {
    await client.query('BEGIN');
    const shiftResult = await client.query("SELECT * FROM job_shifts WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE", [shiftId, playerId]);
    const shift = shiftResult.rows[0];
    if (!shift) throw new JobCommandError('job_shift_not_found', 404);
    if (shift.current_event) throw new JobCommandError('job_event_requires_choice', 409);
    const completed = ((shift.completed_task_ids ?? []) as string[]).length;
    if (completed < Number(shift.min_tasks ?? 2)) throw new JobCommandError('job_shift_not_ready', 409);
    const job = JOBS.find(item => item.id === shift.job_id);
    if (!job) throw new JobCommandError('job_definition_missing', 500);

    const employerResult = await client.query('SELECT reputation,completed_shifts FROM job_employer_progress WHERE player_id=$1 AND employer_key=$2 FOR UPDATE', [playerId, job.employerKey]);
    const reputation = Number(employerResult.rows[0]?.reputation ?? 0);
    const good = Number(shift.good_count), bad = Number(shift.bad_count), qualityScore = good - bad;
    const allTasks = completed >= job.tasks.length;
    const performance = allTasks && good >= 2 && bad === 0 ? 'excellent' : qualityScore > 0 ? 'good' : bad > good ? 'needs_improvement' : 'completed';
    const earnedBase = Math.round(Number(shift.base_pay_cents) * Math.min(1, completed / job.tasks.length));
    const taskBonus = completed * Number(shift.task_bonus_cents);
    const eventBonus = Number(shift.bonus_cents);
    const performanceBonus = performance === 'excellent' ? 700 : performance === 'good' ? 300 : performance === 'needs_improvement' ? -250 : 0;
    const trustBonus = Math.floor(reputation / 20) * 100;
    const payout = Math.max(500, earnedBase + taskBonus + eventBonus + performanceBonus + trustBonus);
    const jobXp = 10 + completed * 5 + good * 4 + (allTasks ? 5 : 0);
    const careerXp = 4 + completed * 2 + (performance === 'excellent' ? 4 : performance === 'good' ? 2 : 0);
    const repDelta = Math.max(-4, Math.min(5, (allTasks ? 1 : 0) + good - bad + (performance === 'excellent' ? 1 : 0)));
    const reliabilityDelta = performance === 'excellent' ? 3 : performance === 'good' ? 1 : performance === 'needs_improvement' ? -2 : 0;
    const strongShift = performance === 'excellent' || performance === 'good';

    await client.query('UPDATE player_state SET cash_cents=cash_cents+$2,version=version+1,updated_at=now() WHERE player_id=$1', [playerId, payout]);
    await client.query(`UPDATE job_profiles SET
      career_xp=career_xp+$2,completed_shifts=completed_shifts+1,reliability=GREATEST(0,LEAST(100,reliability+$3)),
      current_streak=CASE WHEN $4 THEN current_streak+1 ELSE 0 END,
      best_streak=GREATEST(best_streak,CASE WHEN $4 THEN current_streak+1 ELSE 0 END),
      total_earnings_cents=total_earnings_cents+$5,
      excellent_shifts=excellent_shifts+CASE WHEN $6 THEN 1 ELSE 0 END,updated_at=now()
      WHERE player_id=$1`, [playerId, careerXp, reliabilityDelta, strongShift, payout, performance === 'excellent']);
    await client.query(`INSERT INTO job_progress(player_id,job_id,xp,employer_reputation,completed_shifts) VALUES($1,$2,$3,GREATEST(0,$4),1)
      ON CONFLICT(player_id,job_id) DO UPDATE SET xp=job_progress.xp+$3,employer_reputation=GREATEST(0,LEAST(100,job_progress.employer_reputation+$4)),completed_shifts=job_progress.completed_shifts+1,updated_at=now()`, [playerId, job.id, jobXp, repDelta]);
    await client.query(`INSERT INTO job_employer_progress(player_id,employer_key,reputation,completed_shifts,total_earnings_cents) VALUES($1,$2,GREATEST(0,$3),1,$4)
      ON CONFLICT(player_id,employer_key) DO UPDATE SET reputation=GREATEST(0,LEAST(100,job_employer_progress.reputation+$3)),completed_shifts=job_employer_progress.completed_shifts+1,total_earnings_cents=job_employer_progress.total_earnings_cents+$4,updated_at=now()`, [playerId, job.employerKey, repDelta, payout]);
    for (const skill of job.gainSkills) await client.query(`INSERT INTO job_skill_progress(player_id,skill_key,xp) VALUES($1,$2,6)
      ON CONFLICT(player_id,skill_key) DO UPDATE SET xp=job_skill_progress.xp+6,updated_at=now()`, [playerId, skill]);
    await client.query(`INSERT INTO job_history(
      player_id,job_id,payout_cents,performance,completed_tasks,decisions,job_xp_earned,career_xp_earned,employer_rep_delta,
      offer_id,offer_title_bg,offer_title_en,base_pay_cents,task_bonus_cents,event_bonus_cents,performance_bonus_cents,trust_bonus_cents,quality_score)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`, [
        playerId, job.id, payout, performance, completed, JSON.stringify(shift.decisions ?? []), jobXp, careerXp, repDelta,
        shift.offer_id ?? 'standard', shift.offer_title_bg ?? 'Стандартна смяна', shift.offer_title_en ?? 'Standard shift', earnedBase, taskBonus, eventBonus, performanceBonus, trustBonus, qualityScore
      ]);
    await client.query("UPDATE job_shifts SET status='completed',completed_at=now() WHERE id=$1", [shiftId]);
    await client.query('COMMIT');
    noticeBg = `Смяната приключи. Получи $${(payout / 100).toFixed(2)} и натрупа професионален прогрес.`;
    noticeEn = `Shift completed. You earned $${(payout / 100).toFixed(2)} and gained professional progress.`;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  return mutationResult(db, playerId, noticeBg, noticeEn);
}

export async function abandonJobShift(db: Database, playerId: string, shiftId: string): Promise<JobMutationResult> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const shiftResult = await client.query("SELECT * FROM job_shifts WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE", [shiftId, playerId]);
    const shift = shiftResult.rows[0];
    if (!shift) throw new JobCommandError('job_shift_not_found', 404);
    const job = JOBS.find(item => item.id === shift.job_id);
    if (!job) throw new JobCommandError('job_definition_missing', 500);
    const completed = ((shift.completed_task_ids ?? []) as string[]).length;
    await client.query(`UPDATE job_profiles SET reliability=GREATEST(0,reliability-4),current_streak=0,abandoned_shifts=abandoned_shifts+1,updated_at=now() WHERE player_id=$1`, [playerId]);
    await client.query(`INSERT INTO job_employer_progress(player_id,employer_key,reputation) VALUES($1,$2,0)
      ON CONFLICT(player_id,employer_key) DO UPDATE SET reputation=GREATEST(0,job_employer_progress.reputation-2),updated_at=now()`, [playerId, job.employerKey]);
    await client.query(`INSERT INTO job_history(
      player_id,job_id,payout_cents,performance,completed_tasks,decisions,job_xp_earned,career_xp_earned,employer_rep_delta,
      offer_id,offer_title_bg,offer_title_en,base_pay_cents,task_bonus_cents,event_bonus_cents,performance_bonus_cents,trust_bonus_cents,quality_score)
      VALUES($1,$2,0,'abandoned',$3,$4,0,0,-2,$5,$6,$7,0,0,0,0,0,$8)`, [
        playerId, job.id, completed, JSON.stringify(shift.decisions ?? []), shift.offer_id ?? 'standard', shift.offer_title_bg ?? 'Стандартна смяна', shift.offer_title_en ?? 'Standard shift', Number(shift.good_count) - Number(shift.bad_count)
      ]);
    await client.query("UPDATE job_shifts SET status='abandoned',completed_at=now(),current_event=NULL WHERE id=$1", [shiftId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  return mutationResult(db, playerId, 'Смяната е прекратена. Надеждността и доверието на работодателя са засегнати.', 'Shift abandoned. Reliability and employer trust were affected.');
}

export async function claimJobQualification(db: Database, playerId: string, qualificationKey: string): Promise<JobMutationResult> {
  const state = await getJobsState(db, playerId);
  const qualification = state.qualifications.find(item => item.key === qualificationKey);
  if (!qualification) throw new JobCommandError('job_qualification_not_found', 404);
  if (qualification.earned) throw new JobCommandError('job_qualification_already_earned', 409);
  if (!qualification.eligible) throw new JobCommandError('job_qualification_requirements_not_met', 409);
  await db.query(`UPDATE job_profiles SET qualifications=array_append(qualifications,$2),career_xp=career_xp+8,updated_at=now()
    WHERE player_id=$1 AND NOT ($2=ANY(qualifications))`, [playerId, qualificationKey]);
  return mutationResult(db, playerId, `Получена квалификация: ${qualification.titleBg}.`, `Qualification earned: ${qualification.titleEn}.`);
}
