import { z } from 'zod';

export const JobSkillKeySchema = z.enum([
  'manual_work','logistics','driving','navigation','safety','machinery','construction','mechanical','electrical','technical',
  'customer_service','commerce','communication','leadership','agriculture','fishing','seamanship','mining','forestry','cooking','hospitality'
]);
export const JobArchetypeSchema = z.enum(['route','workflow','customer','site','service','technical','resource']);
export const JobCategorySchema = z.enum(['entry','logistics','service','trades','resource','hospitality','transport']);
export const JobIntensitySchema = z.enum(['light','moderate','heavy']);
export const ResponsibilityTierSchema = z.number().int().min(1).max(4);

export const JobTaskSchema = z.object({
  id: z.string().min(1),
  titleBg: z.string().min(1),
  titleEn: z.string().min(1),
  skill: JobSkillKeySchema,
  energyCost: z.number().int().min(1).max(10),
  stressDelta: z.number().int().min(-3).max(6)
});
export const JobRequirementSchema = z.object({ skill: JobSkillKeySchema, level: z.number().int().min(1).max(7) });
export const JobDefinitionSchema = z.object({
  id: z.string().min(1), icon: z.string().min(1), titleBg: z.string().min(1), titleEn: z.string().min(1),
  employerKey: z.string().min(1), employerBg: z.string().min(1), employerEn: z.string().min(1),
  locationBg: z.string().min(1), locationEn: z.string().min(1),
  descriptionBg: z.string().min(1), descriptionEn: z.string().min(1), archetype: JobArchetypeSchema, category: JobCategorySchema,
  requirements: z.array(JobRequirementSchema), qualification: z.string().nullable(), gainSkills: z.array(JobSkillKeySchema).min(1),
  basePayCents: z.number().int().positive(), tasks: z.array(JobTaskSchema).min(3)
});
export const MissingRequirementSchema = z.object({
  skill: JobSkillKeySchema.optional(), level: z.number().int().optional(), qualification: z.string().optional(), responsibilityTier: ResponsibilityTierSchema.optional()
});
export const JobShiftOfferSchema = z.object({
  id: z.string().min(1), titleBg: z.string().min(1), titleEn: z.string().min(1), descriptionBg: z.string().min(1), descriptionEn: z.string().min(1),
  basePayCents: z.number().int().positive(), taskBonusCents: z.number().int().nonnegative(), requiredTier: ResponsibilityTierSchema,
  minTasks: z.number().int().min(2), intensity: JobIntensitySchema, featured: z.boolean()
});
export const JobOpportunitySchema = JobDefinitionSchema.extend({
  eligible: z.boolean(), missing: z.array(MissingRequirementSchema), jobXp: z.number().int().nonnegative(), jobLevel: z.number().int().positive(),
  employerReputation: z.number().int().min(0).max(100), employerCompletedShifts: z.number().int().nonnegative(),
  responsibilityTier: ResponsibilityTierSchema, offers: z.array(JobShiftOfferSchema).min(1)
});
export const JobSkillProgressSchema = z.object({
  skill: JobSkillKeySchema, xp: z.number().int().nonnegative(), level: z.number().int().min(0).max(7), nextLevelXp: z.number().int().nullable()
});
export const JobPayoutBreakdownSchema = z.object({
  basePayCents: z.number().int().nonnegative(), taskBonusCents: z.number().int(), eventBonusCents: z.number().int(),
  performanceBonusCents: z.number().int(), trustBonusCents: z.number().int(), totalCents: z.number().int().nonnegative()
});
export const JobHistoryEntrySchema = z.object({
  id: z.uuid(), jobId: z.string(), titleBg: z.string(), titleEn: z.string(), employerBg: z.string(), employerEn: z.string(),
  offerTitleBg: z.string(), offerTitleEn: z.string(), payoutCents: z.number().int().nonnegative(),
  performance: z.enum(['completed','good','excellent','needs_improvement','abandoned']), completedTasks: z.number().int().nonnegative(),
  qualityScore: z.number().int(), payout: JobPayoutBreakdownSchema, createdAt: z.iso.datetime()
});
export const JobEventChoiceSchema = z.object({
  id: z.string(), labelBg: z.string(), labelEn: z.string(), locked: z.boolean(), requires: z.string().nullable()
});
export const JobEventSchema = z.object({
  id: z.string(), kind: z.enum(['opportunity','problem','skill','responsibility']), titleBg: z.string(), titleEn: z.string(),
  descriptionBg: z.string(), descriptionEn: z.string(), choices: z.array(JobEventChoiceSchema)
});
export const JobDecisionSchema = z.object({
  eventId: z.string(), choiceId: z.string(), consequenceBg: z.string(), consequenceEn: z.string(), quality: z.number().int().min(-1).max(1), payDeltaCents: z.number().int()
});
export const ActiveJobShiftSchema = z.object({
  id: z.uuid(), jobId: z.string(), offerId: z.string(), offerTitleBg: z.string(), offerTitleEn: z.string(),
  basePayCents: z.number().int().positive(), taskBonusCents: z.number().int().nonnegative(), minTasks: z.number().int().min(2), intensity: JobIntensitySchema,
  completedTaskIds: z.array(z.string()), currentEvent: JobEventSchema.nullable(), decisions: z.array(JobDecisionSchema),
  bonusCents: z.number().int(), goodCount: z.number().int().nonnegative(), badCount: z.number().int().nonnegative(),
  energySpent: z.number().int().nonnegative(), stressAdded: z.number().int().nonnegative(), canFinish: z.boolean(), startedAt: z.iso.datetime()
});
export const JobQualificationSchema = z.object({
  key: z.string().min(1), titleBg: z.string().min(1), titleEn: z.string().min(1), descriptionBg: z.string().min(1), descriptionEn: z.string().min(1),
  careerLevel: z.number().int().positive(), requirements: z.array(JobRequirementSchema), earned: z.boolean(), eligible: z.boolean(), missing: z.array(MissingRequirementSchema)
});
export const JobEmployerProgressSchema = z.object({
  employerKey: z.string().min(1), employerBg: z.string().min(1), employerEn: z.string().min(1), reputation: z.number().int().min(0).max(100),
  responsibilityTier: ResponsibilityTierSchema, completedShifts: z.number().int().nonnegative(), totalEarningsCents: z.number().int().nonnegative()
});
export const JobMilestoneSchema = z.object({
  id: z.string(), titleBg: z.string(), titleEn: z.string(), descriptionBg: z.string(), descriptionEn: z.string(), unlocked: z.boolean(), current: z.number().int().nonnegative(), target: z.number().int().positive()
});
export const JobsProfileSchema = z.object({
  careerXp: z.number().int().nonnegative(), careerLevel: z.number().int().positive(), reliability: z.number().int().min(0).max(100),
  completedShifts: z.number().int().nonnegative(), currentStreak: z.number().int().nonnegative(), bestStreak: z.number().int().nonnegative(),
  totalEarningsCents: z.number().int().nonnegative(), excellentShifts: z.number().int().nonnegative(), abandonedShifts: z.number().int().nonnegative(),
  qualifications: z.array(z.string()), skills: z.array(JobSkillProgressSchema)
});
export const JobsStateSchema = z.object({
  profile: JobsProfileSchema,
  opportunities: z.array(JobOpportunitySchema),
  activeShift: ActiveJobShiftSchema.nullable(),
  qualifications: z.array(JobQualificationSchema),
  employers: z.array(JobEmployerProgressSchema),
  milestones: z.array(JobMilestoneSchema),
  history: z.array(JobHistoryEntrySchema)
});

export const JobStartRequestSchema = z.object({ jobId: z.string().min(1).max(80), offerId: z.string().min(1).max(80) });
export const JobTaskRequestSchema = z.object({ shiftId: z.uuid(), taskId: z.string().min(1).max(80) });
export const JobChoiceRequestSchema = z.object({ shiftId: z.uuid(), eventId: z.string().min(1).max(80), choiceId: z.string().min(1).max(80) });
export const JobFinishRequestSchema = z.object({ shiftId: z.uuid() });
export const JobAbandonRequestSchema = z.object({ shiftId: z.uuid() });
export const JobQualificationRequestSchema = z.object({ qualificationKey: z.string().min(1).max(80) });
export const JobMutationResultSchema = z.object({ jobs: JobsStateSchema, cashCents: z.number().int().nonnegative(), noticeBg: z.string(), noticeEn: z.string() });

export type JobSkillKey = z.infer<typeof JobSkillKeySchema>;
export type JobDefinition = z.infer<typeof JobDefinitionSchema>;
export type JobOpportunity = z.infer<typeof JobOpportunitySchema>;
export type JobShiftOffer = z.infer<typeof JobShiftOfferSchema>;
export type JobEvent = z.infer<typeof JobEventSchema>;
export type JobDecision = z.infer<typeof JobDecisionSchema>;
export type JobQualification = z.infer<typeof JobQualificationSchema>;
export type JobEmployerProgress = z.infer<typeof JobEmployerProgressSchema>;
export type ActiveJobShift = z.infer<typeof ActiveJobShiftSchema>;
export type JobsState = z.infer<typeof JobsStateSchema>;
export type JobMutationResult = z.infer<typeof JobMutationResultSchema>;
