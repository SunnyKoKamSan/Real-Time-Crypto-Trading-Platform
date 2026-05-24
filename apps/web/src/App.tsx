import { Activity, BarChart3, RadioTower, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { SUPPORTED_SYMBOLS } from '@rtctp/domain';
import { formatLatency } from './lib/format';

const orderBookRows = [
  { side: 'ask', price: '68,420.20', size: '0.84' },
  { side: 'ask', price: '68,411.50', size: '1.12' },
  { side: 'bid', price: '68,398.10', size: '0.59' },
  { side: 'bid', price: '68,390.00', size: '1.44' },
] as const;

const milestones = [
  'Live Coinbase/Binance market data ingestion',
  'Price-time-priority matching engine',
  'PostgreSQL ledger and Redis fanout',
  'OpenTelemetry traces and k6 benchmarks',
] as const;

export function App() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
        <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">
                Paper exchange prototype
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                Real-Time Crypto Trading Platform
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-white/60 px-4 py-2 text-sm font-semibold">
              <RadioTower className="h-4 w-4 text-mint" aria-hidden="true" />
              Live-data ready
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3" aria-label="System readiness metrics">
            <MetricCard icon={<Activity />} label="API target p95" value={formatLatency(200)} />
            <MetricCard icon={<BarChart3 />} label="Tracked symbols" value={String(SUPPORTED_SYMBOLS.length)} />
            <MetricCard icon={<ShieldCheck />} label="Trading mode" value="Paper" />
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Order book skeleton</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  The initial commit wires the workspace, checks, API health, and WebSocket gateway.
                </p>
              </div>
              <select
                className="rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold"
                aria-label="Trading symbol"
                defaultValue={SUPPORTED_SYMBOLS[0]}
              >
                {SUPPORTED_SYMBOLS.map((symbol) => (
                  <option key={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 overflow-hidden rounded-md border border-line">
              <div className="grid grid-cols-3 bg-ink px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-paper">
                <span>Side</span>
                <span className="text-right">Price</span>
                <span className="text-right">Size</span>
              </div>
              {orderBookRows.map((row) => (
                <div
                  key={`${row.side}-${row.price}`}
                  className="grid grid-cols-3 border-t border-line px-4 py-3 text-sm"
                >
                  <span
                    className={row.side === 'bid' ? 'font-bold text-mint' : 'font-bold text-copper'}
                  >
                    {row.side.toUpperCase()}
                  </span>
                  <span className="text-right tabular-nums">{row.price}</span>
                  <span className="text-right tabular-nums">{row.size}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 rounded-lg border border-line bg-ink p-5 text-paper shadow-panel lg:self-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e3b17f]">
              Build path
            </p>
            <h2 className="mt-2 text-2xl font-black">Initial commit scope</h2>
          </div>
          <div className="space-y-3">
            {milestones.map((item, index) => (
              <div key={item} className="flex gap-3 border-t border-white/15 pt-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-black text-ink">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-paper/80">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function MetricCard(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <div className="text-copper [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">
          {props.icon}
        </div>
        <span className="text-2xl font-black">{props.value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-neutral-600">{props.label}</p>
    </div>
  );
}
