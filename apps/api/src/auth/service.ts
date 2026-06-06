import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from '@rtctp/domain';
import { db, type TransactionClient, withTransaction } from '../db/client.js';
import { ApplicationError } from '../db/errors.js';
import { appendAuditEvent } from '../repositories/audit.js';
import { getLedgerBalances, seedDemoBalances } from '../repositories/ledger.js';
import {
  createSession,
  findSessionByRefreshTokenHash,
  isRefreshSessionUsable,
  markSessionRotated,
  revokeSession,
  revokeTokenFamily,
} from '../repositories/sessions.js';
import {
  canonicalizeEmail,
  createUser,
  findUserByEmail,
  findUserById,
  toAuthUser,
} from '../repositories/users.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  createAccessToken,
  createOpaqueToken,
  createTokenFamilyId,
  hashToken,
  refreshTokenExpiresAt,
} from './tokens.js';

export class AuthPublicError extends Error {
  constructor(
    public readonly statusCode: 400 | 401 | 403 | 409,
    public readonly code: 'VALIDATION_ERROR' | 'AUTH_REQUIRED' | 'FORBIDDEN',
    message: string,
  ) {
    super(message);
    this.name = 'AuthPublicError';
  }
}

export interface AuthContext {
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult<TData> {
  data: TData;
  refreshToken?: string;
}

function safeMetadata(context: AuthContext): Record<string, unknown> {
  return {
    correlationId: context.correlationId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

async function createTransactionalSessionAuthPayload(
  tx: TransactionClient,
  args: {
    userId: string;
    role: 'USER' | 'ADMIN';
    tokenFamilyId?: string;
    rotatedFromSessionId?: string;
    context: AuthContext;
  },
) {
  const refreshToken = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const expiresAt = refreshTokenExpiresAt();
  const tokenFamilyId = args.tokenFamilyId ?? createTokenFamilyId();
  const sessionInsert = {
    userId: args.userId,
    refreshTokenHash: hashToken(refreshToken),
    csrfTokenHash: hashToken(csrfToken),
    tokenFamilyId,
    expiresAt,
    ...(args.rotatedFromSessionId
      ? { rotatedFromSessionId: args.rotatedFromSessionId }
      : {}),
    ...(args.context.ipAddress ? { ipAddress: args.context.ipAddress } : {}),
    ...(args.context.userAgent ? { userAgent: args.context.userAgent } : {}),
  };

  const session = await createSession(tx, sessionInsert);
  const access = await createAccessToken({
    sub: args.userId,
    sid: session.id,
    role: args.role,
  });

  return {
    session,
    refreshToken,
    auth: {
      accessToken: access.accessToken,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      session: {
        expiresAt: expiresAt.toISOString(),
        csrfToken,
      },
    },
  };
}

export async function registerUser(
  request: RegisterRequest,
  context: AuthContext,
): Promise<AuthResult<RegisterResponse>> {
  const email = canonicalizeEmail(request.email);
  const passwordHash = await hashPassword(request.password);

  try {
    return await withTransaction(async (tx) => {
      const user = await createUser(tx, {
        email,
        displayName: request.displayName.trim(),
        passwordHash,
        role: 'USER',
      });
      const sessionAuth = await createTransactionalSessionAuthPayload(tx, {
        userId: user.id,
        role: user.role,
        context,
      });

      await seedDemoBalances(tx, user.id, user.id);
      await appendAuditEvent(tx, {
        type: 'AUTH_USER_REGISTERED',
        actorUserId: user.id,
        aggregateType: 'user',
        aggregateId: user.id,
        payload: {
          userId: user.id,
          sessionId: sessionAuth.session.id,
          tokenFamilyId: sessionAuth.session.tokenFamilyId,
        },
        metadata: safeMetadata(context),
      });

      return {
        refreshToken: sessionAuth.refreshToken,
        data: {
          user: toAuthUser(user),
          balances: await getLedgerBalances(tx, user.id),
          auth: sessionAuth.auth,
        },
      };
    });
  } catch (error) {
    if (error instanceof ApplicationError && error.code === 'DUPLICATE_RESOURCE') {
      throw new AuthPublicError(
        409,
        'VALIDATION_ERROR',
        'Registration could not be completed with those details.',
      );
    }

    throw error;
  }
}

async function auditLoginFailure(email: string, context: AuthContext, userId?: string) {
  await appendAuditEvent(db, {
    type: 'AUTH_LOGIN_FAILURE',
    actorUserId: userId,
    aggregateType: 'auth',
    aggregateId: userId ?? hashToken(email),
    payload: { reason: 'INVALID_CREDENTIALS' },
    metadata: safeMetadata(context),
  });
}

export async function loginUser(
  request: LoginRequest,
  context: AuthContext,
): Promise<AuthResult<LoginResponse>> {
  const email = canonicalizeEmail(request.email);
  const user = await findUserByEmail(db, email);
  const isValid = user ? await verifyPassword(user.passwordHash, request.password) : false;

  if (!user || !isValid) {
    await auditLoginFailure(email, context, user?.id);
    throw new AuthPublicError(401, 'AUTH_REQUIRED', 'Invalid email or password.');
  }

  return withTransaction(async (tx) => {
    const sessionAuth = await createTransactionalSessionAuthPayload(tx, {
      userId: user.id,
      role: user.role,
      context,
    });

    await appendAuditEvent(tx, {
      type: 'AUTH_LOGIN_SUCCESS',
      actorUserId: user.id,
      aggregateType: 'session',
      aggregateId: sessionAuth.session.id,
      payload: {
        userId: user.id,
        sessionId: sessionAuth.session.id,
        tokenFamilyId: sessionAuth.session.tokenFamilyId,
      },
      metadata: safeMetadata(context),
    });

    return {
      refreshToken: sessionAuth.refreshToken,
      data: {
        user: toAuthUser(user),
        balances: await getLedgerBalances(tx, user.id),
        auth: sessionAuth.auth,
      },
    };
  });
}

export async function refreshSession(
  refreshToken: string | undefined,
  csrfToken: string | undefined,
  context: AuthContext,
): Promise<AuthResult<RefreshResponse>> {
  if (!refreshToken || !csrfToken) {
    throw new AuthPublicError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  const refreshTokenHash = hashToken(refreshToken);
  const session = await findSessionByRefreshTokenHash(db, refreshTokenHash);

  if (!session) {
    throw new AuthPublicError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  if (!isRefreshSessionUsable(session)) {
    await withTransaction(async (tx) => {
      await revokeTokenFamily(tx, session.tokenFamilyId, 'REPLAY_DETECTED');
      await appendAuditEvent(tx, {
        type: 'AUTH_REFRESH_REPLAY_DETECTED',
        actorUserId: session.userId,
        aggregateType: 'session',
        aggregateId: session.id,
        payload: {
          sessionId: session.id,
          tokenFamilyId: session.tokenFamilyId,
          reason: session.revokedReason ?? 'INVALID_REFRESH_SESSION',
        },
        metadata: safeMetadata(context),
      });
    });
    throw new AuthPublicError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  if (session.csrfTokenHash !== hashToken(csrfToken)) {
    throw new AuthPublicError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  const user = await findUserById(db, session.userId);

  if (!user) {
    throw new AuthPublicError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return withTransaction(async (tx) => {
    const sessionAuth = await createTransactionalSessionAuthPayload(tx, {
      userId: user.id,
      role: user.role,
      tokenFamilyId: session.tokenFamilyId,
      rotatedFromSessionId: session.id,
      context,
    });

    await markSessionRotated(tx, session.id, sessionAuth.session.id);
    await appendAuditEvent(tx, {
      type: 'AUTH_TOKEN_REFRESHED',
      actorUserId: user.id,
      aggregateType: 'session',
      aggregateId: sessionAuth.session.id,
      payload: {
        previousSessionId: session.id,
        sessionId: sessionAuth.session.id,
        tokenFamilyId: session.tokenFamilyId,
      },
      metadata: safeMetadata(context),
    });

    return {
      refreshToken: sessionAuth.refreshToken,
      data: { auth: sessionAuth.auth },
    };
  });
}

export async function logoutSession(
  refreshToken: string | undefined,
  csrfToken: string | undefined,
  context: AuthContext,
) {
  if (refreshToken && csrfToken) {
    const session = await findSessionByRefreshTokenHash(db, hashToken(refreshToken));

    if (session && session.csrfTokenHash === hashToken(csrfToken)) {
      await withTransaction(async (tx) => {
        const revoked = await revokeSession(tx, session.id, 'LOGOUT');
        await appendAuditEvent(tx, {
          type: 'AUTH_LOGOUT',
          actorUserId: session.userId,
          aggregateType: 'session',
          aggregateId: session.id,
          payload: { sessionId: session.id, tokenFamilyId: session.tokenFamilyId },
          metadata: safeMetadata(context),
        });

        if (revoked) {
          await appendAuditEvent(tx, {
            type: 'AUTH_SESSION_REVOKED',
            actorUserId: session.userId,
            aggregateType: 'session',
            aggregateId: session.id,
            payload: {
              sessionId: session.id,
              tokenFamilyId: session.tokenFamilyId,
              reason: 'LOGOUT',
            },
            metadata: safeMetadata(context),
          });
        }
      });
    }
  }

  return { loggedOut: true as const };
}

export async function getMe(userId: string): Promise<MeResponse> {
  const user = await findUserById(db, userId);

  if (!user) {
    throw new AuthPublicError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return {
    user: toAuthUser(user),
    balances: await getLedgerBalances(db, user.id),
  };
}
