import { z } from 'zod';

export const ConsciousnessSchema = z.enum(['conscious', 'unconscious']);
export const CareStateSchema = z.enum(['field', 'transporting', 'admitted']);
export const InjuryKindSchema = z.enum(['cut', 'blunt', 'fracture', 'burn', 'other']);
export const InjuryBodyAreaSchema = z.enum(['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg', 'general']);
export const InjurySeveritySchema = z.number().int().min(1).max(3);
export const BleedingSeveritySchema = z.number().int().min(0).max(3);
export const InjurySchema = z.object({ id:z.uuid(), kind:InjuryKindSchema, bodyArea:InjuryBodyAreaSchema, severity:InjurySeveritySchema, bleeding:BleedingSeveritySchema, treated:z.boolean(), recoveryUntil:z.iso.datetime().nullable(), createdAt:z.iso.datetime() });
export const NeedsStatusSchema = z.object({ consciousness:ConsciousnessSchema, careState:CareStateSchema, pain:z.number().int().min(0).max(100), exhausted:z.boolean(), hungry:z.boolean(), dehydrated:z.boolean(), bleeding:BleedingSeveritySchema, canRest:z.boolean(), canSleep:z.boolean(), primaryResidenceRequired:z.boolean(), admittedUntil:z.iso.datetime().nullable(), injuries:z.array(InjurySchema), lastSimulatedAt:z.iso.datetime() });
export const NeedsStateSchema = z.object({ status:NeedsStatusSchema, hud:z.object({ health:z.number().int().min(0).max(100), energy:z.number().int().min(0).max(100), satiety:z.number().int().min(0).max(100), hydration:z.number().int().min(0).max(100), stress:z.number().int().min(0).max(100) }) });
export const RestRequestSchema = z.object({ kind:z.enum(['rest','sleep']) });
export const NeedsMutationResultSchema = z.object({ needs:NeedsStateSchema, noticeBg:z.string(), noticeEn:z.string() });
export type NeedsState=z.infer<typeof NeedsStateSchema>; export type InjuryKind=z.infer<typeof InjuryKindSchema>; export type InjuryBodyArea=z.infer<typeof InjuryBodyAreaSchema>; export type RestKind=z.infer<typeof RestRequestSchema>['kind'];
