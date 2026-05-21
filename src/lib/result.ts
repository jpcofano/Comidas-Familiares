export type AppError = {
  code: string;
  message: string;
  cause?: unknown;
};

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err(code: string, message: string, cause?: unknown): Result<never, AppError> {
  return { ok: false, error: { code, message, cause } };
}

export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Result.unwrap failed: ${result.error.code} - ${result.error.message}`);
  }
  return result.value;
}
