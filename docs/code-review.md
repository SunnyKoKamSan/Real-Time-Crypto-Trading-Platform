# Code Review Checklist

## Scope And Honesty

- Does the change match the stated milestone?
- Are incomplete or simulated parts labeled clearly?
- Does UI copy avoid implying real-money trading?
- Are docs updated when behavior, commands, data model, or architecture changed?

## Trading Correctness

- Can the change create a negative cash or asset balance?
- Can an accepted order exist without reserves?
- Can a trade exist without ledger entries?
- Can a filled order remain open?
- Does cancellation release unused reserves?
- Is matching deterministic for the same input sequence?

## Transactions And Persistence

- Are critical writes inside explicit PostgreSQL transactions?
- Are durable business events written to the outbox in the same transaction?
- Are Redis and in-memory structures treated as derived state?
- Are repository boundaries clear and testable?

## API And Security

- Are external inputs validated?
- Do errors use the response envelope and correlation ID?
- Are auth failures safe and non-leaky?
- Are passwords, tokens, secrets, and private data excluded from logs?
- Are rate limits considered for auth, orders, and WebSocket connection paths?

## Observability

- Are structured logs useful without leaking sensitive data?
- Do new request-linked paths carry correlation IDs?
- Are metrics or trace spans planned for critical paths?
- Are async failures visible through retry or dead-letter diagnostics?

## Frontend And UX

- Are loading, empty, disabled, and error states clear?
- Can keyboard users reach and understand controls?
- Do text and controls fit at mobile and desktop widths?
- Is color paired with labels or icons instead of being the only signal?
- Does the UI preserve the paper-trading boundary?

## Tests

- Are unit tests close to deterministic domain logic?
- Are API behavior changes covered by integration tests?
- Are trading invariants tested at the right level?
- Do `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass?
