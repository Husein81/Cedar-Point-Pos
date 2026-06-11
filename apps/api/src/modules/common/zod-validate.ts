import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Parse a value against a Zod schema, throwing a BadRequestException with
 * flattened error details on failure. Shared by controllers that validate
 * bodies/queries with the shared `@repo/types` schemas.
 */
export function validateWith<T>(
  schema: { parse: (data: unknown) => T },
  value: unknown,
): T {
  try {
    return schema.parse(value);
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
