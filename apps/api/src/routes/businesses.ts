import { Router } from 'express';
import { BusinessHoursRequestSchema, BusinessIdRequestSchema, BusinessLicenseRequestSchema, BusinessPriceRequestSchema, BusinessSaleRequestSchema, BusinessStaffRequestSchema, BusinessSupplierOrderRequestSchema } from '@sol-dorado/contracts/businesses';
import type { AppServices } from '../types.js';
import { addBusinessStaff, BusinessCommandError, claimBusiness, getBusinessesState, payBusinessTaxes, placeSupplierOrder, recordPosSale, renewBusinessLicense, runPayroll, setBusinessHours, setBusinessPrice, setBusinessStatus } from '../services/businesses.js';

export function businessRoutes(services: AppServices) {
  const router = Router();
  router.get('/v1/businesses', async (req,res) => res.json(await getBusinessesState(services.db, req.playerId!)));
  const handle = (fn: (body: unknown, playerId: string) => Promise<unknown>) => async (req: any,res: any) => {
    try { res.json(await fn(req.body,req.playerId!)); }
    catch (error) { if (error instanceof BusinessCommandError) return res.status(error.status).json({ error:error.code }); throw error; }
  };
  router.post('/v1/businesses/claim',handle(async(body,p)=>{const x=BusinessIdRequestSchema.parse(body);return claimBusiness(services.db,p,x.businessId);}));
  router.post('/v1/businesses/open',handle(async(body,p)=>{const x=BusinessIdRequestSchema.parse(body);return setBusinessStatus(services.db,p,x.businessId,'open');}));
  router.post('/v1/businesses/close',handle(async(body,p)=>{const x=BusinessIdRequestSchema.parse(body);return setBusinessStatus(services.db,p,x.businessId,'closed');}));
  router.post('/v1/businesses/staff',handle(async(body,p)=>{const x=BusinessStaffRequestSchema.parse(body);return addBusinessStaff(services.db,p,x.businessId,x.displayName,x.role,x.jobKey,x.wageCents);}));
  router.post('/v1/businesses/price',handle(async(body,p)=>{const x=BusinessPriceRequestSchema.parse(body);return setBusinessPrice(services.db,p,x.businessId,x.itemKey,x.priceCents);}));
  router.post('/v1/businesses/supplier-order',handle(async(body,p)=>{const x=BusinessSupplierOrderRequestSchema.parse(body);return placeSupplierOrder(services.db,p,x.businessId,x.supplierId,x.itemKey,x.quantity);}));
  router.post('/v1/businesses/pos-sale',handle(async(body,p)=>{const x=BusinessSaleRequestSchema.parse(body);return recordPosSale(services.db,p,x.businessId,x.itemKey,x.quantity);}));
  router.post('/v1/businesses/payroll',handle(async(body,p)=>{const x=BusinessIdRequestSchema.parse(body);return runPayroll(services.db,p,x.businessId);}));
  router.post('/v1/businesses/taxes/pay',handle(async(body,p)=>{const x=BusinessIdRequestSchema.parse(body);return payBusinessTaxes(services.db,p,x.businessId);}));
  router.post('/v1/businesses/license/renew',handle(async(body,p)=>{const x=BusinessLicenseRequestSchema.parse(body);return renewBusinessLicense(services.db,p,x.businessId,x.licenseId);}));
  router.post('/v1/businesses/hours',handle(async(body,p)=>{const x=BusinessHoursRequestSchema.parse(body);return setBusinessHours(services.db,p,x.businessId,x.dayOfWeek,x.opensAt,x.closesAt,x.closed);}));
  return router;
}
