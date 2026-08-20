import type { Pool, PoolClient } from 'pg';
import {
  FinanceMutationResultSchema,
  FinanceStateSchema,
  type FinanceAccessMode,
  type FinanceAssetSymbol,
  type FinanceMutationResult,
  type FinanceState
} from '@sol-dorado/contracts';
import { getBootstrapState } from './player-state.js';

type Notice = { title: string; message: string };
type LockedFinance = {
  accessMode: FinanceAccessMode;
  checkingCents: number;
  savingsCents: number;
  exchangeCashCents: number;
  creditScore: number;
  cashCents: number;
};

const ACCESS_NAMES: Record<FinanceAccessMode, string> = {
  branch: 'Bank Branch',
  atm: 'ATM',
  phone: 'Phone App'
};
const TRANSFER_LIMITS: Record<FinanceAccessMode, number> = {
  branch: 1_000_000,
  atm: 100_000,
  phone: 500_000
};
const RECIPIENTS = {
  maya: 'Maya Torres · ••1142',
  leo: 'Leo Carter · ••7771',
  landlord: 'Vespucci Property Group · ••2298'
} as const;

export class FinanceCommandError extends Error {
  constructor(public readonly code: string, public readonly status = 409) {
    super(code);
  }
}

export async function getFinanceState(db: Pool | PoolClient, playerId: string): Promise<FinanceState> {
  const [accountResult, loanResult, assetResult, ledgerResult] = await Promise.all([
    db.query({
      text: `
        SELECT fa.version, fa.access_mode, fa.checking_cents, fa.savings_cents,
          fa.exchange_cash_cents, fa.credit_score, ps.cash_cents
        FROM finance_accounts fa
        JOIN player_state ps ON ps.player_id = fa.player_id
        WHERE fa.player_id = $1
      `,
      values: [playerId]
    }),
    db.query({
      text: `
        SELECT id, kind, name, principal_cents, remaining_cents, payment_cents,
          payments_remaining, apr_basis_points
        FROM finance_loans
        WHERE player_id = $1 AND remaining_cents > 0
        ORDER BY created_at
      `,
      values: [playerId]
    }),
    db.query({
      text: `
        SELECT a.symbol, a.name, a.price_cents, a.previous_price_cents,
          COALESCE(h.quantity, 0) AS quantity
        FROM finance_assets a
        LEFT JOIN finance_holdings h ON h.symbol = a.symbol AND h.player_id = $1
        ORDER BY CASE a.symbol WHEN 'DRC' THEN 1 WHEN 'VTA' THEN 2 ELSE 3 END
      `,
      values: [playerId]
    }),
    db.query({
      text: `
        SELECT id, entry_type, title, amount_cents, direction, detail, created_at
        FROM finance_ledger
        WHERE player_id = $1
        ORDER BY created_at DESC
        LIMIT 80
      `,
      values: [playerId]
    })
  ]);
  const account = accountResult.rows[0];
  if (!account) throw new FinanceCommandError('finance_account_not_found', 404);
  const accessMode = account.access_mode as FinanceAccessMode;

  return FinanceStateSchema.parse({
    version: Number(account.version),
    accessMode,
    balances: {
      cashCents: Number(account.cash_cents),
      checkingCents: Number(account.checking_cents),
      savingsCents: Number(account.savings_cents),
      exchangeCashCents: Number(account.exchange_cash_cents)
    },
    creditScore: Number(account.credit_score),
    transferLimitCents: TRANSFER_LIMITS[accessMode],
    loans: loanResult.rows.map(row => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      principalCents: Number(row.principal_cents),
      remainingCents: Number(row.remaining_cents),
      paymentCents: Number(row.payment_cents),
      paymentsRemaining: Number(row.payments_remaining),
      aprBasisPoints: Number(row.apr_basis_points)
    })),
    assets: assetResult.rows.map(row => ({
      symbol: row.symbol,
      name: row.name,
      priceCents: Number(row.price_cents),
      previousPriceCents: Number(row.previous_price_cents),
      holding: Number(row.quantity)
    })),
    ledger: ledgerResult.rows.map(row => ({
      id: row.id,
      type: row.entry_type,
      title: row.title,
      amountCents: Number(row.amount_cents),
      direction: row.direction,
      detail: row.detail,
      createdAt: new Date(row.created_at).toISOString()
    }))
  });
}

export async function setFinanceAccess(db: Pool, playerId: string, accessMode: FinanceAccessMode) {
  return mutate(db, playerId, async client => {
    await client.query('UPDATE finance_accounts SET access_mode = $2 WHERE player_id = $1', [playerId, accessMode]);
    return { title: ACCESS_NAMES[accessMode], message: `Financial permissions now follow the ${ACCESS_NAMES[accessMode].toLowerCase()} access point.` };
  });
}

export async function moveCash(db: Pool, playerId: string, direction: 'deposit' | 'withdraw', amountCents: number) {
  return mutate(db, playerId, async (client, account) => {
    if (account.accessMode === 'phone') throw new FinanceCommandError('physical_cash_unavailable_on_phone');
    if (direction === 'deposit') {
      if (amountCents > account.cashCents) throw new FinanceCommandError('insufficient_physical_cash');
      await client.query('UPDATE player_state SET cash_cents = cash_cents - $2, version = version + 1, updated_at = now() WHERE player_id = $1', [playerId, amountCents]);
      await client.query('UPDATE finance_accounts SET checking_cents = checking_cents + $2 WHERE player_id = $1', [playerId, amountCents]);
      await addLedger(client, playerId, 'cash', 'Cash deposit', amountCents, 'in', ACCESS_NAMES[account.accessMode]);
      return { title: 'Cash deposited', message: `${formatMoney(amountCents)} moved from your wallet to checking.` };
    }
    if (amountCents > account.checkingCents) throw new FinanceCommandError('insufficient_checking_balance');
    if (account.accessMode === 'atm' && amountCents > 200_000) throw new FinanceCommandError('atm_cash_limit_exceeded');
    await client.query('UPDATE finance_accounts SET checking_cents = checking_cents - $2 WHERE player_id = $1', [playerId, amountCents]);
    await client.query('UPDATE player_state SET cash_cents = cash_cents + $2, version = version + 1, updated_at = now() WHERE player_id = $1', [playerId, amountCents]);
    await addLedger(client, playerId, 'cash', 'Cash withdrawal', amountCents, 'out', ACCESS_NAMES[account.accessMode]);
    return { title: 'Cash withdrawn', message: `${formatMoney(amountCents)} moved from checking to your wallet.` };
  });
}

export async function moveInternalFunds(
  db: Pool,
  playerId: string,
  direction: 'checking_to_savings' | 'savings_to_checking',
  amountCents: number
) {
  return mutate(db, playerId, async (client, account) => {
    if (direction === 'checking_to_savings') {
      if (amountCents > account.checkingCents) throw new FinanceCommandError('insufficient_checking_balance');
      await client.query('UPDATE finance_accounts SET checking_cents = checking_cents - $2, savings_cents = savings_cents + $2 WHERE player_id = $1', [playerId, amountCents]);
    } else {
      if (amountCents > account.savingsCents) throw new FinanceCommandError('insufficient_savings_balance');
      await client.query('UPDATE finance_accounts SET checking_cents = checking_cents + $2, savings_cents = savings_cents - $2 WHERE player_id = $1', [playerId, amountCents]);
    }
    const detail = direction === 'checking_to_savings' ? 'Checking → Savings' : 'Savings → Checking';
    await addLedger(client, playerId, 'internal', 'Internal account transfer', amountCents, direction === 'checking_to_savings' ? 'out' : 'in', detail);
    return { title: 'Funds moved', message: `${formatMoney(amountCents)} transferred ${detail.toLowerCase()}.` };
  });
}

export async function sendRecipientTransfer(
  db: Pool,
  playerId: string,
  recipientId: keyof typeof RECIPIENTS,
  amountCents: number,
  reference: string
) {
  return mutate(db, playerId, async (client, account) => {
    if (amountCents > TRANSFER_LIMITS[account.accessMode]) throw new FinanceCommandError('access_transfer_limit_exceeded');
    if (amountCents > account.checkingCents) throw new FinanceCommandError('insufficient_checking_balance');
    const recipient = RECIPIENTS[recipientId];
    await client.query('UPDATE finance_accounts SET checking_cents = checking_cents - $2 WHERE player_id = $1', [playerId, amountCents]);
    await addLedger(client, playerId, 'transfer', `Transfer to ${recipient}`, amountCents, 'out', reference || ACCESS_NAMES[account.accessMode]);
    return { title: 'Transfer completed', message: `${formatMoney(amountCents)} sent to ${recipient}.` };
  });
}

export async function applyForLoan(db: Pool, playerId: string, kind: 'personal' | 'vehicle') {
  return mutate(db, playerId, async (client, account) => {
    if (account.accessMode !== 'branch') throw new FinanceCommandError('bank_branch_required');
    if (kind === 'vehicle') {
      if (account.creditScore < 680) throw new FinanceCommandError('auto_finance_score_too_low');
      return { title: 'Eligible', message: 'Your credit profile passes the first Auto Finance check. Vehicle selection is connected in the Vehicles slice.' };
    }
    const active = await client.query("SELECT 1 FROM finance_loans WHERE player_id = $1 AND kind = 'personal' AND remaining_cents > 0 LIMIT 1", [playerId]);
    if (active.rowCount) throw new FinanceCommandError('active_personal_loan_exists');
    if (account.creditScore < 620) throw new FinanceCommandError('personal_loan_score_too_low');
    const principalCents = 250_000;
    const remainingCents = 274_500;
    const paymentCents = Math.ceil(remainingCents / 12);
    await client.query({
      text: `
        INSERT INTO finance_loans
          (player_id, kind, name, principal_cents, remaining_cents, payment_cents, payments_remaining, apr_basis_points)
        VALUES ($1, 'personal', 'Quick Personal Loan', $2, $3, $4, 12, 980)
      `,
      values: [playerId, principalCents, remainingCents, paymentCents]
    });
    await client.query('UPDATE finance_accounts SET checking_cents = checking_cents + $2, credit_score = GREATEST(300, credit_score - 6) WHERE player_id = $1', [playerId, principalCents]);
    await addLedger(client, playerId, 'loan', 'Personal loan funded', principalCents, 'in', '12-week loan');
    return { title: 'Loan approved', message: '$2,500 funded to checking. On-time repayment will affect your credit profile.' };
  });
}

export async function payNextLoanInstallment(db: Pool, playerId: string) {
  return mutate(db, playerId, async (client, account) => {
    const loanResult = await client.query({
      text: `SELECT id, name, remaining_cents, payment_cents FROM finance_loans WHERE player_id = $1 AND remaining_cents > 0 ORDER BY created_at LIMIT 1 FOR UPDATE`,
      values: [playerId]
    });
    const loan = loanResult.rows[0];
    if (!loan) throw new FinanceCommandError('no_payment_due');
    const paymentCents = Math.min(Number(loan.payment_cents), Number(loan.remaining_cents));
    if (paymentCents > account.checkingCents) throw new FinanceCommandError('insufficient_checking_balance');
    await client.query('UPDATE finance_accounts SET checking_cents = checking_cents - $2, credit_score = LEAST(850, credit_score + 5) WHERE player_id = $1', [playerId, paymentCents]);
    await client.query('UPDATE finance_loans SET remaining_cents = remaining_cents - $2, payments_remaining = GREATEST(0, payments_remaining - 1), updated_at = now() WHERE id = $1', [loan.id, paymentCents]);
    await addLedger(client, playerId, 'loan', 'Loan installment', paymentCents, 'out', loan.name);
    return { title: 'Payment completed', message: `${formatMoney(paymentCents)} paid on time. Your credit score improved.` };
  });
}

export async function fundExchange(db: Pool, playerId: string, amountCents: number) {
  return mutate(db, playerId, async (client, account) => {
    requirePhone(account.accessMode);
    if (amountCents > account.checkingCents) throw new FinanceCommandError('insufficient_checking_balance');
    await client.query('UPDATE finance_accounts SET checking_cents = checking_cents - $2, exchange_cash_cents = exchange_cash_cents + $2 WHERE player_id = $1', [playerId, amountCents]);
    await addLedger(client, playerId, 'crypto', 'DoradoX funding', amountCents, 'out', 'Checking → exchange');
    return { title: 'DoradoX funded', message: `${formatMoney(amountCents)} is available for trading.` };
  });
}

export async function withdrawExchangeCash(db: Pool, playerId: string) {
  return mutate(db, playerId, async (client, account) => {
    requirePhone(account.accessMode);
    if (account.exchangeCashCents <= 0) throw new FinanceCommandError('exchange_cash_empty');
    await client.query('UPDATE finance_accounts SET checking_cents = checking_cents + exchange_cash_cents, exchange_cash_cents = 0 WHERE player_id = $1', [playerId]);
    await addLedger(client, playerId, 'crypto', 'DoradoX cash withdrawal', account.exchangeCashCents, 'in', 'Exchange → checking');
    return { title: 'Exchange cash withdrawn', message: `${formatMoney(account.exchangeCashCents)} returned to checking.` };
  });
}

export async function tradeCrypto(
  db: Pool,
  playerId: string,
  side: 'buy' | 'sell',
  symbol: FinanceAssetSymbol,
  usdCents: number
) {
  return mutate(db, playerId, async (client, account) => {
    requirePhone(account.accessMode);
    const assetResult = await client.query('SELECT price_cents FROM finance_assets WHERE symbol = $1 FOR UPDATE', [symbol]);
    const priceCents = Number(assetResult.rows[0]?.price_cents);
    if (!priceCents) throw new FinanceCommandError('finance_asset_not_found', 404);
    const quantity = usdCents / priceCents;
    if (side === 'buy') {
      if (usdCents > account.exchangeCashCents) throw new FinanceCommandError('insufficient_exchange_cash');
      await client.query('UPDATE finance_accounts SET exchange_cash_cents = exchange_cash_cents - $2 WHERE player_id = $1', [playerId, usdCents]);
      await client.query('UPDATE finance_holdings SET quantity = quantity + $3, updated_at = now() WHERE player_id = $1 AND symbol = $2', [playerId, symbol, quantity]);
    } else {
      const holdingResult = await client.query('SELECT quantity FROM finance_holdings WHERE player_id = $1 AND symbol = $2 FOR UPDATE', [playerId, symbol]);
      if (quantity > Number(holdingResult.rows[0]?.quantity ?? 0) + 0.000000001) throw new FinanceCommandError('insufficient_asset_holding');
      await client.query('UPDATE finance_holdings SET quantity = GREATEST(0, quantity - $3), updated_at = now() WHERE player_id = $1 AND symbol = $2', [playerId, symbol, quantity]);
      await client.query('UPDATE finance_accounts SET exchange_cash_cents = exchange_cash_cents + $2 WHERE player_id = $1', [playerId, usdCents]);
    }
    await addLedger(client, playerId, 'crypto', `${side === 'buy' ? 'Bought' : 'Sold'} ${symbol}`, usdCents, side === 'buy' ? 'out' : 'in', `${quantity.toFixed(4)} ${symbol}`);
    return { title: side === 'buy' ? 'Purchase completed' : 'Sale completed', message: `${quantity.toFixed(4)} ${symbol} ${side === 'buy' ? 'added to' : 'sold from'} your DoradoX wallet.` };
  });
}

export async function advanceFinanceMarket(db: Pool, playerId: string) {
  return mutate(db, playerId, async client => {
    const assets = await client.query('SELECT symbol, price_cents, volatility FROM finance_assets FOR UPDATE');
    for (const asset of assets.rows) {
      const priceCents = Number(asset.price_cents);
      const shock = (Math.random() * 2 - 1) * Number(asset.volatility);
      const nextPrice = Math.max(15, Math.round(priceCents * (1 + shock)));
      await client.query('UPDATE finance_assets SET previous_price_cents = price_cents, price_cents = $2, updated_at = now() WHERE symbol = $1', [asset.symbol, nextPrice]);
    }
    return { title: 'Market advanced', message: 'DoradoX prices moved by one manual simulation tick.' };
  });
}

async function mutate(
  db: Pool,
  playerId: string,
  command: (client: PoolClient, account: LockedFinance) => Promise<Notice>
): Promise<FinanceMutationResult> {
  const client = await db.connect();
  let notice: Notice;
  try {
    await client.query('BEGIN');
    const locked = await client.query({
      text: `
        SELECT fa.access_mode, fa.checking_cents, fa.savings_cents, fa.exchange_cash_cents,
          fa.credit_score, ps.cash_cents
        FROM finance_accounts fa
        JOIN player_state ps ON ps.player_id = fa.player_id
        WHERE fa.player_id = $1
        FOR UPDATE OF fa, ps
      `,
      values: [playerId]
    });
    const row = locked.rows[0];
    if (!row) throw new FinanceCommandError('finance_account_not_found', 404);
    notice = await command(client, {
      accessMode: row.access_mode,
      checkingCents: Number(row.checking_cents),
      savingsCents: Number(row.savings_cents),
      exchangeCashCents: Number(row.exchange_cash_cents),
      creditScore: Number(row.credit_score),
      cashCents: Number(row.cash_cents)
    });
    await client.query('UPDATE finance_accounts SET version = version + 1, updated_at = now() WHERE player_id = $1', [playerId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const [finance, state] = await Promise.all([getFinanceState(db, playerId), getBootstrapState(db, playerId)]);
  if (!state) throw new FinanceCommandError('player_not_found', 404);
  return FinanceMutationResultSchema.parse({ finance, state, notice });
}

async function addLedger(
  client: PoolClient,
  playerId: string,
  type: 'cash' | 'transfer' | 'internal' | 'loan' | 'crypto',
  title: string,
  amountCents: number,
  direction: 'in' | 'out',
  detail: string
) {
  await client.query({
    text: `INSERT INTO finance_ledger (player_id, entry_type, title, amount_cents, direction, detail) VALUES ($1, $2, $3, $4, $5, $6)`,
    values: [playerId, type, title, amountCents, direction, detail]
  });
}

function requirePhone(accessMode: FinanceAccessMode) {
  if (accessMode !== 'phone') throw new FinanceCommandError('phone_app_required');
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}
