// Typed application errors. Services throw these; the IPC registry
// serializes them into the { ok: false, error } envelope.

export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(`${entity} not found`, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(message, code);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code = "AUTH_ERROR") {
    super(message, code);
  }
}
