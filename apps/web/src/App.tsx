import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  RadioTower,
  ShieldCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { SUPPORTED_SYMBOLS } from '@rtctp/domain';
import { formatLatency } from './lib/format';

const orderBookRows = [
  { side: 'ASK', price: '68,420.20', size: '0.84', total: '$57,473', depth: 82 },
  { side: 'ASK', price: '68,411.50', size: '1.12', total: '$76,621', depth: 64 },
  { side: 'BID', price: '68,398.10', size: '0.59', total: '$40,355', depth: 48 },
  { side: 'BID', price: '68,390.00', size: '1.44', total: '$98,482', depth: 76 },
] as const;

const weekOneItems = [
  { label: 'Architecture decisions', status: 'Documented', icon: <FileText /> },
  { label: 'Quality gates', status: 'CI aligned', icon: <CheckCircle2 /> },
  { label: 'API envelope', status: 'Correlation IDs', icon: <Activity /> },
  { label: 'Paper-only boundary', status: 'Explicit', icon: <ShieldCheck /> },
] as const;

const chartPoints = '0,75 28,68 56,74 84,48 112,52 140,32 168,39 196,24 224,30 252,16 280,21';

export function App() {
  return (
    <main className="min-h-screen bg-ops text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="space-y-5" aria-label="Trading workspace">
          <header className="rounded-lg border border-slate-800 bg-panel/95 px-4 py-4 shadow-console sm:px-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="amber" icon={<ShieldCheck />} label="Paper only" />
                  <StatusPill tone="green" icon={<RadioTower />} label="Week 1 foundation" />
                </div>
                <h1 className="mt-4 text-2xl font-black leading-tight text-white sm:text-4xl">
                  Real-Time Crypto Trading Platform
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Local-first trading workspace with documented architecture, CI gates, and a
                  foundation for live market data, matching, ledger, and realtime updates.
                </p>
              </div>

              <label className="grid min-w-44 gap-2 text-sm font-semibold text-slate-300">
                Symbol
                <select
                  className="min-h-11 cursor-pointer rounded-md border border-slate-700 bg-slate-950 px-3 text-base font-bold text-white outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                  defaultValue={SUPPORTED_SYMBOLS[0]}
                >
                  {SUPPORTED_SYMBOLS.map((symbol) => (
                    <option key={symbol}>{symbol}</option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <MarketPanel />
            <OrderEntryPanel />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
            <OrderBookPanel />
            <ReadinessPanel />
          </section>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start" aria-label="Week 1 status">
          <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-console">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                  Delivery lane
                </p>
                <h2 className="mt-2 text-xl font-black text-white">Week 1 progress</h2>
              </div>
              <Clock3 className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>

            <div className="mt-4 space-y-3">
              {weekOneItems.map((item) => (
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

function MarketPanel() {
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
            BTC-USD
          </h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums text-white">$68,398.10</p>
          <p className="mt-1 inline-flex items-center justify-end gap-1 text-sm font-bold text-emerald-300">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            +1.42% preview
          </p>
        </div>
      </div>

      <div
        className="mt-5 h-56 rounded-md border border-slate-800 bg-slate-950 p-4"
        role="img"
        aria-label="Preview price path chart for BTC-USD fixture data"
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

function OrderEntryPanel() {
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
            Locked by invariants
          </h2>
        </div>
        <StatusPill tone="amber" icon={<Clock3 />} label="Week 7" />
      </div>

      <form className="mt-5 grid gap-4" aria-describedby="order-entry-note">
        <SegmentedControl />
        <label className="grid gap-2 text-sm font-semibold text-slate-300">
          Limit price
          <input
            className="min-h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-base text-slate-500"
            disabled
            value="68400.00"
            readOnly
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-300">
          Quantity
          <input
            className="min-h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-base text-slate-500"
            disabled
            value="0.10"
            readOnly
          />
        </label>
        <button
          className="min-h-11 rounded-md border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-500"
          disabled
          type="button"
        >
          Reserve ledger required
        </button>
      </form>

      <p id="order-entry-note" className="mt-4 text-sm leading-6 text-slate-400">
        Order placement stays disabled until reserves, matching, and append-only ledger settlement
        are implemented and tested.
      </p>
    </section>
  );
}

function OrderBookPanel() {
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
        <StatusPill tone="green" icon={<RadioTower />} label="WS skeleton" />
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-800">
        <div className="grid grid-cols-[64px_1fr_1fr_1fr] bg-slate-950 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          <span>Side</span>
          <span className="text-right">Price</span>
          <span className="text-right">Size</span>
          <span className="text-right">Total</span>
        </div>
        {orderBookRows.map((row) => (
          <div
            key={`${row.side}-${row.price}`}
            className="relative grid grid-cols-[64px_1fr_1fr_1fr] border-t border-slate-800 px-3 py-3 text-sm"
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
            Foundation checks
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

function SegmentedControl() {
  return (
    <div
      className="grid grid-cols-2 rounded-md border border-slate-800 bg-slate-950 p-1"
      aria-label="Order side preview"
    >
      <button
        className="min-h-10 rounded bg-emerald-300/10 text-sm font-black text-emerald-200"
        disabled
        type="button"
      >
        Buy
      </button>
      <button className="min-h-10 rounded text-sm font-black text-slate-500" disabled type="button">
        Sell
      </button>
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
