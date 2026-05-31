# Dashboard Page Overrides

Project: Real-Time Crypto Trading Platform
Page type: trading workspace and delivery status.

These rules override `design-system/real-time-crypto-trading-platform/MASTER.md` for the main app
dashboard.

## Priorities

- Show current implementation state before future ambitions.
- Keep market data, order entry, order book, foundation checks, and service status visible without
  hunting.
- Make incomplete trading actions visibly disabled and explain the invariant gate.
- Preserve reviewer trust by labeling fixture data.

## Components

- Market panel: symbol, fixture price, direction label, chart preview, and small metrics.
- Order entry: disabled until reserve, matching, and ledger settlement are implemented.
- Order book: side, price, size, total, and depth; color plus side text.
- Status rail: Week 1 progress and local service map.

## Responsive Rules

- Desktop: main workspace plus sticky status rail.
- Tablet: stacked modules with two-column metric groups where space allows.
- Mobile: one column, 44px minimum controls, no horizontal scroll.

## Do Not Use

- Hero-first landing sections.
- Neon/glitch/scanline effects.
- Decorative metric cards that do not map to real project state.
