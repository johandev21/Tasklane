export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message)
  }
}

export function required<T>(value: T | undefined | null, name: string): T {
  if (value == null) throw new ApiError(404, `${name} not found`)
  return value
}

export function nonempty(value: string, name: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new ApiError(400, `${name} cannot be empty`)
  return trimmed
}

export function assertTrustedOrigin(
  request: Request,
  origins: readonly string[],
) {
  const origin = request.headers.get('origin')
  if (
    (origin && !origins.includes(origin)) ||
    (!origin && request.headers.get('sec-fetch-site') === 'cross-site')
  ) {
    throw new ApiError(403, 'Untrusted origin')
  }
}
