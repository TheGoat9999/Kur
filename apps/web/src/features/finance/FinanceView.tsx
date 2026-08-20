import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import type {
  BootstrapState,
  FinanceAccessMode,
  FinanceAssetSymbol,
  FinanceMutationResult,
  FinanceState
} from '@sol-dorado/contracts';
import { GameIcon, type GameIconName } from '../../components/GameIcon';
import { GlassSelect } from '../../components/GlassSelect';
import { useNotifications } from '../../components/Notifications';
import { useI18n, type TranslationKey } from '../../i18n';
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

const financePages: ReadonlyArray<{ id: FinancePage; label: TranslationKey; icon: GameIconName }> = [
  { id: 'access', label: 'finance.tab.access', icon: 'landmark' },
  { id: 'accounts', label: 'finance.tab.accounts', icon: 'wallet' },
  { id: 'transfers', label: 'finance.tab.transfers', icon: 'send' },
  { id: 'credit', label: 'finance.tab.credit', icon: 'chart' },
  { id: 'crypto', label: 'finance.tab.crypto', icon: 'coins' },
  { id: 'ledger', label: 'finance.tab.ledger', icon: 'receipt' }
];

const accessPoints: ReadonlyArray<{
  id: FinanceAccessMode;
  label: TranslationKey;
  description: TranslationKey;
  location: TranslationKey;
  icon: GameIconName;
  capabilities: ReadonlyArray<{ label: TranslationKey; enabled: boolean }>;
}> = [
  {
    id: 'branch', label: 'finance.access.branch', description: 'finance.branch.description',
    location: 'finance.branch.location', icon: 'landmark',
    capabilities: [
      { label: 'finance.cap.cash', enabled: true },
      { label: 'finance.cap.transfer10', enabled: true },
      { label: 'finance.cap.loans', enabled: true },
      { label: 'finance.cap.crypto', enabled: false }
    ]
  },
  {
    id: 'atm', label: 'finance.access.atm', description: 'finance.atm.description',
    location: 'finance.atm.location', icon: 'credit-card',
    capabilities: [
      { label: 'finance.cap.cash', enabled: true },
      { label: 'finance.cap.transfer1', enabled: true },
      { label: 'finance.cap.loans', enabled: false },
      { label: 'finance.cap.crypto', enabled: false }
    ]
  },
  {
    id: 'phone', label: 'finance.access.phone', description: 'finance.phone.description',
    location: 'finance.phone.location', icon: 'smartphone',
    capabilities: [
      { label: 'finance.cap.accounts', enabled: true },
      { label: 'finance.cap.transfer5', enabled: true },
      { label: 'finance.cap.funding', enabled: true },
      { label: 'finance.cap.physical', enabled: false }
    ]
  }
];

interface Props { onStateChange: (state: BootstrapState) => void; }

export function FinanceView({ onStateChange }: Props) {
  const { locale, t, money, dateTime, runtime } = useI18n();
  const { push } = useNotifications();
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const [page, setPage] = useState<FinancePage>('access');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogAmount, setDialogAmount] = useState('');
  const [internalDirection, setInternalDirection] = useState<'checking_to_savings' | 'savings_to_checking'>('checking_to_savings');
  const [recipient, setRecipient] = useState<'maya' | 'leo' | 'landlord'>('maya');
  const [transferAmount, setTransferAmount] = useState('');
  const [reference, setReference] = useState('');
  const [tradeAsset, setTradeAsset] = useState<FinanceAssetSymbol>('DRC');
  const [tradeAmount, setTradeAmount] = useState('');

  useEffect(() => {
    getFinance().then(setFinance).catch(reason => {
      const message = humanizeError(reason, locale);
      setError(message);
      push({ tone: 'error', title: t('common.actionBlocked'), message });
    });
  }, [locale, push, t]);

  useEffect(() => {
    if (!dialog) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDialog(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [dialog]);

  async function execute(key: string, action: () => Promise<FinanceMutationResult>) {
    if (busy) return;
    setBusy(key); setError(null);
    try {
      const result = await action();
      setFinance(result.finance);
      onStateChange(result.state);
      if (result.notice) push({ tone: key === 'market' ? 'info' : 'success', title: runtime(result.notice.title), message: runtime(result.notice.message) });
      setDialog(null);
      setDialogAmount('');
    } catch (reason) {
      const message = humanizeError(reason, locale);
      setError(message);
      push({ tone: 'error', title: t('common.actionBlocked'), message });
    } finally { setBusy(null); }
  }

  function openDialog(next: DialogState) {
    setDialogAmount('');
    setError(null);
    setDialog(next);
  }

  if (!finance) {
    return <section className="finance-loading glass-panel"><GameIcon name="landmark" size={30} /><p>{error ?? t('finance.loading')}</p></section>;
  }

  const activeAccess = accessPoints.find(item => item.id === finance.accessMode)!;
  const liquid = finance.balances.cashCents + finance.balances.checkingCents + finance.balances.savingsCents + finance.balances.exchangeCashCents;
  const debt = finance.loans.reduce((total, loan) => total + loan.remainingCents, 0);
  const scorePercent = Math.max(0, Math.min(100, (finance.creditScore - 300) / 550 * 100));

  function submitDialog(event: FormEvent) {
    event.preventDefault();
    if (!dialog || dialog.kind === 'info') return;
    const amountCents = parseAmount(dialogAmount);
    if (!amountCents) { const message = t('finance.validAmount'); setError(message); push({ tone: 'warning', title: t('common.actionBlocked'), message }); return; }
    if (dialog.kind === 'cash') execute(`cash-${dialog.direction}`, () => moveFinanceCash(dialog.direction, amountCents));
    else execute('internal', () => moveFinanceInternal(internalDirection, amountCents));
  }

  function submitTransfer(event: FormEvent) {
    event.preventDefault();
    const amountCents = parseAmount(transferAmount);
    if (!amountCents) { const message = t('finance.validTransfer'); setError(message); push({ tone: 'warning', title: t('common.actionBlocked'), message }); return; }
    execute('recipient-transfer', () => sendFinanceTransfer(recipient, amountCents, reference)).then(() => {
      setTransferAmount(''); setReference('');
    });
  }

  function submitTrade(side: 'buy' | 'sell') {
    const usdCents = parseAmount(tradeAmount);
    if (!usdCents) { const message = t('finance.validTrade'); setError(message); push({ tone: 'warning', title: t('common.actionBlocked'), message }); return; }
    execute(`crypto-${side}`, () => tradeFinanceCrypto(side, tradeAsset, usdCents)).then(() => setTradeAmount(''));
  }

  return (
    <section className="finance-screen">
      <div className="screen-heading finance-heading">
        <div>
          <span className="eyebrow">{t('finance.eyebrow')}</span>
          <h1>{t('finance.title')}</h1>
          <p>{t('finance.description')}</p>
        </div>
        <div className="finance-position">
          <span>{t('finance.netPosition')}</span>
          <strong>{money(liquid)}</strong>
          <small>{t('finance.transferLimit', { access: t(activeAccess.label), amount: money(finance.transferLimitCents) })}</small>
        </div>
      </div>

      <nav className="finance-tabs" aria-label={t('finance.sections')}>
        {financePages.map(item => (
          <button key={item.id} className={page === item.id ? 'finance-tab finance-tab-active' : 'finance-tab'} onClick={() => setPage(item.id)}>
            <GameIcon name={item.icon} size={17} /><span>{t(item.label)}</span>
          </button>
        ))}
      </nav>

      {error && (
        <div className="finance-feedback finance-feedback-error">
          <GameIcon name="x" size={17} />
          <div><b>{t('common.actionBlocked')}</b><span>{error}</span></div>
          <button aria-label={t('common.dismiss')} onClick={() => setError(null)}><GameIcon name="x" size={15} /></button>
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
                <span className="finance-access-copy"><small>{t(item.location)}</small><b>{t(item.label)}</b><em>{t(item.description)}</em></span>
                <span className="finance-radio"><i /></span>
              </button>
            ))}
          </div>
          <div className="finance-two-columns finance-access-detail">
            <Panel eyebrow={t('finance.currentAccess')} title={t(activeAccess.label)} icon={activeAccess.icon}>
              <div className="capability-list">
                {activeAccess.capabilities.map(capability => (
                  <div className={capability.enabled ? 'capability-row' : 'capability-row capability-row-locked'} key={capability.label}>
                    <span><GameIcon name={capability.enabled ? 'check' : 'x'} size={14} /></span><b>{t(capability.label)}</b>
                  </div>
                ))}
              </div>
            </Panel>
            <div className="finance-feature-panel">
              <div className="finance-feature-glow" />
              <GameIcon name="sparkles" size={24} />
              <span className="eyebrow">{t('finance.contextMatters')}</span>
              <h2>{t('finance.cityBanking')}</h2>
              <p>{t('finance.cityBankingText')}</p>
              <button className="finance-primary" onClick={() => setPage(finance.accessMode === 'atm' ? 'transfers' : 'accounts')}>{t('finance.enter', { access: t(activeAccess.label) })}<GameIcon name="arrow-up-right" size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {page === 'accounts' && (
        <div className="finance-stack">
          <div className="account-grid">
            <AccountCard icon="banknote" eyebrow={t('finance.wallet')} title={t('finance.physicalCash')} amount={finance.balances.cashCents} tone="cash" money={money}>
              <button disabled={Boolean(busy)} onClick={() => openDialog({ kind: 'cash', direction: 'deposit' })}>{t('finance.deposit')}</button>
              <button disabled={Boolean(busy)} onClick={() => openDialog({ kind: 'cash', direction: 'withdraw' })}>{t('finance.withdraw')}</button>
            </AccountCard>
            <AccountCard icon="credit-card" eyebrow={t('finance.checking')} title={t('finance.primaryAccount')} amount={finance.balances.checkingCents} tone="checking" money={money}><span className="finance-chip finance-chip-success">{t('common.active')}</span></AccountCard>
            <AccountCard icon="wallet" eyebrow={t('finance.savings')} title={t('finance.reserve')} amount={finance.balances.savingsCents} tone="savings" money={money}><button disabled={Boolean(busy)} onClick={() => openDialog({ kind: 'internal' })}>{t('finance.moveFunds')}</button></AccountCard>
            <article className="account-card account-card-locked"><GameIcon name="lock" size={20} /><span className="eyebrow">{t('finance.businessAccount')}</span><h3>{t('finance.requiresBusiness')}</h3><strong>{t('common.locked')}</strong><small>{t('finance.businessLater')}</small></article>
          </div>
          <div className="finance-two-columns">
            <Panel eyebrow={t('finance.accountServices')} title={t('finance.secureConnected')} icon="shield">
              <div className="service-list">
                <Service icon="credit-card" title={t('finance.cardPin')} detail={t('finance.cardPinDetail')} />
                <Service icon="smartphone" title={t('finance.mobileBanking')} detail={t('finance.mobileDetail')} />
                <Service icon="receipt" title={t('finance.statements')} detail={t('finance.statementsDetail')} />
              </div>
            </Panel>
            <Panel eyebrow={t('finance.position')} title={t('finance.atGlance')} icon="chart">
              <div className="position-metrics">
                <div><span>{t('finance.liquidFunds')}</span><strong>{money(liquid)}</strong></div>
                <div><span>{t('finance.totalDebt')}</span><strong>{money(debt)}</strong></div>
                <div><span>{t('finance.creditScore')}</span><strong>{finance.creditScore}</strong></div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {page === 'transfers' && (
        <div className="finance-two-columns">
          <Panel eyebrow={t('finance.moneyMovement')} title={t('finance.sendMoney')} icon="send">
            <form className="finance-form" onSubmit={submitTransfer}>
              <Field label={t('finance.recipient')}><GlassSelect ariaLabel={t('finance.recipient')} value={recipient} onValueChange={setRecipient} options={[{ value: 'maya', label: 'Maya Torres · ••1142' }, { value: 'leo', label: 'Leo Carter · ••7771' }, { value: 'landlord', label: 'Vespucci Property Group · ••2298' }]} /></Field>
              <Field label={t('finance.amount')}><div className="money-input"><span>$</span><input type="number" min="1" step="1" placeholder="250" value={transferAmount} onChange={event => setTransferAmount(event.target.value)} /></div></Field>
              <Field label={t('finance.reference')}><input maxLength={40} placeholder={t('finance.referencePlaceholder')} value={reference} onChange={event => setReference(event.target.value)} /></Field>
              <button className="finance-primary" disabled={Boolean(busy)}>{busy === 'recipient-transfer' ? t('finance.sending') : t('finance.sendTransfer')}<GameIcon name="send" size={15} /></button>
            </form>
          </Panel>
          <Panel eyebrow={t('finance.currentPermissions')} title={t(activeAccess.label)} icon={activeAccess.icon}>
            <div className="rule-hero"><span>{t('finance.perTransfer')}</span><strong>{money(finance.transferLimitCents)}</strong><small>{t('finance.apiPermissions')}</small></div>
            <div className="capability-list">
              <div className="capability-row"><span><GameIcon name="check" size={14} /></span><b>{t('finance.recipientAvailable')}</b></div>
              <div className={finance.accessMode === 'phone' ? 'capability-row capability-row-locked' : 'capability-row'}><span><GameIcon name={finance.accessMode === 'phone' ? 'x' : 'check'} size={14} /></span><b>{t('finance.physicalStatus', { status: t(finance.accessMode === 'phone' ? 'common.unavailable' : 'common.available') })}</b></div>
              <div className="capability-row"><span><GameIcon name="receipt" size={14} /></span><b>{t('finance.referenceLedger')}</b></div>
            </div>
          </Panel>
        </div>
      )}

      {page === 'credit' && (
        <div className="finance-stack">
          <div className="finance-two-columns">
            <Panel eyebrow={t('finance.creditProfile')} title={creditBand(finance.creditScore, t)} icon="chart">
              <div className="credit-profile">
                <div className="credit-ring" style={{ '--score': `${scorePercent}%` } as CSSProperties}><span><strong>{finance.creditScore}</strong><small>{t('finance.score')}</small></span></div>
                <div><p>{t('finance.creditText')}</p><button className="finance-secondary" disabled={Boolean(busy) || finance.loans.length === 0} onClick={() => execute('loan-pay', payFinanceLoan)}>{t('finance.payInstallment')}</button></div>
              </div>
            </Panel>
            <Panel eyebrow={t('finance.activeDebt')} title={finance.loans.length ? t('finance.activeProducts', { count: finance.loans.length }) : t('finance.noDebt')} icon="receipt">
              {finance.loans.length ? <div className="loan-list">{finance.loans.map(loan => <div className="loan-row" key={loan.id}><div><b>{runtime(loan.name)}</b><small>{t('finance.payments', { count: loan.paymentsRemaining, amount: money(Math.min(loan.paymentCents, loan.remainingCents)) })}</small></div><strong>{money(loan.remainingCents)}</strong></div>)}</div> : <Empty icon="check" text={t('finance.noPayment')} />}
            </Panel>
          </div>
          <div className="loan-product-grid">
            <LoanProduct eyebrow={t('finance.personal')} title={t('finance.personalLoan')} amount="$2,500" apr="9.8% APR" term={t('finance.weeks12')} description={t('finance.personalDescription')} action={t('finance.apply')} primary disabled={Boolean(busy)} onClick={() => execute('loan-personal', () => applyFinanceLoan('personal'))} />
            <LoanProduct eyebrow={t('finance.vehicle')} title={t('finance.autoFinance')} amount="$12,000" apr="7.2% APR" term={t('finance.weeks36')} description={t('finance.autoDescription')} action={t('finance.checkEligibility')} disabled={Boolean(busy)} onClick={() => execute('loan-vehicle', () => applyFinanceLoan('vehicle'))} />
            <LoanProduct eyebrow={t('finance.business')} title={t('finance.businessCredit')} amount="$20,000" apr={t('finance.variable')} term={t('common.locked')} description={t('finance.requiresBusiness')} action={t('finance.requiresBusinessAction')} disabled onClick={() => undefined} />
          </div>
        </div>
      )}

      {page === 'crypto' && (
        <div className="finance-stack">
          <div className="crypto-hero">
            <div><span className="eyebrow">{t('finance.fictionalMarket')}</span><h2>{money(finance.balances.exchangeCashCents)}</h2><p>{t('finance.exchangeCash')}</p><div className="finance-actions"><button className="finance-primary" disabled={Boolean(busy)} onClick={() => execute('exchange-fund', () => fundFinanceExchange(50_000))}>{t('finance.fund500')}</button><button className="finance-secondary" disabled={Boolean(busy) || finance.balances.exchangeCashCents === 0} onClick={() => execute('exchange-withdraw', withdrawFinanceExchange)}>{t('finance.withdrawAll')}</button></div></div>
            <div className="crypto-orbit"><span>DX</span><i /><i /><i /></div>
            <button className="market-tick" disabled={Boolean(busy)} onClick={() => execute('market', advanceFinanceMarket)}><GameIcon name="sparkles" size={17} /><span><b>{t('finance.advanceMarket')}</b><small>{t('finance.manualTick')}</small></span></button>
          </div>
          <div className="finance-two-columns">
            <Panel eyebrow={t('finance.liveMarket')} title={t('finance.fictionalAssets')} icon="chart">
              <div className="market-list">{finance.assets.map(asset => { const change = (asset.priceCents - asset.previousPriceCents) / asset.previousPriceCents * 100; return <div className="market-row" key={asset.symbol}><span className={`asset-symbol asset-${asset.symbol.toLowerCase()}`}>{asset.symbol[0]}</span><div><b>{asset.name}</b><small>{asset.symbol} · {t('finance.fictionalAsset')}</small></div><strong>{money(asset.priceCents, true)}</strong><em className={change >= 0 ? 'market-up' : 'market-down'}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</em></div>; })}</div>
            </Panel>
            <Panel eyebrow={t('finance.exchangeWallet')} title={t('finance.tradeAssets')} icon="wallet">
              <div className="holding-grid">{finance.assets.map(asset => <div key={asset.symbol}><span>{asset.symbol}</span><strong>{asset.holding.toFixed(4)}</strong><small>{money(Math.round(asset.holding * asset.priceCents))}</small></div>)}</div>
              <div className="trade-form"><Field label={t('finance.asset')}><GlassSelect ariaLabel={t('finance.asset')} value={tradeAsset} onValueChange={setTradeAsset} options={finance.assets.map(asset => ({ value: asset.symbol, label: `${asset.symbol} · ${asset.name}` }))} /></Field><Field label={t('finance.usdAmount')}><div className="money-input"><span>$</span><input type="number" min="1" placeholder="100" value={tradeAmount} onChange={event => setTradeAmount(event.target.value)} /></div></Field></div>
              <div className="finance-actions"><button className="finance-primary" disabled={Boolean(busy)} onClick={() => submitTrade('buy')}>{t('finance.buyAsset')}</button><button className="finance-secondary" disabled={Boolean(busy)} onClick={() => submitTrade('sell')}>{t('finance.sellValue')}</button></div>
            </Panel>
          </div>
        </div>
      )}

      {page === 'ledger' && (
        <Panel eyebrow={t('finance.history')} title={t('finance.authoritativeLedger')} icon="receipt">
          {finance.ledger.length ? <div className="finance-ledger">{finance.ledger.map(entry => <div className="ledger-row" key={entry.id}><span className={`ledger-icon ledger-${entry.type}`}><GameIcon name={ledgerIcon(entry.type)} size={17} /></span><div><b>{runtime(entry.title)}</b><small>{dateTime(entry.createdAt)} {entry.detail && `· ${runtime(entry.detail)}`}</small></div><strong className={entry.direction === 'in' ? 'amount-in' : 'amount-out'}>{entry.direction === 'in' ? '+' : '−'}{money(entry.amountCents)}</strong></div>)}</div> : <Empty icon="receipt" text={t('finance.firstTransaction')} />}
        </Panel>
      )}

      {dialog && (
        <div className="finance-dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setDialog(null)}>
          <div className="finance-dialog" role="dialog" aria-modal="true" aria-label={dialog.kind === 'info' ? runtime(dialog.title) : t('finance.action')}>
            <button className="dialog-close" aria-label={t('common.close')} onClick={() => setDialog(null)}><GameIcon name="x" size={17} /></button>
            {dialog.kind === 'info' ? <><span className="eyebrow">{t('finance.title')}</span><h2>{runtime(dialog.title)}</h2><p>{runtime(dialog.message)}</p></> : (
              <form onSubmit={submitDialog}>
                <span className="eyebrow">{dialog.kind === 'cash' ? t('finance.physicalCash') : t('finance.internalTransfer')}</span>
                <h2>{dialog.kind === 'cash' ? t(dialog.direction === 'deposit' ? 'finance.depositCash' : 'finance.withdrawCash') : t('finance.moveAccountFunds')}</h2>
                {dialog.kind === 'internal' && <Field label={t('finance.direction')}><GlassSelect ariaLabel={t('finance.direction')} value={internalDirection} onValueChange={setInternalDirection} options={[{ value: 'checking_to_savings', label: t('finance.checkingToSavings') }, { value: 'savings_to_checking', label: t('finance.savingsToChecking') }]} /></Field>}
                <Field label={t('finance.amount')}><div className="money-input"><span>$</span><input autoFocus type="number" min="1" placeholder="500" value={dialogAmount} onChange={event => setDialogAmount(event.target.value)} /></div></Field>
                <button className="finance-primary" disabled={Boolean(busy)}>{t('finance.confirmMovement')}<GameIcon name="arrow-left-right" size={15} /></button>
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

function AccountCard({ icon, eyebrow, title, amount, tone, money, children }: { icon: GameIconName; eyebrow: string; title: string; amount: number; tone: string; money: (cents: number, decimals?: boolean) => string; children: ReactNode }) {
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

function creditBand(score: number, t: (key: TranslationKey) => string) { return score >= 740 ? t('credit.excellent') : score >= 670 ? t('credit.good') : score >= 600 ? t('credit.fair') : t('credit.weak'); }
function humanizeError(reason: unknown, locale: 'bg' | 'en') {
  const code = reason instanceof Error ? reason.message : String(reason);
  const messages: Record<string, { en: string; bg: string }> = {
    physical_cash_unavailable_on_phone: { en: 'Physical cash operations require a bank branch or ATM.', bg: 'Операциите с пари в брой изискват банков клон или банкомат.' },
    insufficient_physical_cash: { en: 'Your wallet does not contain enough physical cash.', bg: 'В портфейла ти няма достатъчно пари в брой.' },
    insufficient_checking_balance: { en: 'Your checking balance is too low for this action.', bg: 'Наличността по разплащателната сметка не е достатъчна.' },
    insufficient_savings_balance: { en: 'Your savings balance is too low for this action.', bg: 'Наличността по спестовната сметка не е достатъчна.' },
    atm_cash_limit_exceeded: { en: 'The ATM cash limit is $2,000 per transaction.', bg: 'Лимитът на банкомата е $2 000 за транзакция.' },
    access_transfer_limit_exceeded: { en: 'This transfer exceeds the current access-point limit.', bg: 'Преводът надвишава лимита на текущата точка за достъп.' },
    bank_branch_required: { en: 'Loan applications require a Dorado National Bank branch.', bg: 'Кандидатстването за кредит изисква клон на Dorado National.' },
    active_personal_loan_exists: { en: 'You already have an active personal loan.', bg: 'Вече имаш активен личен кредит.' },
    personal_loan_score_too_low: { en: 'A score of at least 620 is required for this personal loan.', bg: 'За този личен кредит е необходим рейтинг поне 620.' },
    auto_finance_score_too_low: { en: 'Auto Finance currently requires a credit score of 680 or higher.', bg: 'Автомобилното финансиране изисква кредитен рейтинг поне 680.' },
    no_payment_due: { en: 'There is no active loan installment to pay.', bg: 'Няма активна кредитна вноска за плащане.' },
    phone_app_required: { en: 'DoradoX funding and trading require the Phone App access point.', bg: 'Захранването и търговията в DoradoX изискват достъп през телефона.' },
    exchange_cash_empty: { en: 'There is no exchange cash to withdraw.', bg: 'Няма средства за теглене от борсата.' },
    insufficient_exchange_cash: { en: 'Your DoradoX exchange cash is too low for this trade.', bg: 'Средствата в DoradoX не са достатъчни за тази сделка.' },
    insufficient_asset_holding: { en: 'Your holding is too small for this sale.', bg: 'Наличността от актива не е достатъчна за тази продажба.' }
  };
  return messages[code]?.[locale] ?? code.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
}
