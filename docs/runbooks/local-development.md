# Local Development Runbook

## Required Tools

- Node.js 20.19 or newer.
- npm.
- Docker Desktop or a compatible Docker engine.
- Git.

## First Setup

```bash
npm install
cp .env.example .env
```

## Start Local Infrastructure

```bash
docker compose up -d
docker compose ps
```

The compose stack exposes:

| Service            | URL or port              |
| ------------------ | ------------------------ |
| PostgreSQL         | `localhost:5432`         |
| Redis              | `localhost:6379`         |
| Redpanda Kafka API | `localhost:9092`         |
| Redpanda Admin API | `http://localhost:9644`  |
| Prometheus         | `http://localhost:9090`  |
| Grafana            | `http://localhost:3000`  |
| Jaeger             | `http://localhost:16686` |
| OTLP HTTP          | `http://localhost:4318`  |
| OTLP gRPC          | `localhost:4317`         |

Grafana local credentials are `admin` / `admin`.

## Start The App

Preferred one-command startup:

```bash
npm run dev
```

The root `dev` script starts Docker Compose infrastructure, then runs the API and web dev servers in
one process group. Stop it with `Ctrl+C`. Use separate terminals only when debugging one service at a
time:

```bash
npm run dev:api
npm run dev:web
```

Current local URLs:

- API: `http://localhost:4000`
- Web: `http://127.0.0.1:5173`
- WebSocket: `ws://localhost:4000/ws`

## Smoke Checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/symbols
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health
curl http://localhost:16686/
curl http://localhost:9644/v1/status/ready
```

All backend JSON responses return the standard API envelope.

## Quality Gates

Run these before treating a milestone as complete:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The GitHub Actions workflow runs the same four commands after `npm ci`. `npm run test` also runs
`npm run test:boundaries`, which creates temporary illegal imports and verifies that ESLint blocks
the workspace boundary violations.

## Stop Local Infrastructure

```bash
docker compose down
```

To remove local database and Grafana volumes:

```bash
docker compose down -v
```
