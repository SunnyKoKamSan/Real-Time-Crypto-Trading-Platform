# Benchmarks

## Status

No load or latency benchmark has been run yet. This file is the evidence log for future benchmark
work.

## Targets

Local laptop targets, not production guarantees:

| Path                | Target                                         |
| ------------------- | ---------------------------------------------- |
| REST read p95       | Under 20 ms for indexed local reads            |
| Order placement p95 | Under 300 ms under small local load            |
| Market tick fanout  | Under 50 ms from ingest to browser             |
| Parser plus enqueue | Under 2 ms per inbound market trade locally    |
| Matching engine     | Deterministic result and documented throughput |

Benchmark interpretation:

- Targets assume a warm local Docker stack on a developer laptop, not a shared CI runner.
- REST read benchmarks must name whether the path hits PostgreSQL, Redis, or an in-process cache.
- Market fanout timing starts when the normalized tick is accepted and ends when the browser client
  receives the WebSocket message.
- Parser plus enqueue timing covers JSON parse, provider classification, domain validation, and
  bounded queue insert. It excludes PostgreSQL, Redis, and candle aggregation worker time.
- Any target miss must include a bottleneck note and a follow-up task.

## Milestone 4 Notes

Milestone 4 added deterministic fixture replay and bounded queue behavior, but no dedicated timing
benchmark has been recorded yet. The current automated evidence is functional: parser, queue,
reconnect, candle aggregation, and DB-backed endpoint tests. Add a parser-plus-enqueue benchmark
before treating the 2 ms target as measured.

## Evidence Template

When a benchmark is added, record:

- Date.
- Machine profile.
- Git commit.
- Command.
- Dataset or traffic shape.
- Results.
- Bottlenecks.
- Follow-up tasks.
