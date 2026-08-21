import { DevSessionSchema } from '@sol-dorado/contracts';
import { BusinessesStateSchema, type BusinessesState } from '@sol-dorado/contracts/businesses';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';
async function token(){const existing=localStorage.getItem(TOKEN_KEY);if(existing)return existing;const response=await fetch(`${API_URL}/v1/session/dev`,{method:'POST'});if(!response.ok)throw new Error('business_session_failed');const session=DevSessionSchema.parse(await response.json());localStorage.setItem(TOKEN_KEY,session.token);return session.token;}
async function request(path:string,init?:RequestInit,retry=true){const session=await token();const response=await fetch(`${API_URL}${path}`,{...init,headers:{'content-type':'application/json',authorization:`Bearer ${session}`,...init?.headers}});if(response.status===401&&retry){localStorage.removeItem(TOKEN_KEY);return request(path,init,false);}return response;}
async function errorCode(response:Response){const body=await response.json().catch(()=>null) as {error?:string}|null;return body?.error??`business_failed_${response.status}`;}
export async function getBusinesses():Promise<BusinessesState>{const response=await request('/v1/businesses');if(!response.ok)throw new Error(await errorCode(response));return BusinessesStateSchema.parse(await response.json());}
async function command(path:string,body:unknown){const response=await request(path,{method:'POST',body:JSON.stringify(body)});if(!response.ok)throw new Error(await errorCode(response));return BusinessesStateSchema.parse(await response.json());}
export const claimBusiness=(businessId:string)=>command('/v1/businesses/claim',{businessId});
export const setBusinessOpen=(businessId:string,open:boolean)=>command(open?'/v1/businesses/open':'/v1/businesses/close',{businessId});
export const addStaff=(businessId:string,displayName:string,role:'manager'|'employee',jobKey:string|null,wageCents:number)=>command('/v1/businesses/staff',{businessId,displayName,role,jobKey,wageCents});
export const setPrice=(businessId:string,itemKey:string,priceCents:number)=>command('/v1/businesses/price',{businessId,itemKey,priceCents});
export const orderStock=(businessId:string,supplierId:string,itemKey:string,quantity:number)=>command('/v1/businesses/supplier-order',{businessId,supplierId,itemKey,quantity});
export const posSale=(businessId:string,itemKey:string,quantity:number)=>command('/v1/businesses/pos-sale',{businessId,itemKey,quantity});
export const runPayroll=(businessId:string)=>command('/v1/businesses/payroll',{businessId});
export const payTaxes=(businessId:string)=>command('/v1/businesses/taxes/pay',{businessId});
export const renewLicense=(businessId:string,licenseId:string)=>command('/v1/businesses/license/renew',{businessId,licenseId});
export const setHours=(businessId:string,dayOfWeek:number,opensAt:string|null,closesAt:string|null,closed:boolean)=>command('/v1/businesses/hours',{businessId,dayOfWeek,opensAt,closesAt,closed});
