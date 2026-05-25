# API Contract

## Current Routes

| Method | Path               | Status               | Notes                                             |
| ------ | ------------------ | -------------------- | ------------------------------------------------- |
| `GET`  | `/health`          | Implemented          | Plain health response for probes.                 |
| `GET`  | `/api/symbols`     | Implemented          | Returns supported trading symbols.                |
| `GET`  | `/api/system/info` | Implemented          | Returns local prototype service metadata.         |
| `WS`   | `/ws`              | Implemented skeleton | Sends `system.connected` and echoes message size. |

## Planned REST Scope

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/symbols`
- `GET /api/market/:symbol/ticks`
- `GET /api/market/:symbol/candles`
- `GET /api/orderbook/:symbol`
- `POST /api/orders`
- `GET /api/orders`
- `DELETE /api/orders/:orderId`
- `GET /api/trades`
- `GET /api/portfolio`
- `GET /api/admin/audit-events`
- `GET /api/admin/health`

## Response Envelope

Health probes may return plain bodies. All `/api/*` JSON responses should use this envelope.

Success:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "correlationId": "request-or-generated-id",
    "timestamp": "2026-05-25T00:00:00.000Z"
  }
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "correlationId": "request-or-generated-id",
    "details": []
  }
}
```

## Error Codes

| Code               | HTTP status | Use                                       |
| ------------------ | ----------- | ----------------------------------------- |
| `VALIDATION_ERROR` | 400 or 422  | Request shape or field validation failed. |
| `AUTH_REQUIRED`    | 401         | Authentication is missing or expired.     |
| `FORBIDDEN`        | 403         | Authenticated user lacks permission.      |
| `NOT_FOUND`        | 404         | Route or resource does not exist.         |
| `INTERNAL_ERROR`   | 500         | Unexpected server failure.                |

## Correlation IDs

- Clients may send `x-correlation-id`.
- The API echoes `x-correlation-id` on responses.
- Logs, events, and future WebSocket messages should carry the same ID for request-linked work.

## Validation

External request payloads must be validated with Zod or an equivalent schema before business logic.
Validation errors should name the failing field and expected shape where safe.
