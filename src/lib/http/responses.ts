export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

/** One JSON error envelope for every route, with optional extra body fields. */
export function jsonError(
  code: string,
  message: string,
  retryable: boolean,
  status: number,
  extra: Record<string, unknown> = {},
) {
  const body: ApiErrorBody & Record<string, unknown> = { error: { code, message, retryable }, ...extra };
  return Response.json(body, { status });
}
