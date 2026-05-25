# Troubleshooting Runbook

## Port Already In Use

Check the process using the port:

```bash
lsof -i :4000
lsof -i :5173
```

Stop the old process or start the service on another port where supported.

## Docker Services Do Not Become Healthy

Inspect service status and logs:

```bash
docker compose ps
docker compose logs postgres
docker compose logs redis
docker compose logs redpanda
```

Common fixes:

- Confirm Docker Desktop is running.
- Free ports `5432`, `6379`, `9092`, `9090`, `3000`, and `16686`.
- Reset local volumes only when losing local data is acceptable: `docker compose down -v`.

## API Rejects Browser Requests

Confirm `WEB_ORIGIN` in `.env` matches the Vite URL. The default API CORS origin is:

```bash
WEB_ORIGIN=http://localhost:5173
```

The web dev server currently binds to `127.0.0.1`. If needed, update `WEB_ORIGIN` to match the exact
browser origin being used.

## TypeScript Cannot Resolve Workspace Packages

Reinstall from the repository root:

```bash
npm install
npm run typecheck
```

Workspace packages are expected to be installed through npm workspaces, not by running package-level
installs.

## Build Artifacts Appear In Git Status

Generated folders such as `dist`, `coverage`, `.vite`, and `node_modules` should stay ignored. If
tracked artifacts appear, remove them from the index rather than committing generated output.
