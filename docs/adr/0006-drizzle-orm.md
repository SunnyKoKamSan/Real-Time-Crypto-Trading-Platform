# ADR 0006: Use Drizzle For PostgreSQL Access

## Status

Accepted.

## Context

Week 2 starts migrations, repositories, and transaction utilities. The platform needs type-safe SQL,
clear transaction boundaries, and enough control to make trading invariants easy to inspect.

## Decision

Use Drizzle ORM with PostgreSQL.

## Consequences

- Week 2 will add Drizzle packages, schema definitions, migrations, and repository tests.
- Repository methods should expose explicit transaction-aware functions.
- SQL shape remains close to PostgreSQL, which helps reviewers audit correctness.
- Prisma is deferred unless Drizzle creates a concrete blocker.
