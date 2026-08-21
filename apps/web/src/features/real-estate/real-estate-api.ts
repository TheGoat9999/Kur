import { DevSessionSchema } from '@sol-dorado/contracts';
import { RealEstateMutationResultSchema, RealEstateStateSchema, type RealEstateMutationResult, type RealEstateState } from '@sol-dorado/contracts/real-estate';
const API_URL=import.meta.env.VITE_API_URL??'http://localhost:3001'; const TOKEN_KEY='sd_session_token_v1';
async function token(){const x=localStorage.getItem(TOKEN_KEY);if(x)return x;const r=await fetch(`${API_URL}/v1/session/dev`,{method:'POST'});if(!r.ok)throw new Error('real_estate_session_failed');const s=DevSessionSchema.parse(await r.json());localStorage.setItem(TOKEN_KEY,s.token);return s.token;}
async function request(path:string,init?:RequestInit,retry=true){const t=await token();const r=await fetch(`${API_URL}${path}`,{...init,headers:{'content-type':'application/json',authorization:`Bearer ${t}`,...init?.headers}});if(r.status===401&&retry){localStorage.removeItem(TOKEN_KEY);return request(path,init,false);}return r;}
async function err(r:Response){const b=await r.json().catch(()=>null) as {error?:string}|null;return b?.error??`real_estate_failed_${r.status}`;}
export async function getRealEstate():Promise<RealEstateState>{const r=await request('/v1/real-estate');if(!r.ok)throw new Error(await err(r));return RealEstateStateSchema.parse(await r.json());}
async function cmd(path:string,body:unknown={}):Promise<RealEstateMutationResult>{const r=await request(path,{method:'POST',body:JSON.stringify(body)});if(!r.ok)throw new Error(await err(r));return RealEstateMutationResultSchema.parse(await r.json());}
export const completeViewing=(propertyId:string)=>cmd('/v1/real-estate/viewing',{propertyId});
export const makePropertyOffer=(propertyId:string,amountCents:number)=>cmd('/v1/real-estate/offer',{propertyId,amountCents});
export const setPrimary=(propertyId:string)=>cmd('/v1/real-estate/primary',{propertyId});
export const toggleLock=(propertyId:string)=>cmd('/v1/real-estate/lock',{propertyId});
export const addAccess=(propertyId:string,name:string,role:string)=>cmd('/v1/real-estate/access',{propertyId,name,role});
export const removeAccess=(propertyId:string,accessId:string)=>cmd('/v1/real-estate/access/remove',{propertyId,accessId});
export const createLease=(propertyId:string,tenantName:string,monthlyRentCents:number)=>cmd('/v1/real-estate/lease',{propertyId,tenantName,monthlyRentCents});
export const endLease=(propertyId:string)=>cmd('/v1/real-estate/lease/end',{propertyId});
export const advanceCareer=()=>cmd('/v1/real-estate/career/advance');
export const matchClient=(clientId:string,propertyId:string)=>cmd('/v1/real-estate/client-match',{clientId,propertyId});
