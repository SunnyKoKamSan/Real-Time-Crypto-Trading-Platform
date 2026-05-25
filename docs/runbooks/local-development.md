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
| Prometheus         | `http://localhost:9090`  |
| Grafana            | `http://localhost:3000`  |
| Jaeger             | `http://localhost:16686` |

Grafana local credentials are `admin` / `admin`.

## Start The App

Use separate terminals:

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
```

`/health` returns a plain health body for probes. `/api/*` routes return the standard API envelope.

## Quality Gates

Run these before treating a milestone as complete:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The GitHub Actions workflow runs the same four commands after `npm ci`.

## Stop Local Infrastructure

```bash
docker compose down
```

To remove local database and Grafana volumes:

```bash
docker compose down -v
```
