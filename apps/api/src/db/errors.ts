export type ApplicationErrorCode =
  | 'CONSTRAINT_VIOLATION'
  | 'DUPLICATE_RESOURCE'
  | 'FOREIGN_KEY_VIOLATION'
  | 'DATABASE_ERROR';

export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: ApplicationErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

function databaseCode(error: unknown, seen = new Set<unknown>()): string | undefined {
  if (typeof error !== 'object' || error === null || seen.has(error)) {
    return undefined;
  }

  seen.add(error);

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') {
    return code;
  }

  const cause = (error as { cause?: unknown }).cause;
  return databaseCode(cause, seen);
}

export function translateDatabaseError(error: unknown): ApplicationError {
  const code = databaseCode(error);

  if (code === '23505') {
    return new ApplicationError(
      'duplicate resource violates a unique constraint',
      'DUPLICATE_RESOURCE',
      error,
    );
  }

  if (code === '23503') {
    return new ApplicationError(
      'referenced database row does not exist',
      'FOREIGN_KEY_VIOLATION',
      error,
    );
  }

  if (code === '23514' || code === '22P02') {
    return new ApplicationError(
      'database constraint rejected the requested state',
      'CONSTRAINT_VIOLATION',
      error,
    );
  }

  return new ApplicationError('database operation failed', 'DATABASE_ERROR', error);
}

export async function runRepositoryQuery<T>(query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (error) {
    throw translateDatabaseError(error);
  }
}
