export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden') {
    return new HttpError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new HttpError(409, 'CONFLICT', message, details);
  }
  static validation(message: string, details?: unknown) {
    return new HttpError(422, 'VALIDATION_FAILED', message, details);
  }
  static rateLimited(message = 'Too many requests') {
    return new HttpError(429, 'RATE_LIMITED', message);
  }
}
