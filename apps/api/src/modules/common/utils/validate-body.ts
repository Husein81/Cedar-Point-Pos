import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Parses and validates a request body against a Zod schema.
 * Throws BadRequestException with flattened error details on validation failure,
 * so NestJS responds with 400 instead of a raw 500 from an uncaught ZodError.
 */
export function validateBody<T>(
  schema: { parse: (data: unknown) => T },
  body: unknown,
): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.flatten(),
      });
    }
    throw error;
  }
}
