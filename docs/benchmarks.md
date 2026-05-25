# Benchmarks

## Status

No load or latency benchmark has been run yet. This file is the evidence log for future benchmark
work.

## Targets

Local laptop targets, not production guarantees:

| Path                | Target                                         |
| ------------------- | ---------------------------------------------- |
| REST read p95       | Under 200 ms                                   |
| Order placement p95 | Under 300 ms under small local load            |
| Market tick fanout  | Under 250 ms from ingest to browser            |
| Matching engine     | Deterministic result and documented throughput |

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
