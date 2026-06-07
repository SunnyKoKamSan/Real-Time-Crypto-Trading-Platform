import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  RadioTower,
  ShieldCheck,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import {
  loginRequestSchema,
  registerRequestSchema,
  SUPPORTED_SYMBOLS,
  type AssetBalance,
  type AuthUser,
  type OrderSide,
  type TradingSymbol,
} from '@rtctp/domain';
import { ApiClientError, loginAccount, logoutAccount, registerAccount } from './lib/api';
import { authReducer, initialAuthState } from './lib/auth-state';
import { formatLatency } from './lib/format';

const marketSnapshots: Record<
  TradingSymbol,
  {
    displayPrice: string;
    inputPrice: string;
    move: string;
    chartLabel: string;
    bookRows: Array<{
      side: 'ASK' | 'BID';
      price: string;
      size: string;
      total: string;
      depth: number;
    }>;
  }
> = {
  'BTC-USD': {
    displayPrice: '$68,398.10',
    inputPrice: '68398.10',
    move: '+1.42% preview',
    chartLabel: 'Preview price path chart for BTC-USD fixture data',
    bookRows: [
      { side: 'ASK', price: '68,420.20', size: '0.84', total: '$57,473', depth: 82 },
      { side: 'ASK', price: '68,411.50', size: '1.12', total: '$76,621', depth: 64 },
      { side: 'BID', price: '68,398.10', size: '0.59', total: '$40,355', depth: 48 },
      { side: 'BID', price: '68,390.00', size: '1.44', total: '$98,482', depth: 76 },
    ],
  },
  'ETH-USD': {
    displayPrice: '$3,742.60',
    inputPrice: '3742.60',
    move: '+0.87% preview',
    chartLabel: 'Preview price path chart for ETH-USD fixture data',
    bookRows: [
      { side: 'ASK', price: '3,746.10', size: '6.40', total: '$23,975', depth: 76 },
      { side: 'ASK', price: '3,744.80', size: '9.15', total: '$34,275', depth: 58 },
      { side: 'BID', price: '3,742.60', size: '4.22', total: '$15,794', depth: 46 },
      { side: 'BID', price: '3,741.20', size: '11.36', total: '$42,500', depth: 68 },
    ],
  },
};

const systemStatusItems = [
  { label: 'Architecture decisions', status: 'Documented', icon: <FileText /> },
  { label: 'Quality gates', status: 'CI aligned', icon: <CheckCircle2 /> },
  { label: 'API envelope', status: 'Correlation IDs', icon: <Activity /> },
  { label: 'Simulation boundary', status: 'Explicit', icon: <ShieldCheck /> },
] as const;

const chartPoints = '0,75 28,68 56,74 84,48 112,52 140,32 168,39 196,24 224,30 252,16 280,21';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

function formatCurrencyValue(value: number) {
  return Number.isFinite(value) ? currencyFormatter.format(value) : '$0.00';
}

export function App() {
  const [authState, dispatchAuth] = useReducer(authReducer, initialAuthState);

  async function handleAuthenticated(
    action: 'login' | 'register',
    input: { email: string; password: string; displayName?: string },
  ) {
    dispatchAuth({ type: 'submit' });

    try {
      const data =
        action === 'login'
          ? await loginAccount(loginRequestSchema.parse(input))
          : await registerAccount(
              registerRequestSchema.parse({
                email: input.email,
                password: input.password,
                displayName: input.displayName ?? '',
              }),
            );

      dispatchAuth({
        type: 'authenticated',
        user: data.user,
        balances: data.balances,
      });
    } catch (error) {
      dispatchAuth({
        type: 'error',
        message: publicAuthError(error),
      });
    }
  }

  async function handleLogout() {
    await logoutAccount();
    dispatchAuth({ type: 'logout' });
  }

  if (authState.status !== 'authenticated' || !authState.user) {
    return (
      <AuthScreen
        error={authState.error}
        isSubmitting={authState.status === 'submitting'}
        onSubmit={handleAuthenticated}
      />
    );
  }

  return (
    <DashboardShell balances={authState.balances} onLogout={handleLogout} user={authState.user} />
  );
}

function publicAuthError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'RATE_LIMITED') {
      return 'Too many attempts. Wait a moment and try again.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Authentication failed. Try again.';
}

function AuthScreen(props: {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (
    action: 'login' | 'register',
    input: { email: string; password: string; displayName?: string },
  ) => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo.alice@rtctp.local');
  const [displayName, setDisplayName] = useState('Demo Trader');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === 'register';

  return (
    <main className="min-h-screen bg-ops text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)] lg:px-8">
        <section className="space-y-5" aria-labelledby="auth-heading">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="amber" icon={<ShieldCheck />} label="Paper trading" />
            <StatusPill tone="green" icon={<LockKeyhole />} label="Session protected" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              Auth baseline
            </p>
            <h1
              id="auth-heading"
              className="mt-3 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl"
            >
              Real-Time Crypto Trading Platform
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Access the local paper-trading console with short-lived access tokens, protected
              refresh cookies, CSRF rotation, and ledger-derived demo balances.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={<ShieldCheck />} label="Refresh token" value="HTTP-only" />
            <MetricCard icon={<Wallet />} label="Demo USD" value="$100k" />
            <MetricCard icon={<RadioTower />} label="Rate limits" value="Redis" />
          </div>
        </section>

        <section
          className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console sm:p-5"
          aria-labelledby="auth-form-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Account
              </p>
              <h2 id="auth-form-heading" className="mt-2 text-xl font-black text-white">
                {isRegister ? 'Create access' : 'Sign in'}
              </h2>
            </div>
            {isRegister ? (
              <UserPlus className="h-5 w-5 text-amber-200" aria-hidden="true" />
            ) : (
              <LogIn className="h-5 w-5 text-amber-200" aria-hidden="true" />
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-md border border-slate-800 bg-slate-950 p-1">
            <button
              aria-pressed={!isRegister}
              className={`min-h-10 rounded text-sm font-black transition-colors ${
                !isRegister ? 'bg-amber-300 text-slate-950' : 'text-slate-400 hover:bg-slate-900'
              }`}
              onClick={() => setMode('login')}
              type="button"
            >
              Sign in
            </button>
            <button
              aria-pressed={isRegister}
              className={`min-h-10 rounded text-sm font-black transition-colors ${
                isRegister ? 'bg-amber-300 text-slate-950' : 'text-slate-400 hover:bg-slate-900'
              }`}
              onClick={() => setMode('register')}
              type="button"
            >
              Register
            </button>
          </div>

          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void props.onSubmit(mode, { email, password, displayName });
            }}
          >
            {isRegister ? (
              <label className="grid gap-2 text-sm font-semibold text-slate-300">
                Display name
                <input
                  className="min-h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-base font-semibold text-white outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                  maxLength={120}
                  onChange={(event) => setDisplayName(event.target.value)}
                  value={displayName}
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-semibold text-slate-300">
              Email
              <input
                autoComplete="email"
                className="min-h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-base font-semibold text-white outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-300">
              Password
              <span className="relative block">
                <input
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className="min-h-11 w-full rounded-md border border-slate-800 bg-slate-950 px-3 pr-12 text-base font-semibold text-white outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            {props.error ? (
              <div className="flex gap-3 rounded-md border border-red-300/30 bg-red-300/10 p-3 text-sm font-semibold text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{props.error}</span>
              </div>
            ) : null}

            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-amber-300/40 bg-amber-300 px-4 text-sm font-black text-slate-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
              disabled={props.isSubmitting}
              type="submit"
            >
              {props.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : isRegister ? (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function DashboardShell(props: {
  user: AuthUser;
  balances: AssetBalance[];
  onLogout: () => Promise<void>;
}) {
  const [selectedSymbol, setSelectedSymbol] = useState<TradingSymbol>(SUPPORTED_SYMBOLS[0]);

  return (
    <main className="min-h-screen bg-ops text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="space-y-5" aria-label="Trading workspace">
          <header className="rounded-lg border border-slate-800 bg-panel/95 px-4 py-4 shadow-console sm:px-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="amber" icon={<ShieldCheck />} label="Preview only" />
                  <StatusPill tone="green" icon={<RadioTower />} label="Authenticated" />
                </div>
                <h1 className="mt-4 text-2xl font-black leading-tight text-white sm:text-4xl">
                  Real-Time Crypto Trading Platform
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Local-first trading console preview with fixture market data, clear system state,
                  and simulated order review before backend placement is connected.
                </p>
              </div>

              <div className="grid gap-3 sm:min-w-56">
                <label className="grid gap-2 text-sm font-semibold text-slate-300">
                  Symbol
                  <select
                    className="min-h-11 cursor-pointer rounded-md border border-slate-700 bg-slate-950 px-3 text-base font-bold text-white outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                    onChange={(event) => setSelectedSymbol(event.target.value as TradingSymbol)}
                    value={selectedSymbol}
                  >
                    {SUPPORTED_SYMBOLS.map((symbol) => (
                      <option key={symbol}>{symbol}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-black text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"
                  onClick={() => {
                    void props.onLogout();
                  }}
                  type="button"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <MarketPanel symbol={selectedSymbol} />
            <OrderEntryPanel symbol={selectedSymbol} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
            <OrderBookPanel symbol={selectedSymbol} />
            <ReadinessPanel />
          </section>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start" aria-label="Workspace status">
          <AccountPanel balances={props.balances} user={props.user} />
          <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                  System status
                </p>
                <h2 className="mt-2 text-xl font-black text-white">Workspace status</h2>
              </div>
              <Clock3 className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>

            <div className="mt-4 space-y-3">
              {systemStatusItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-300/10 text-amber-200 [&>svg]:h-5 [&>svg]:w-5">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{item.label}</p>
                      <p className="text-xs font-semibold text-slate-400">{item.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console">
            <h2 className="text-base font-black text-white">Service map</h2>
            <div className="mt-4 grid gap-3">
              <ServiceRow label="API" value=":4000" />
              <ServiceRow label="Web" value=":5173" />
              <ServiceRow label="Postgres" value=":5432" />
              <ServiceRow label="Redis" value=":6379" />
              <ServiceRow label="Redpanda" value=":9092" />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function AccountPanel(props: { user: AuthUser; balances: AssetBalance[] }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            Active session
          </p>
          <h2 className="mt-2 text-xl font-black text-white">{props.user.displayName}</h2>
          <p className="mt-1 break-all text-xs font-semibold text-slate-400">{props.user.email}</p>
        </div>
        <LockKeyhole className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-3">
        {props.balances.map((balance) => (
          <div
            className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0"
            key={balance.asset}
          >
            <span className="text-sm font-semibold text-slate-300">{balance.asset}</span>
            <span className="font-mono text-sm font-black tabular-nums text-white">
              {balance.balance}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MarketPanel({ symbol }: { symbol: TradingSymbol }) {
  const snapshot = marketSnapshots[symbol];

  return (
    <section
      className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console"
      aria-labelledby="market-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Fixture market
          </p>
          <h2 id="market-heading" className="mt-2 text-xl font-black text-white">
            {symbol}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums text-white">{snapshot.displayPrice}</p>
          <p className="mt-1 inline-flex items-center justify-end gap-1 text-sm font-bold text-emerald-300">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            {snapshot.move}
          </p>
        </div>
      </div>

      <div
        className="mt-5 h-56 rounded-md border border-slate-800 bg-slate-950 p-4"
        role="img"
        aria-label={snapshot.chartLabel}
      >
        <svg viewBox="0 0 280 96" className="h-full w-full" preserveAspectRatio="none">
          <path d="M0 18H280 M0 42H280 M0 66H280 M0 90H280" stroke="#1E293B" strokeWidth="1" />
          <path
            d={`M${chartPoints}`}
            fill="none"
            stroke="#34D399"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path d={`M${chartPoints} L280 96 L0 96 Z`} fill="rgba(52, 211, 153, 0.13)" />
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard icon={<Activity />} label="API target p95" value={formatLatency(200)} />
        <MetricCard icon={<BarChart3 />} label="Symbols" value={String(SUPPORTED_SYMBOLS.length)} />
        <MetricCard icon={<Database />} label="System of record" value="Postgres" />
      </div>
    </section>
  );
}

function OrderEntryPanel({ symbol }: { symbol: TradingSymbol }) {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [price, setPrice] = useState(marketSnapshots[symbol].inputPrice);
  const [quantity, setQuantity] = useState('0.10');
  const [hasPreview, setHasPreview] = useState(false);

  useEffect(() => {
    setPrice(marketSnapshots[symbol].inputPrice);
    setHasPreview(false);
  }, [symbol]);

  const notional = useMemo(() => {
    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);

    if (
      !Number.isFinite(numericPrice) ||
      !Number.isFinite(numericQuantity) ||
      numericPrice <= 0 ||
      numericQuantity <= 0
    ) {
      return 0;
    }

    return numericPrice * numericQuantity;
  }, [price, quantity]);

  const canPreview = notional > 0;

  function resetTicket() {
    setSide('BUY');
    setPrice(marketSnapshots[symbol].inputPrice);
    setQuantity('0.10');
    setHasPreview(false);
  }

  return (
    <section
      className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console"
      aria-labelledby="order-entry-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Order entry
          </p>
          <h2 id="order-entry-heading" className="mt-2 text-xl font-black text-white">
            Order ticket
          </h2>
        </div>
        <StatusPill tone="amber" icon={<Clock3 />} label="Local simulation" />
      </div>

      <form
        className="mt-5 grid gap-4"
        aria-describedby="order-entry-note"
        onSubmit={(event) => {
          event.preventDefault();
          if (canPreview) {
            setHasPreview(true);
          }
        }}
      >
        <SegmentedControl side={side} onSideChange={setSide} />
        <label className="grid gap-2 text-sm font-semibold text-slate-300">
          Limit price
          <input
            className="min-h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-base font-semibold tabular-nums text-white outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
            inputMode="decimal"
            min="0"
            onChange={(event) => setPrice(event.target.value)}
            step="0.01"
            type="number"
            value={price}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-300">
          Quantity
          <input
            className="min-h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-base font-semibold tabular-nums text-white outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
            inputMode="decimal"
            min="0"
            onChange={(event) => setQuantity(event.target.value)}
            step="0.0001"
            type="number"
            value={quantity}
          />
        </label>

        <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-300">Estimated notional</span>
            <span className="text-base font-black tabular-nums text-white">
              {formatCurrencyValue(notional)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <button
            className="min-h-11 rounded-md border border-amber-300/40 bg-amber-300 px-4 text-sm font-black text-slate-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            disabled={!canPreview}
            type="submit"
          >
            Preview order
          </button>
          {hasPreview ? (
            <button
              className="min-h-11 rounded-md border border-slate-700 px-4 text-sm font-black text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"
              onClick={resetTicket}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <p id="order-entry-note" className="mt-4 text-sm leading-6 text-slate-400">
        This ticket previews local UI state only. Backend order placement, reserves, matching, and
        ledger settlement are not connected yet.
      </p>

      {hasPreview ? (
        <div
          className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 p-3"
          aria-live="polite"
        >
          <p className="text-sm font-black text-amber-100">Order preview</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-400">Side</dt>
            <dd
              className={
                side === 'BUY'
                  ? 'text-right font-black text-emerald-200'
                  : 'text-right font-black text-red-200'
              }
            >
              {side === 'BUY' ? 'Buy' : 'Sell'}
            </dd>
            <dt className="text-slate-400">Symbol</dt>
            <dd className="text-right font-bold text-white">{symbol}</dd>
            <dt className="text-slate-400">Quantity</dt>
            <dd className="text-right font-bold tabular-nums text-white">{quantity}</dd>
            <dt className="text-slate-400">Limit price</dt>
            <dd className="text-right font-bold tabular-nums text-white">
              {formatCurrencyValue(Number(price))}
            </dd>
            <dt className="text-slate-400">Notional</dt>
            <dd className="text-right font-black tabular-nums text-white">
              {formatCurrencyValue(notional)}
            </dd>
          </dl>
          <p className="mt-3 text-xs font-semibold leading-5 text-amber-100/80">
            Preview created in the browser. No order request is sent to the API.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function OrderBookPanel({ symbol }: { symbol: TradingSymbol }) {
  const rows = marketSnapshots[symbol].bookRows;

  return (
    <section
      className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console"
      aria-labelledby="order-book-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Fixture depth
          </p>
          <h2 id="order-book-heading" className="mt-2 text-xl font-black text-white">
            Order book
          </h2>
        </div>
        <StatusPill tone="green" icon={<RadioTower />} label="Realtime shell" />
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-800">
        <div className="grid grid-cols-[52px_minmax(72px,1fr)_minmax(54px,0.8fr)_minmax(70px,1fr)] bg-slate-950 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          <span>Side</span>
          <span className="text-right">Price</span>
          <span className="text-right">Size</span>
          <span className="text-right">Total</span>
        </div>
        {rows.map((row) => (
          <div
            key={`${row.side}-${row.price}`}
            className="relative grid grid-cols-[52px_minmax(72px,1fr)_minmax(54px,0.8fr)_minmax(70px,1fr)] border-t border-slate-800 px-3 py-3 text-sm"
          >
            <span
              className={`absolute inset-y-1 right-0 rounded-l ${
                row.side === 'BID' ? 'bg-emerald-400/10' : 'bg-red-400/10'
              }`}
              style={{ width: `${row.depth}%` }}
              aria-hidden="true"
            />
            <span
              className={
                row.side === 'BID'
                  ? 'relative font-black text-emerald-300'
                  : 'relative font-black text-red-300'
              }
            >
              {row.side}
            </span>
            <span className="relative text-right tabular-nums text-white">{row.price}</span>
            <span className="relative text-right tabular-nums text-slate-300">{row.size}</span>
            <span className="relative text-right tabular-nums text-slate-300">{row.total}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadinessPanel() {
  return (
    <section
      className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console"
      aria-labelledby="readiness-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Review baseline
          </p>
          <h2 id="readiness-heading" className="mt-2 text-xl font-black text-white">
            System checks
          </h2>
        </div>
        <StatusPill tone="green" icon={<CheckCircle2 />} label="CI commands" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CheckItem label="Architecture docs" value="ADRs + boundaries" />
        <CheckItem label="Local runbook" value="Commands + failures" />
        <CheckItem label="API standard" value="Envelope + errors" />
        <CheckItem label="Backlog" value="Issue-sized tasks" />
      </div>
    </section>
  );
}

function SegmentedControl(props: { side: OrderSide; onSideChange: (side: OrderSide) => void }) {
  const options: Array<{ side: OrderSide; label: string }> = [
    { side: 'BUY', label: 'Buy' },
    { side: 'SELL', label: 'Sell' },
  ];

  return (
    <div
      className="grid grid-cols-2 rounded-md border border-slate-800 bg-slate-950 p-1"
      aria-label="Order side preview"
    >
      {options.map((option) => {
        const isSelected = props.side === option.side;
        const selectedClass =
          option.side === 'BUY'
            ? 'bg-emerald-300/15 text-emerald-100 ring-1 ring-emerald-300/35'
            : 'bg-red-300/15 text-red-100 ring-1 ring-red-300/35';

        return (
          <button
            aria-pressed={isSelected}
            className={`min-h-10 rounded text-sm font-black transition-colors hover:bg-slate-800 ${
              isSelected ? selectedClass : 'text-slate-400'
            }`}
            key={option.side}
            onClick={() => props.onSideChange(option.side)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricCard(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-amber-200 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
          {props.icon}
        </span>
        <span className="text-sm font-black text-white">{props.value}</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-400">{props.label}</p>
    </div>
  );
}

function CheckItem(props: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-sm font-bold text-white">{props.label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{props.value}</p>
    </div>
  );
}

function ServiceRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm font-semibold text-slate-300">{props.label}</span>
      <span className="font-mono text-xs font-bold text-amber-200">{props.value}</span>
    </div>
  );
}

function StatusPill(props: { tone: 'amber' | 'green'; icon: ReactNode; label: string }) {
  const toneClass =
    props.tone === 'green'
      ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200'
      : 'border-amber-300/30 bg-amber-300/10 text-amber-200';

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-black uppercase tracking-[0.12em] ${toneClass}`}
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
        {props.icon}
      </span>
      {props.label}
    </span>
  );
}
