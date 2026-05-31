# Design System Master

Project: Real-Time Crypto Trading Platform
Source: generated with `ui-ux-pro-max`, then adapted for the repository's product constraints.
Category: fintech, crypto, local-first developer portfolio, operational dashboard.

## Product Context

The product is a paper-trading platform for demo users, technical reviewers, and local developers.
The interface should communicate control, correctness, and system state. It must not look like a
real-money exchange, a speculative crypto casino, or a marketing landing page.

## Visual Direction

- Pattern: operational trading console.
- Mood: focused, serious, high-contrast, data-dense.
- Primary surface: dark console shell for low-glare chart and order-book reading.
- Accents: amber for paper/demo status, emerald for healthy or bid states, red for ask/risk states.
- Purple may be used sparingly for secondary accent only; it must not dominate the product.

## Color Tokens

| Role           | Hex       | Usage                                  |
| -------------- | --------- | -------------------------------------- |
| Ops background | `#0b1019` | App background                         |
| Panel          | `#111827` | Primary modules                        |
| Deep panel     | `#020617` | Tables, chart wells, inputs            |
| Border         | `#1e293b` | Panel and table boundaries             |
| Text           | `#f8fafc` | Primary text                           |
| Muted text     | `#cbd5e1` | Body and secondary labels              |
| Amber          | `#fcd34d` | Paper mode, docs, warnings             |
| Emerald        | `#34d399` | Healthy state, bids, positive movement |
| Red            | `#fca5a5` | Ask side, errors, risk                 |

## Typography

- Use a clear sans-serif stack that works without external network calls.
- Use tabular numerals for prices, quantities, latency, and ports.
- Avoid decorative "web3" display type for operational labels and data.
- Keep dashboard headings compact; reserve large type for the page title only.

## Layout

- First screen is the working dashboard shell, not a landing page.
- Use a two-column desktop layout: main trading workspace plus right-side status rail.
- Collapse to a single column on mobile without hiding trading, status, or docs cues.
- Use stable component dimensions for chart wells, order-book rows, controls, and counters.
- Keep cards shallow. Do not nest cards inside cards.

## Interaction

- All active controls need visible hover, focus, and keyboard states.
- Disabled controls must explain the blocked invariant or missing foundation.
- Do not make fake trading actions look enabled before reserves and ledger settlement exist.
- Respect `prefers-reduced-motion`.

## Chart And Data Guidance

- Use candlestick charts for real OHLC data once market ingestion lands.
- Use a small price-path preview only for fixture data and label it as a preview.
- Do not rely on green/red alone; pair color with side labels, signs, or text.
- Long future tables should be virtualized when they exceed roughly 100 visible rows.

## Anti-Patterns

- Do not use glitch effects, scanlines, neon casino styling, or animated hype.
- Do not imply real-money trading, custody, deposits, withdrawals, or external order routing.
- Do not present aspirational features as complete.
- Do not use low-contrast gray text on dark panels.
- Do not hide important operator state on mobile.
