// SQLite stores booleans as 0/1 integers. These helpers convert between
// DB row shapes and the shared domain models at the repository boundary
// so services and the renderer only ever see real booleans.

export const toBool = (value: unknown): boolean => value === 1 || value === true;

export const fromBool = (value: boolean): number => (value ? 1 : 0);
