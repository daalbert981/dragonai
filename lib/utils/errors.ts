import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Error response handler
 */
export function handleError(error: unknown): NextResponse {
  console.error('Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };

    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'A record with this value already exists',
          code: 'DUPLICATE_RECORD',
        },
        { status: 409 }
      );
    }

    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'Record not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'Internal server error';

  return NextResponse.json(
    {
      error: message,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Async handler wrapper for API routes
 */
export function asyncHandler(
  handler: (...args: any[]) => Promise<NextResponse>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: Request,
  schema: any
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new ValidationError('Invalid request body');
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: any
): T {
  try {
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new ValidationError('Invalid query parameters');
  }
}
