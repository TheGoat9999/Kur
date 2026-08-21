import { z } from 'zod';

export const JobSkillKeySchema = z.enum([
  'manual_work','logistics','driving','navigation','safety','machinery','construction','mechanical','electrical','technical',
  'customer_service','commerce','communication','leadership','agriculture','fishing','seamanship','mining','forestry','cooking','hospitality'
]);
export const JobArchetypeSchema = z.enum(['route','workflow','customer','site']);
export const ResponsibilityTierSchema = z.number().int().min(1).max(4);

export const JobTaskSchema = z.object({
  id: z.string().min(1), titleBg: z.string().min(1), titleEn: z.string().min(1), skill: JobSkillKeySchema
});
export const JobRequirementSchema = z.object({ skill: JobSkillKeySchema, level: z.number().int().min(1).max(7) });
export const JobDefinitionSchema = z.object({
  id: z.string().min(1), icon: z.string().min(1), titleBg: z.string().min(1), titleEn: z.string().min(1),
  employerKey: z.string().min(1), employerBg: z.string().min(1), employerEn: z.string().min(1),
  descriptionBg: z.string().min(1), descriptionEn: z.string().min(1), archetype: JobArchetypeSchema,
  requirements: z.array(JobRequirementSchema), qualification: z.string().nullable(), gainSkills: z.array(JobSkillKeySchema).min(1),
  tasks: z.array(JobTaskSchema).min(2)
});
export const MissingRequirementSchema = z.object({ skill: JobSkillKeySchema.optional(), level: z.number().int().optional(), qualification: z.string().optional() });
export const JobOpportunitySchema = JobDefinitionSchema.extend({
  eligible: z.boolean(), missing: z.array(MissingRequirementSchema), jobXp: z.number().int().nonnegative(), jobLevel: z.number().int().positive(),
  employerReputation: z.number().int().min(0).max(100), responsibilityTier: ResponsibilityTierSchema
});
export const JobSkillProgressSchema = z.object({ skill: JobSkillKeySchema, xp: z.number().int().nonnegative(), level: z.number().int().min(0).max(7), nextLevelXp: z.number().int().nullable() });
export const JobHistoryEntrySchema = z.object({
  id: z.uuid(), jobId: z.string(), titleBg: z.string(), titleEn: z.string(), employerBg: z.string(), employerEn: z.string(),
  payoutCents: z.number().int().nonnegative(), performance: z.enum(['completed','good','excellent','needs_improvement']), completedTasks: z.number().int().nonnegative(), createdAt: z.iso.datetime()
});
export const JobEventChoiceSchema = z.object({ id: z.string(), labelBg: z.string(), labelEn: z.string(), locked: z.boolean(), requires: z.string().nullable() });
export const JobEventSchema = z.object({ id: z.string(), kind: z.enum(['opportunity','problem','skill','responsibility']), titleBg: z.string(), titleEn: z.string(), descriptionBg: z.string(), descriptionEn: z.string(), choices: z.array(JobEventChoiceSchema) });
export const JobDecisionSchema = z.object({ eventId: z.string(), choiceId: z.string(), consequenceBg: z.string(), consequenceEn: z.string(), quality: z.number().int().min(-1).max(1), payDeltaCents: z.number().int() });
export const ActiveJobShiftSchema = z.object({
  id: z.uuid(), jobId: z.string(), completedTaskIds: z.array(z.string()), currentEvent: JobEventSchema.nullable(), decisions: z.array(JobDecisionSchema),
  bonusCents: z.number().int(), goodCount: z.number().int().nonnegative(), badCount: z.number().int().nonnegative(), canFinish: z.boolean(), startedAt: z.iso.datetime()
});
export const JobsProfileSchema = z.object({
  careerXp: z.number().int().nonnegative(), careerLevel: z.number().int().positive(), reliability: z.number().int().min(0).max(100),
  completedShifts: z.number().int().nonnegative(), qualifications: z.array(z.string()), skills: z.array(JobSkillProgressSchema)
});
export const JobsStateSchema = z.object({ profile: JobsProfileSchema, opportunities: z.array(JobOpportunitySchema), activeShift: ActiveJobShiftSchema.nullable(), history: z.array(JobHistoryEntrySchema) });

export const JobStartRequestSchema = z.object({ jobId: z.string().min(1).max(80) });
export const JobTaskRequestSchema = z.object({ shiftId: z.uuid(), taskId: z.string().min(1).max(80) });
export const JobChoiceRequestSchema = z.object({ shiftId: z.uuid(), eventId: z.string().min(1).max(80), choiceId: z.string().min(1).max(80) });
export const JobFinishRequestSchema = z.object({ shiftId: z.uuid() });
export const JobMutationResultSchema = z.object({ jobs: JobsStateSchema, cashCents: z.number().int().nonnegative(), noticeBg: z.string(), noticeEn: z.string() });

export type JobSkillKey = z.infer<typeof JobSkillKeySchema>;
export type JobDefinition = z.infer<typeof JobDefinitionSchema>;
export type JobOpportunity = z.infer<typeof JobOpportunitySchema>;
export type JobEvent = z.infer<typeof JobEventSchema>;
export type JobDecision = z.infer<typeof JobDecisionSchema>;
export type ActiveJobShift = z.infer<typeof ActiveJobShiftSchema>;
export type JobsState = z.infer<typeof JobsStateSchema>;
export type JobMutationResult = z.infer<typeof JobMutationResultSchema>;
