import { Router } from 'express';
import { PropertyAccessRemoveRequestSchema, PropertyAccessRequestSchema, PropertyIdRequestSchema, PropertyLeaseRequestSchema, PropertyOfferRequestSchema, RealEstateClientMatchRequestSchema } from '@sol-dorado/contracts/real-estate';
import type { AppServices } from '../types.js';
import { addPropertyAccess, advanceRealEstateCareer, createLease, endLease, getRealEstateState, makeOffer, matchClient, RealEstateCommandError, recordViewing, removePropertyAccess, setPrimaryResidence, togglePropertyLock } from '../services/real-estate.js';

export function realEstateRoutes(services:AppServices){const router=Router();
 router.get('/v1/real-estate',async(req,res)=>res.json(await getRealEstateState(services.db,req.playerId!)));
 const handle=(fn:(data:any,playerId:string)=>Promise<any>)=>async(req:any,res:any)=>{try{res.json(await fn(req.body,req.playerId!));}catch(error){if(error instanceof RealEstateCommandError)return res.status(error.status).json({error:error.code});throw error;}};
 router.post('/v1/real-estate/viewing',handle(async(body,p)=>{const x=PropertyIdRequestSchema.parse(body);return recordViewing(services.db,p,x.propertyId);}));
 router.post('/v1/real-estate/offer',handle(async(body,p)=>{const x=PropertyOfferRequestSchema.parse(body);return makeOffer(services.db,p,x.propertyId,x.amountCents);}));
 router.post('/v1/real-estate/primary',handle(async(body,p)=>{const x=PropertyIdRequestSchema.parse(body);return setPrimaryResidence(services.db,p,x.propertyId);}));
 router.post('/v1/real-estate/lock',handle(async(body,p)=>{const x=PropertyIdRequestSchema.parse(body);return togglePropertyLock(services.db,p,x.propertyId);}));
 router.post('/v1/real-estate/access',handle(async(body,p)=>{const x=PropertyAccessRequestSchema.parse(body);return addPropertyAccess(services.db,p,x.propertyId,x.name,x.role);}));
 router.post('/v1/real-estate/access/remove',handle(async(body,p)=>{const x=PropertyAccessRemoveRequestSchema.parse(body);return removePropertyAccess(services.db,p,x.propertyId,x.accessId);}));
 router.post('/v1/real-estate/lease',handle(async(body,p)=>{const x=PropertyLeaseRequestSchema.parse(body);return createLease(services.db,p,x.propertyId,x.tenantName,x.monthlyRentCents);}));
 router.post('/v1/real-estate/lease/end',handle(async(body,p)=>{const x=PropertyIdRequestSchema.parse(body);return endLease(services.db,p,x.propertyId);}));
 router.post('/v1/real-estate/career/advance',handle(async(_body,p)=>advanceRealEstateCareer(services.db,p)));
 router.post('/v1/real-estate/client-match',handle(async(body,p)=>{const x=RealEstateClientMatchRequestSchema.parse(body);return matchClient(services.db,p,x.clientId,x.propertyId);}));
 return router;
}
