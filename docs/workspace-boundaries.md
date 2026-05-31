# Workspace Boundaries

## Package Ownership

| Workspace          | Owns                                                          | Must not own                                      |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------- |
| `packages/domain`  | Domain schemas, enums, DTO contracts, invariant helpers       | HTTP, WebSocket, React, database clients, logging |
| `apps/api`         | Express routes, WebSocket gateway, request validation, logs   | React UI, browser-only state                      |
| `apps/web`         | React presentation, interaction state, browser API client code | Express handlers, database access, workers        |

## Allowed Dependency Direction

```text
apps/api  --> @rtctp/domain
apps/web  --> @rtctp/domain
packages/domain --> no internal workspace imports
```

There is no app-to-app dependency. `apps/api` and `apps/web` can consume only the public
`@rtctp/domain` export, never `packages/domain/src/*`.

## Enforcement

- npm workspaces declare the physical package map.
- `packages/domain/package.json` exposes only `dist/index.js` and `dist/index.d.ts`.
- `apps/api/tsconfig.json` and `apps/web/tsconfig.json` reference `../../packages/domain`.
- ESLint `no-restricted-imports` blocks app-to-app imports and direct domain source imports.
- `npm run test:boundaries` creates temporary illegal imports and expects lint failures.

## Testing Layout

| Test type              | Location                                      | Rule                                          |
| ---------------------- | --------------------------------------------- | --------------------------------------------- |
| Domain unit tests      | Adjacent to target modules in `packages/domain/src` | Pure execution; no Docker or network required |
| API integration tests  | `apps/api/test`                               | Use app factories and mocks, not live infra   |
| Web interaction tests  | Adjacent feature/component blocks in `apps/web/src` | Exercise presentation behavior in isolation   |

Future database and broker tests should be explicit integration jobs, not hidden dependencies of
unit tests.
