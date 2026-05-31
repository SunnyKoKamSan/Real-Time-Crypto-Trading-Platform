# ADR 0005: The Platform Is Paper Trading Only

## Status

Accepted.

## Context

The project is for portfolio-quality engineering depth. Supporting real money would require custody,
external order routing, payments, regulatory controls, security reviews, and operational guarantees
that are outside scope.

## Decision

The platform supports paper trading only. It must not implement deposits, withdrawals, custody,
payment processing, external order routing, or financial compliance claims.

## Consequences

- UI copy must clearly say paper/demo mode where trading actions appear.
- Seed balances are demo balances.
- API and data models should avoid fields that imply real custody.
- README, docs, and screenshots must not imply production exchange readiness.
