import type { BackendErrorBody, ErrorCategory } from "./types.ts";

export function backendErrorResponse(
  params: {
    code: string;
    message: string;
    category: ErrorCategory;
    recoverable: boolean;
    correlationId: string;
    debug?: string;
    details?: Record<string, unknown>;
  },
): BackendErrorBody {
  return {
    error: true,
    code: params.code,
    message: params.message,
    category: params.category,
    recoverable: params.recoverable,
    correlationId: params.correlationId,
    ...(params.debug ? { debug: params.debug } : {}),
    ...(params.details ? { details: params.details } : {}),
  };
}
