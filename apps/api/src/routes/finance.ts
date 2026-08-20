import { Router, type Response } from 'express';
import {
  FinanceCashRequestSchema,
  FinanceCryptoTradeRequestSchema,
  FinanceExchangeFundRequestSchema,
  FinanceInternalTransferRequestSchema,
  FinanceLoanRequestSchema,
  FinanceRecipientTransferRequestSchema,
  FinanceSetAccessRequestSchema
} from '@sol-dorado/contracts';
import type { AppServices } from '../types.js';
import {
  advanceFinanceMarket,
  applyForLoan,
  FinanceCommandError,
  fundExchange,
  getFinanceState,
  moveCash,
  moveInternalFunds,
  payNextLoanInstallment,
  sendRecipientTransfer,
  setFinanceAccess,
  tradeCrypto,
  withdrawExchangeCash
} from '../services/finance.js';

export function financeRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/finance', async (request, response) => {
    try { response.json(await getFinanceState(services.db, request.playerId!)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/access', async (request, response) => {
    const body = parse(FinanceSetAccessRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await setFinanceAccess(services.db, request.playerId!, body.accessMode)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/cash', async (request, response) => {
    const body = parse(FinanceCashRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await moveCash(services.db, request.playerId!, body.direction, body.amountCents)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/internal-transfer', async (request, response) => {
    const body = parse(FinanceInternalTransferRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await moveInternalFunds(services.db, request.playerId!, body.direction, body.amountCents)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/recipient-transfer', async (request, response) => {
    const body = parse(FinanceRecipientTransferRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await sendRecipientTransfer(services.db, request.playerId!, body.recipientId, body.amountCents, body.reference)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/loan/apply', async (request, response) => {
    const body = parse(FinanceLoanRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await applyForLoan(services.db, request.playerId!, body.kind)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/loan/pay-next', async (request, response) => {
    try { response.json(await payNextLoanInstallment(services.db, request.playerId!)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/exchange/fund', async (request, response) => {
    const body = parse(FinanceExchangeFundRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await fundExchange(services.db, request.playerId!, body.amountCents)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/exchange/withdraw', async (request, response) => {
    try { response.json(await withdrawExchangeCash(services.db, request.playerId!)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/crypto/trade', async (request, response) => {
    const body = parse(FinanceCryptoTradeRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await tradeCrypto(services.db, request.playerId!, body.side, body.symbol, body.usdCents)); }
    catch (error) { handleFinanceError(error, response); }
  });

  router.post('/v1/finance/market/advance', async (request, response) => {
    try { response.json(await advanceFinanceMarket(services.db, request.playerId!)); }
    catch (error) { handleFinanceError(error, response); }
  });

  return router;
}

function parse<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: unknown[] } } }, value: unknown, response: Response): T | null {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  response.status(400).json({ error: 'invalid_finance_request', issues: parsed.error.issues });
  return null;
}

function handleFinanceError(error: unknown, response: Response) {
  if (error instanceof FinanceCommandError) {
    response.status(error.status).json({ error: error.code });
    return;
  }
  throw error;
}
