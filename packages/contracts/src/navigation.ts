import { z } from 'zod';

export const NavigationModeSchema = z.enum(['walk', 'drive', 'transit']);
export const NavigationPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite()
});
export const NavigationNodeSchema = z.object({
  id: z.string().min(1),
  scopeId: z.string().min(1),
  kind: z.string().min(1),
  position: NavigationPointSchema
});
export const NavigationEdgeSchema = z.object({
  id: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  modes: z.array(NavigationModeSchema).min(1),
  distanceMeters: z.number().finite().positive(),
  bidirectional: z.boolean().default(true)
});
export const NavigationGraphSchema = z.object({
  scopeId: z.string().min(1),
  nodes: z.array(NavigationNodeSchema),
  edges: z.array(NavigationEdgeSchema)
});

export type NavigationMode = z.infer<typeof NavigationModeSchema>;
export type NavigationPoint = z.infer<typeof NavigationPointSchema>;
export type NavigationNode = z.infer<typeof NavigationNodeSchema>;
export type NavigationEdge = z.infer<typeof NavigationEdgeSchema>;
export type NavigationGraph = z.infer<typeof NavigationGraphSchema>;

/**
 * Shared mobility abstraction reserved for Mobility v0.1.
 * Street v0.3 authors only pedestrian graph data, but road/lane and transit graphs
 * must use this same node/edge/mode vocabulary rather than inventing separate travel models.
 */
export interface MobilityRouteIntent {
  originScopeId: string;
  destinationScopeId: string;
  mode: NavigationMode;
}
