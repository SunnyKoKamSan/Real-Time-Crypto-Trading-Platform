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
| Matching engine     | Deterministic result and documented throughput |

Benchmark interpretation:

- Targets assume a warm local Docker stack on a developer laptop, not a shared CI runner.
- REST read benchmarks must name whether the path hits PostgreSQL, Redis, or an in-process cache.
- Market fanout timing starts when the normalized tick is accepted and ends when the browser client
  receives the WebSocket message.
- Any target miss must include a bottleneck note and a follow-up task.

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
