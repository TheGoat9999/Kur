import {Router} from 'express';
import {RestRequestSchema} from '@sol-dorado/contracts/needs';
import type {AppServices} from '../types.js';
import {getNeedsState,NeedsCommandError,restPlayer} from '../services/needs.js';
export function needsRoutes(services:AppServices){const router=Router();router.get('/v1/needs',async(req,res)=>{try{res.json(await getNeedsState(services.db,req.playerId!));}catch(e){if(e instanceof NeedsCommandError)return res.status(e.status).json({error:e.code});throw e;}});router.post('/v1/needs/rest',async(req,res)=>{const parsed=RestRequestSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'invalid_rest_request',issues:parsed.error.issues});try{res.json(await restPlayer(services.db,req.playerId!,parsed.data.kind));}catch(e){if(e instanceof NeedsCommandError)return res.status(e.status).json({error:e.code});throw e;}});return router;}
