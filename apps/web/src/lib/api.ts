import type {
  ApiEnvelope,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
} from '@rtctp/domain';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const csrfHeaderName = 'x-csrf-token';

let accessToken: string | null = null;
let csrfToken: string | null = null;

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function setAuthTokens(auth: LoginResponse['auth']) {
  accessToken = auth.accessToken;
  csrfToken = auth.session.csrfToken;
}

export function resetAuthTokens() {
  accessToken = null;
  csrfToken = null;
}

export function getAccessToken() {
  return accessToken;
}

async function parseEnvelope<TData>(response: Response): Promise<TData> {
  const envelope = (await response.json()) as ApiEnvelope<TData>;

  if (!envelope.ok) {
    throw new ApiClientError(
      response.status,
      envelope.error.code,
      envelope.error.message,
      envelope.error.details,
    );
  }

  return envelope.data;
}

async function requestJson<TData>(
  path: string,
  init: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<TData> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (csrfToken && (path === '/api/auth/refresh' || path === '/api/auth/logout')) {
    headers.set(csrfHeaderName, csrfToken);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retryOnUnauthorized && path !== '/api/auth/refresh') {
    try {
      await refreshSession();
      return requestJson<TData>(path, init, false);
    } catch {
      resetAuthTokens();
    }
  }

  return parseEnvelope<TData>(response);
}

export async function registerAccount(input: RegisterRequest): Promise<RegisterResponse> {
  const data = await requestJson<RegisterResponse>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    false,
  );
  setAuthTokens(data.auth);
  return data;
}

export async function loginAccount(input: LoginRequest): Promise<LoginResponse> {
  const data = await requestJson<LoginResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    false,
  );
  setAuthTokens(data.auth);
  return data;
}

export async function refreshSession() {
  const data = await requestJson<{ auth: LoginResponse['auth'] }>(
    '/api/auth/refresh',
    { method: 'POST' },
    false,
  );
  setAuthTokens(data.auth);
  return data;
}

export async function logoutAccount(): Promise<LogoutResponse> {
  try {
    return await requestJson<LogoutResponse>(
      '/api/auth/logout',
      { method: 'POST' },
      false,
    );
  } finally {
    resetAuthTokens();
  }
}

export async function getMe(): Promise<MeResponse> {
  return requestJson<MeResponse>('/api/me');
}
