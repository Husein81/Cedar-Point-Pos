import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Cross-field date validators.
 *
 * class-validator has no built-in comparison against a sibling property, so
 * these replace the cross-field `.refine()` checks that previously lived on the
 * schedule and report query schemas. Each is a no-op when either value is
 * missing/invalid (field-level `@IsDate()` reports those), so they only enforce
 * the ordering.
 */

function toTime(value: unknown): number | null {
  if (!(value instanceof Date)) return null;
  const time = value.getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Passes when the decorated date is strictly after (or, with `orEqual`, on/after)
 * the referenced sibling property. Skips validation if either side is absent.
 */
export function IsAfterField(
  property: string,
  options?: { orEqual?: boolean } & ValidationOptions,
): PropertyDecorator {
  const { orEqual = false, ...validationOptions } = options ?? {};
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isAfterField',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [property, orEqual],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedProperty, allowEqual] = args.constraints as [
            string,
            boolean,
          ];
          const own = toTime(value);
          const other = toTime(
            (args.object as Record<string, unknown>)[relatedProperty],
          );
          if (own === null || other === null) return true;
          return allowEqual ? own >= other : own > other;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedProperty, allowEqual] = args.constraints as [
            string,
            boolean,
          ];
          return `${args.property} must be ${allowEqual ? 'on or after' : 'after'} ${relatedProperty}`;
        },
      },
    });
  };
}

/**
 * Passes when the decorated date falls on the same calendar day (UTC) as the
 * referenced sibling property. Skips validation if either side is absent.
 */
export function IsSameCalendarDay(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isSameCalendarDay',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          const own = value instanceof Date ? value : null;
          const other = (args.object as Record<string, unknown>)[
            relatedProperty
          ];
          const otherDate = other instanceof Date ? other : null;
          if (
            own === null ||
            otherDate === null ||
            Number.isNaN(own.getTime()) ||
            Number.isNaN(otherDate.getTime())
          ) {
            return true;
          }
          return (
            own.toISOString().slice(0, 10) ===
            otherDate.toISOString().slice(0, 10)
          );
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          return `${args.property} must match the calendar day of ${relatedProperty}`;
        },
      },
    });
  };
}
