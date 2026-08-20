import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import type {
  BootstrapState,
  FinanceAccessMode,
  FinanceAssetSymbol,
  FinanceMutationResult,
  FinanceState
} from '@sol-dorado/contracts';
import { GameIcon, type GameIconName } from '../../components/GameIcon';
import {
  advanceFinanceMarket,
  applyFinanceLoan,
  fundFinanceExchange,
  getFinance,
  moveFinanceCash,
  moveFinanceInternal,
  payFinanceLoan,
  sendFinanceTransfer,
  setFinanceAccess,
  tradeFinanceCrypto,
  withdrawFinanceExchange
} from '../../lib/api';

type FinancePage = 'access' | 'accounts' | 'transfers' | 'credit' | 'crypto' | 'ledger';
type DialogState =
  | { kind: 'cash'; direction: 'deposit' | 'withdraw' }
  | { kind: 'internal' }
  | { kind: 'info'; title: string; message: string };

const financePages: ReadonlyArray<{ id: FinancePage; label: string; icon: GameIconName }> = [
  { id: 'access', label: 'Access', icon: 'landmark' },
  { id: 'accounts', label: 'Accounts', icon: 'wallet' },
  { id: 'transfers', label: 'Transfers', icon: 'send' },
  { id: 'credit', label: 'Credit', icon: 'chart' },
  { id: 'crypto', label: 'DoradoX', icon: 'coins' },
  { id: 'ledger', label: 'Ledger', icon: 'receipt' }
];

const accessPoints: ReadonlyArray<{
  id: FinanceAccessMode;
  label: string;
  description: string;
  location: string;
  icon: GameIconName;
  capabilities: ReadonlyArray<{ label: string; enabled: boolean }>;
}> = [
  {
    id: 'branch', label: 'Bank Branch', description: 'Full banking, lending and physical cash.',
    location: 'Dorado National · Las Palmas', icon: 'landmark',
    capabilities: [
      { label: 'Deposit and withdraw cash', enabled: true },
      { label: 'Transfers up to $10,000', enabled: true },
      { label: 'Loan applications', enabled: true },
      { label: 'DoradoX trading', enabled: false }
    ]
  },
  {
    id: 'atm', label: 'ATM', description: 'Fast cash and limited transfers.',
    location: 'Vespucci Blvd · 42 m', icon: 'credit-card',
    capabilities: [
      { label: 'Deposit and withdraw cash', enabled: true },
      { label: 'Transfers up to $1,000', enabled: true },
      { label: 'Loan applications', enabled: false },
      { label: 'DoradoX trading', enabled: false }
    ]
  },
  {
    id: 'phone', label: 'Phone App', description: 'Remote banking and DoradoX access.',
    location: 'Connected · Secure session', icon: 'smartphone',
    capabilities: [
      { label: 'View and move account funds', enabled: true },
      { label: 'Transfers up to $5,000', enabled: true },
      { label: 'DoradoX funding and trading', enabled: true },
      { label: 'Physical cash operations', enabled: false }
    ]
  }
];

interface Props { onStateChange: (state: BootstrapState) => void; }

export function FinanceView({ onStateChange }: Props) {
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const [page, setPage] = useState<FinancePage>('access');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogAmount, setDialogAmount] = useState('');
  const [internalDirection, setInternalDirection] = useState<'checking_to_savings' | 'savings_to_checking'>('checking_to_savings');
  const [recipient, setRecipient] = useState<'maya' | 'leo' | 'landlord'>('maya');
  const [transferAmount, setTransferAmount] = useState('');
  const [reference, setReference] = useState('');
  const [tradeAsset, setTradeAsset] = useState<FinanceAssetSymbol>('DRC');
  const [tradeAmount, setTradeAmount] = useState('');

  useEffect(() => {
    getFinance().then(setFinance).catch(reason => setError(humanizeError(reason)));
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDialog(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [dialog]);

  async function execute(key: string, action: () => Promise<FinanceMutationResult>) {
    if (busy) return;
    setBusy(key); setError(null); setNotice(null);
    try {
      const result = await action();
      setFinance(result.finance);
      onStateChange(result.state);
      if (result.notice) setNotice(result.notice);
      setDialog(null);
      setDialogAmount('');
    } catch (reason) {
      setError(humanizeError(reason));
    } finally { setBusy(null); }
  }

  function openDialog(next: DialogState) {
    setDialogAmount('');
    setError(null);
    setDialog(next);
  }

  if (!finance) {
    return <section className="finance-loading glass-panel"><GameIcon name="landmark" size={30} /><p>{error ?? 'Opening Dorado National secure services…'}</p></section>;
  }

  const activeAccess = accessPoints.find(item => item.id === finance.accessMode)!;
  const liquid = finance.balances.cashCents + finance.balances.checkingCents + finance.balances.savingsCents + finance.balances.exchangeCashCents;
  const debt = finance.loans.reduce((total, loan) => total + loan.remainingCents, 0);
  const scorePercent = Math.max(0, Math.min(100, (finance.creditScore - 300) / 550 * 100));

  function submitDialog(event: FormEvent) {
    event.preventDefault();
    if (!dialog || dialog.kind === 'info') return;
    const amountCents = parseAmount(dialogAmount);
    if (!amountCents) { setError('Enter a valid amount.'); return; }
    if (dialog.kind === 'cash') execute(`cash-${dialog.direction}`, () => moveFinanceCash(dialog.direction, amountCents));
    else execute('internal', () => moveFinanceInternal(internalDirection, amountCents));
  }

  function submitTransfer(event: FormEvent) {
    event.preventDefault();
    const amountCents = parseAmount(transferAmount);
    if (!amountCents) { setError('Enter a valid transfer amount.'); return; }
    execute('recipient-transfer', () => sendFinanceTransfer(recipient, amountCents, reference)).then(() => {
      setTransferAmount(''); setReference('');
    });
  }

  function submitTrade(side: 'buy' | 'sell') {
    const usdCents = parseAmount(tradeAmount);
    if (!usdCents) { setError('Enter a valid USD trade amount.'); return; }
    execute(`crypto-${side}`, () => tradeFinanceCrypto(side, tradeAsset, usdCents)).then(() => setTradeAmount(''));
  }

  return (
    <section className="finance-screen">
      <div className="screen-heading finance-heading">
        <div>
          <span className="eyebrow">Dorado National financial network</span>
          <h1>Finance</h1>
          <p>Your access point changes what is possible. Every movement is persistent and recorded in one authoritative ledger.</p>
        </div>
        <div className="finance-position">
          <span>Net liquid position</span>
          <strong>{money(liquid)}</strong>
          <small>{activeAccess.label} · {money(finance.transferLimitCents)} transfer limit</small>
        </div>
      </div>

      <nav className="finance-tabs" aria-label="Finance sections">
        {financePages.map(item => (
          <button key={item.id} className={page === item.id ? 'finance-tab finance-tab-active' : 'finance-tab'} onClick={() => setPage(item.id)}>
            <GameIcon name={item.icon} size={17} /><span>{item.label}</span>
          </button>
        ))}
      </nav>

      {(error || notice) && (
        <div className={error ? 'finance-feedback finance-feedback-error' : 'finance-feedback finance-feedback-success'}>
          <GameIcon name={error ? 'x' : 'check'} size={17} />
          <div><b>{error ? 'Action blocked' : notice!.title}</b><span>{error ?? notice!.message}</span></div>
          <button aria-label="Dismiss message" onClick={() => { setError(null); setNotice(null); }}><GameIcon name="x" size={15} /></button>
        </div>
      )}

      {page === 'access' && (
        <div className="finance-stack">
          <div className="finance-access-grid">
            {accessPoints.map(item => (
              <button
                key={item.id}
                className={finance.accessMode === item.id ? 'finance-access-card finance-access-card-active' : 'finance-access-card'}
                disabled={Boolean(busy)}
                onClick={() => execute(`access-${item.id}`, () => setFinanceAccess(item.id))}
              >
                <span className="finance-card-icon"><GameIcon name={item.icon} size={23} /></span>
                <span className="finance-access-copy"><small>{item.location}</small><b>{item.label}</b><em>{item.description}</em></span>
                <span className="finance-radio"><i /></span>
              </button>
            ))}
          </div>
          <div className="finance-two-columns finance-access-detail">
            <Panel eyebrow="Current access" title={activeAccess.label} icon={activeAccess.icon}>
              <div className="capability-list">
                {activeAccess.capabilities.map(capability => (
                  <div className={capability.enabled ? 'capability-row' : 'capability-row capability-row-locked'} key={capability.label}>
                    <span><GameIcon name={capability.enabled ? 'check' : 'x'} size={14} /></span><b>{capability.label}</b>
                  </div>
                ))}
              </div>
            </Panel>
            <div className="finance-feature-panel">
              <div className="finance-feature-glow" />
              <GameIcon name="sparkles" size={24} />
              <span className="eyebrow">Context matters</span>
              <h2>Banking is part of the city</h2>
              <p>Branches support lending and large transfers. ATMs offer fast street access. The phone connects remote banking and DoradoX.</p>
              <button className="finance-primary" onClick={() => setPage(finance.accessMode === 'atm' ? 'transfers' : 'accounts')}>Enter {activeAccess.label}<GameIcon name="arrow-up-right" size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {page === 'accounts' && (
        <div className="finance-stack">
          <div className="account-grid">
            <AccountCard icon="banknote" eyebrow="Wallet" title="Physical cash" amount={finance.balances.cashCents} tone="cash">
              <button disabled={Boolean(busy)} onClick={() => openDialog({ kind: 'cash', direction: 'deposit' })}>Deposit</button>
              <button disabled={Boolean(busy)} onClick={() => openDialog({ kind: 'cash', direction: 'withdraw' })}>Withdraw</button>
            </AccountCard>
            <AccountCard icon="credit-card" eyebrow="Checking · ••4821" title="Primary account" amount={finance.balances.checkingCents} tone="checking"><span className="finance-chip finance-chip-success">Active</span></AccountCard>
            <AccountCard icon="wallet" eyebrow="Savings · ••0904" title="Reserve balance" amount={finance.balances.savingsCents} tone="savings"><button disabled={Boolean(busy)} onClick={() => openDialog({ kind: 'internal' })}>Move funds</button></AccountCard>
            <article className="account-card account-card-locked"><GameIcon name="lock" size={20} /><span className="eyebrow">Business account</span><h3>Requires an operating business</h3><strong>Locked</strong><small>Connected later through Hospitality and owned businesses.</small></article>
          </div>
          <div className="finance-two-columns">
            <Panel eyebrow="Account services" title="Secure and connected" icon="shield">
              <div className="service-list">
                <Service icon="credit-card" title="Card & PIN" detail="Card active · PIN configured" />
                <Service icon="smartphone" title="Mobile banking" detail="Enabled for remote access" />
                <Service icon="receipt" title="Statements" detail="All activity feeds the Ledger" />
              </div>
            </Panel>
            <Panel eyebrow="Position" title="At a glance" icon="chart">
              <div className="position-metrics">
                <div><span>Liquid funds</span><strong>{money(liquid)}</strong></div>
                <div><span>Total debt</span><strong>{money(debt)}</strong></div>
                <div><span>Credit score</span><strong>{finance.creditScore}</strong></div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {page === 'transfers' && (
        <div className="finance-two-columns">
          <Panel eyebrow="Money movement" title="Send money" icon="send">
            <form className="finance-form" onSubmit={submitTransfer}>
              <Field label="Recipient"><select value={recipient} onChange={event => setRecipient(event.target.value as typeof recipient)}><option value="maya">Maya Torres · ••1142</option><option value="leo">Leo Carter · ••7771</option><option value="landlord">Vespucci Property Group · ••2298</option></select></Field>
              <Field label="Amount"><div className="money-input"><span>$</span><input type="number" min="1" step="1" placeholder="250" value={transferAmount} onChange={event => setTransferAmount(event.target.value)} /></div></Field>
              <Field label="Reference"><input maxLength={40} placeholder="Rent / split / payment" value={reference} onChange={event => setReference(event.target.value)} /></Field>
              <button className="finance-primary" disabled={Boolean(busy)}>{busy === 'recipient-transfer' ? 'Sending…' : 'Send transfer'}<GameIcon name="send" size={15} /></button>
            </form>
          </Panel>
          <Panel eyebrow="Current permissions" title={activeAccess.label} icon={activeAccess.icon}>
            <div className="rule-hero"><span>Per-transfer limit</span><strong>{money(finance.transferLimitCents)}</strong><small>Permissions are enforced by the API, not only the interface.</small></div>
            <div className="capability-list">
              <div className="capability-row"><span><GameIcon name="check" size={14} /></span><b>Recipient transfers available</b></div>
              <div className={finance.accessMode === 'phone' ? 'capability-row capability-row-locked' : 'capability-row'}><span><GameIcon name={finance.accessMode === 'phone' ? 'x' : 'check'} size={14} /></span><b>Physical cash {finance.accessMode === 'phone' ? 'unavailable' : 'available'}</b></div>
              <div className="capability-row"><span><GameIcon name="receipt" size={14} /></span><b>Reference recorded in ledger</b></div>
            </div>
          </Panel>
        </div>
      )}

      {page === 'credit' && (
        <div className="finance-stack">
          <div className="finance-two-columns">
            <Panel eyebrow="Credit profile" title={creditBand(finance.creditScore)} icon="chart">
              <div className="credit-profile">
                <div className="credit-ring" style={{ '--score': `${scorePercent}%` } as CSSProperties}><span><strong>{finance.creditScore}</strong><small>Score</small></span></div>
                <div><p>Credit follows repayment behavior and debt usage. It is not a generic XP meter.</p><button className="finance-secondary" disabled={Boolean(busy) || finance.loans.length === 0} onClick={() => execute('loan-pay', payFinanceLoan)}>Pay next installment</button></div>
              </div>
            </Panel>
            <Panel eyebrow="Active debt" title={finance.loans.length ? `${finance.loans.length} active product` : 'No active debt'} icon="receipt">
              {finance.loans.length ? <div className="loan-list">{finance.loans.map(loan => <div className="loan-row" key={loan.id}><div><b>{loan.name}</b><small>{loan.paymentsRemaining} payments · next {money(Math.min(loan.paymentCents, loan.remainingCents))}</small></div><strong>{money(loan.remainingCents)}</strong></div>)}</div> : <Empty icon="check" text="No payment is currently due." />}
            </Panel>
          </div>
          <div className="loan-product-grid">
            <LoanProduct eyebrow="Personal" title="Quick Personal Loan" amount="$2,500" apr="9.8% APR" term="12 weeks" description="Flexible unsecured lending." action="Apply" primary disabled={Boolean(busy)} onClick={() => execute('loan-personal', () => applyFinanceLoan('personal'))} />
            <LoanProduct eyebrow="Vehicle" title="Auto Finance" amount="$12,000" apr="7.2% APR" term="36 weeks" description="Eligibility before vehicle selection." action="Check eligibility" disabled={Boolean(busy)} onClick={() => execute('loan-vehicle', () => applyFinanceLoan('vehicle'))} />
            <LoanProduct eyebrow="Business" title="Business Credit Line" amount="$20,000" apr="Variable" term="Locked" description="Requires an operating business." action="Requires business" disabled onClick={() => undefined} />
          </div>
        </div>
      )}

      {page === 'crypto' && (
        <div className="finance-stack">
          <div className="crypto-hero">
            <div><span className="eyebrow">DoradoX · Fictional market</span><h2>{money(finance.balances.exchangeCashCents)}</h2><p>Exchange cash available for trading.</p><div className="finance-actions"><button className="finance-primary" disabled={Boolean(busy)} onClick={() => execute('exchange-fund', () => fundFinanceExchange(50_000))}>Fund $500</button><button className="finance-secondary" disabled={Boolean(busy) || finance.balances.exchangeCashCents === 0} onClick={() => execute('exchange-withdraw', withdrawFinanceExchange)}>Withdraw all</button></div></div>
            <div className="crypto-orbit"><span>DX</span><i /><i /><i /></div>
            <button className="market-tick" disabled={Boolean(busy)} onClick={() => execute('market', advanceFinanceMarket)}><GameIcon name="sparkles" size={17} /><span><b>Advance market</b><small>Manual simulation tick</small></span></button>
          </div>
          <div className="finance-two-columns">
            <Panel eyebrow="Live test market" title="Fictional assets" icon="chart">
              <div className="market-list">{finance.assets.map(asset => { const change = (asset.priceCents - asset.previousPriceCents) / asset.previousPriceCents * 100; return <div className="market-row" key={asset.symbol}><span className={`asset-symbol asset-${asset.symbol.toLowerCase()}`}>{asset.symbol[0]}</span><div><b>{asset.name}</b><small>{asset.symbol} · fictional asset</small></div><strong>{money(asset.priceCents, true)}</strong><em className={change >= 0 ? 'market-up' : 'market-down'}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</em></div>; })}</div>
            </Panel>
            <Panel eyebrow="Exchange wallet" title="Trade assets" icon="wallet">
              <div className="holding-grid">{finance.assets.map(asset => <div key={asset.symbol}><span>{asset.symbol}</span><strong>{asset.holding.toFixed(4)}</strong><small>{money(Math.round(asset.holding * asset.priceCents))}</small></div>)}</div>
              <div className="trade-form"><Field label="Asset"><select value={tradeAsset} onChange={event => setTradeAsset(event.target.value as FinanceAssetSymbol)}>{finance.assets.map(asset => <option key={asset.symbol} value={asset.symbol}>{asset.symbol} · {asset.name}</option>)}</select></Field><Field label="USD amount"><div className="money-input"><span>$</span><input type="number" min="1" placeholder="100" value={tradeAmount} onChange={event => setTradeAmount(event.target.value)} /></div></Field></div>
              <div className="finance-actions"><button className="finance-primary" disabled={Boolean(busy)} onClick={() => submitTrade('buy')}>Buy asset</button><button className="finance-secondary" disabled={Boolean(busy)} onClick={() => submitTrade('sell')}>Sell by value</button></div>
            </Panel>
          </div>
        </div>
      )}

      {page === 'ledger' && (
        <Panel eyebrow="Financial history" title="Authoritative ledger" icon="receipt">
          {finance.ledger.length ? <div className="finance-ledger">{finance.ledger.map(entry => <div className="ledger-row" key={entry.id}><span className={`ledger-icon ledger-${entry.type}`}><GameIcon name={ledgerIcon(entry.type)} size={17} /></span><div><b>{entry.title}</b><small>{new Date(entry.createdAt).toLocaleString()} {entry.detail && `· ${entry.detail}`}</small></div><strong className={entry.direction === 'in' ? 'amount-in' : 'amount-out'}>{entry.direction === 'in' ? '+' : '−'}{money(entry.amountCents)}</strong></div>)}</div> : <Empty icon="receipt" text="Your first transaction will appear here." />}
        </Panel>
      )}

      {dialog && (
        <div className="finance-dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setDialog(null)}>
          <div className="finance-dialog" role="dialog" aria-modal="true" aria-label={dialog.kind === 'info' ? dialog.title : 'Finance action'}>
            <button className="dialog-close" aria-label="Close" onClick={() => setDialog(null)}><GameIcon name="x" size={17} /></button>
            {dialog.kind === 'info' ? <><span className="eyebrow">Finance</span><h2>{dialog.title}</h2><p>{dialog.message}</p></> : (
              <form onSubmit={submitDialog}>
                <span className="eyebrow">{dialog.kind === 'cash' ? 'Physical cash' : 'Internal transfer'}</span>
                <h2>{dialog.kind === 'cash' ? `${capitalize(dialog.direction)} cash` : 'Move account funds'}</h2>
                {dialog.kind === 'internal' && <Field label="Direction"><select value={internalDirection} onChange={event => setInternalDirection(event.target.value as typeof internalDirection)}><option value="checking_to_savings">Checking → Savings</option><option value="savings_to_checking">Savings → Checking</option></select></Field>}
                <Field label="Amount"><div className="money-input"><span>$</span><input autoFocus type="number" min="1" placeholder="500" value={dialogAmount} onChange={event => setDialogAmount(event.target.value)} /></div></Field>
                <button className="finance-primary" disabled={Boolean(busy)}>Confirm movement<GameIcon name="arrow-left-right" size={15} /></button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Panel({ eyebrow, title, icon, children }: { eyebrow: string; title: string; icon: GameIconName; children: ReactNode }) {
  return <article className="finance-panel"><header><span className="finance-panel-icon"><GameIcon name={icon} size={18} /></span><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div></header>{children}</article>;
}

function AccountCard({ icon, eyebrow, title, amount, tone, children }: { icon: GameIconName; eyebrow: string; title: string; amount: number; tone: string; children: ReactNode }) {
  return <article className={`account-card account-card-${tone}`}><div className="account-top"><span className="account-icon"><GameIcon name={icon} size={18} /></span><span className="eyebrow">{eyebrow}</span></div><h3>{title}</h3><strong>{money(amount)}</strong><div className="account-actions">{children}</div></article>;
}

function Service({ icon, title, detail }: { icon: GameIconName; title: string; detail: string }) {
  return <div className="service-row"><span><GameIcon name={icon} size={16} /></span><div><b>{title}</b><small>{detail}</small></div><GameIcon name="check" size={15} /></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="finance-field"><span>{label}</span>{children}</label>;
}

function LoanProduct({ eyebrow, title, amount, apr, term, description, action, primary = false, disabled, onClick }: { eyebrow: string; title: string; amount: string; apr: string; term: string; description: string; action: string; primary?: boolean; disabled: boolean; onClick: () => void }) {
  return <article className="loan-product"><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{description}</p><strong>{amount}</strong><div><span>{apr}</span><span>{term}</span></div><button className={primary ? 'finance-primary' : 'finance-secondary'} disabled={disabled} onClick={onClick}>{action}</button></article>;
}

function Empty({ icon, text }: { icon: GameIconName; text: string }) {
  return <div className="finance-empty"><GameIcon name={icon} size={21} /><span>{text}</span></div>;
}

function ledgerIcon(type: FinanceState['ledger'][number]['type']): GameIconName {
  if (type === 'cash') return 'banknote';
  if (type === 'loan') return 'chart';
  if (type === 'crypto') return 'coins';
  if (type === 'internal') return 'arrow-left-right';
  return 'send';
}

function parseAmount(value: string) {
  const amount = Math.round(Number(value) * 100);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
}

function money(cents: number, decimals = false) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 }).format(cents / 100);
}

function creditBand(score: number) { return score >= 740 ? 'Excellent' : score >= 670 ? 'Good' : score >= 600 ? 'Fair' : 'Weak'; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function humanizeError(reason: unknown) {
  const code = reason instanceof Error ? reason.message : String(reason);
  const messages: Record<string, string> = {
    physical_cash_unavailable_on_phone: 'Physical cash operations require a bank branch or ATM.',
    insufficient_physical_cash: 'Your wallet does not contain enough physical cash.',
    insufficient_checking_balance: 'Your checking balance is too low for this action.',
    insufficient_savings_balance: 'Your savings balance is too low for this action.',
    atm_cash_limit_exceeded: 'The ATM cash limit is $2,000 per transaction.',
    access_transfer_limit_exceeded: 'This transfer exceeds the current access-point limit.',
    bank_branch_required: 'Loan applications require a Dorado National Bank branch.',
    active_personal_loan_exists: 'You already have an active personal loan.',
    personal_loan_score_too_low: 'A score of at least 620 is required for this personal loan.',
    auto_finance_score_too_low: 'Auto Finance currently requires a credit score of 680 or higher.',
    no_payment_due: 'There is no active loan installment to pay.',
    phone_app_required: 'DoradoX funding and trading require the Phone App access point.',
    exchange_cash_empty: 'There is no exchange cash to withdraw.',
    insufficient_exchange_cash: 'Your DoradoX exchange cash is too low for this trade.',
    insufficient_asset_holding: 'Your holding is too small for this sale.'
  };
  return messages[code] ?? code.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
}
