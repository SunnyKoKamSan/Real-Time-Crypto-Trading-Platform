# API Contract

## Current Routes

| Method | Path                 | Status               | Notes                                                           |
| ------ | -------------------- | -------------------- | --------------------------------------------------------------- |
| `GET`  | `/health`            | Implemented          | Standard envelope health response for probes.                   |
| `POST` | `/api/auth/register` | Implemented          | Creates user, session, demo balances, and auth cookies.         |
| `POST` | `/api/auth/login`    | Implemented          | Creates a new refresh-token family.                             |
| `POST` | `/api/auth/refresh`  | Implemented          | Requires refresh cookie plus CSRF header and rotates session.   |
| `POST` | `/api/auth/logout`   | Implemented          | Revokes refresh session idempotently and clears cookie.         |
| `GET`  | `/api/me`            | Implemented          | Requires bearer access token and returns safe profile/balances. |
| `GET`  | `/api/symbols`       | Implemented          | Returns supported trading symbols.                              |
| `GET`  | `/api/system/info`   | Implemented          | Returns local prototype service metadata.                       |
| `WS`   | `/ws`                | Implemented skeleton | Sends `system.connected` and echoes message size.               |

## Planned REST Scope

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

Every backend JSON response uses this envelope, including `/health`.

Success:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "correlationId": "request-or-generated-id",
    "timestamp": "2026-05-25T00:00:00.000000000Z"
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
  },
  "meta": {
    "correlationId": "request-or-generated-id",
    "timestamp": "2026-05-25T00:00:00.000000000Z"
  }
}
```

Financial values in API payloads are decimal strings, not JSON numbers.

`meta.timestamp` is an immutable UTC ISO-8601 string with exactly nine fractional digits. The API
calculates it from `process.hrtime.bigint()` plus a process boot wall-clock anchor so downstream
analysis can compare request timing at nanosecond precision without relying on JavaScript
millisecond `Date` formatting.

Rate-limited endpoints must include these headers on success and error responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1717191000
```

`X-RateLimit-Reset` is a Unix timestamp in seconds. When a request is rejected by rate limiting, the
API returns `429` with the normal error envelope and may include `Retry-After`.

## Authentication

The auth model uses short-lived bearer access tokens and HTTP-only refresh-token cookies.

- Access tokens are returned in JSON and held in frontend memory.
- Refresh tokens are sent only as the `rtctp_refresh` HTTP-only cookie scoped to `/api/auth`.
- The API returns a CSRF token in auth responses as `data.auth.session.csrfToken`.
- Clients must send the CSRF token in `x-csrf-token` on `POST /api/auth/refresh` and
  `POST /api/auth/logout`.
- Refresh rotates the refresh token and CSRF token. Reusing an old known refresh token is treated as
  replay, audited, and revokes the token family.

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "email": "demo@example.local",
  "displayName": "Demo Trader",
  "password": "LongEnoughPassword!2026"
}
```

Success sets the refresh cookie and returns:

```json
{
  "user": {
    "id": "uuid",
    "email": "demo@example.local",
    "displayName": "Demo Trader",
    "role": "USER",
    "createdAt": "2026-06-06T00:00:00.000Z"
  },
  "balances": [
    { "asset": "BTC", "balance": "1.00000000" },
    { "asset": "ETH", "balance": "10.00000000" },
    { "asset": "USD", "balance": "100000.00000000" }
  ],
  "auth": {
    "accessToken": "jwt",
    "accessTokenExpiresAt": "2026-06-06T00:15:00.000Z",
    "session": {
      "expiresAt": "2026-06-13T00:00:00.000Z",
      "csrfToken": "opaque-token"
    }
  }
}
```

Duplicate registration returns a safe `409 VALIDATION_ERROR` without password or token details.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "demo.alice@rtctp.local",
  "password": "LocalDemoPassword!2026"
}
```

Unknown email and wrong password both return:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Invalid email or password.",
    "correlationId": "request-or-generated-id"
  },
  "meta": {
    "correlationId": "request-or-generated-id",
    "timestamp": "2026-06-06T00:00:00.000000000Z"
  }
}
```

### Refresh

```http
POST /api/auth/refresh
Cookie: rtctp_refresh=...
x-csrf-token: ...
```

Returns a new access token, CSRF token, and rotated refresh cookie. The request body is empty.

### Logout

```http
POST /api/auth/logout
Cookie: rtctp_refresh=...
x-csrf-token: ...
```

Returns `{ "loggedOut": true }` and clears the refresh cookie. The endpoint is idempotent.

### Current User

```http
GET /api/me
Authorization: Bearer <access-token>
```

Returns the safe user profile and ledger-derived balances.

## Pagination

High-volume list endpoints must use cursor-based pagination. Offset pagination is not allowed for
mutable or append-heavy datasets because query cost grows with depth and results can shift while the
client pages.

Request shape:

```http
GET /api/market/BTC-USD/ticks?limit=100&cursor=opaque-cursor
```

Response metadata:

```json
{
  "ok": true,
  "data": [],
  "meta": {
    "correlationId": "request-or-generated-id",
    "timestamp": "2026-05-25T00:00:00.000000000Z",
    "page": {
      "limit": 100,
      "nextCursor": "opaque-cursor-or-null"
    }
  }
}
```

Pagination rules:

- Default `limit` is `50`; maximum `limit` is `500` unless the endpoint documents a smaller cap.
- Cursors are opaque, URL-safe, and encode the stable sort tuple, not a raw page number.
- Sorts must include a deterministic tiebreaker, usually `(created_at, id)` or `(timestamp, id)`.
- Initial cursor-paginated endpoints: `GET /api/market/:symbol/ticks`,
  `GET /api/market/:symbol/candles`, `GET /api/orders`, `GET /api/trades`, and
  `GET /api/admin/audit-events`.

## Order Request Schema

`POST /api/orders` uses a discriminated Zod union. The API accepts decimal strings and rejects
JavaScript numbers for financial fields.

Limit order:

```ts
const limitOrderSchema = z.object({
  symbol: z.enum(['BTC-USD', 'ETH-USD']),
  side: z.enum(['buy', 'sell']),
  type: z.literal('limit'),
  quantity: decimalStringSchema,
  price: decimalStringSchema,
  clientOrderId: z.string().uuid().optional(),
});
```

Market order:

```ts
const marketOrderSchema = z.object({
  symbol: z.enum(['BTC-USD', 'ETH-USD']),
  side: z.enum(['buy', 'sell']),
  type: z.literal('market'),
  quantity: decimalStringSchema,
  clientOrderId: z.string().uuid().optional(),
});
```

Schema rules:

- `decimalStringSchema` accepts positive base-10 strings with at most 8 fractional digits.
- Limit orders require `price`; market orders must not include `price`.
- `clientOrderId` is optional but, when provided, must be unique per user for idempotent retries.
- The server calculates reserve requirements; clients cannot submit reserve or fee fields.

## Error Codes

| Code               | HTTP status | Use                                       |
| ------------------ | ----------- | ----------------------------------------- |
| `VALIDATION_ERROR` | 400 or 422  | Request shape or field validation failed. |
| `AUTH_REQUIRED`    | 401         | Authentication is missing or expired.     |
| `FORBIDDEN`        | 403         | Authenticated user lacks permission.      |
| `NOT_FOUND`        | 404         | Route or resource does not exist.         |
| `RATE_LIMITED`     | 429         | Request exceeded a configured rate limit. |
| `INTERNAL_ERROR`   | 500         | Unexpected server failure.                |

## Correlation IDs

- Clients may send `x-correlation-id`.
- The API echoes `x-correlation-id` on responses.
- Logs, events, and future WebSocket messages should carry the same ID for request-linked work.
- Error envelopes must include the same `correlationId` in both `error.correlationId` and
  `meta.correlationId`.

## Validation

External request payloads must be validated with Zod or an equivalent schema before business logic.
Validation errors should name the failing field and expected shape where safe.
