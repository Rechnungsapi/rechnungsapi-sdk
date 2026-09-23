/**
 * Base error for any non-2xx response from the RechnungsAPI gateway.
 * `status` is the HTTP status code; `body` is the parsed JSON error body
 * when one was returned (may be undefined for non-JSON failures).
 */
export class RechnungsApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = "RechnungsApiError"
    this.status = status
    this.body = body
  }
}

/** 412 — the invoice JSON is missing mandatory fields. */
export class ValidationFailedError extends RechnungsApiError {
  readonly noOfMissingData: number
  readonly errorlist: unknown[]

  constructor(message: string, body: { noOfMissingData?: number; errorlist?: unknown[] }) {
    super(message, 412, body)
    this.name = "ValidationFailedError"
    this.noOfMissingData = body.noOfMissingData ?? 0
    this.errorlist = body.errorlist ?? []
  }
}

/**
 * Structured failure from the `/createZugferdFromPdf` endpoint — every
 * rejection on that path (bad file, low-confidence extraction, missing
 * mandatory fields, upstream outage, ...) comes back in this shape instead
 * of throwing, so callers can branch on `error.code` / `error.stage`.
 */
export interface ZugferdFromPdfErrorBody {
  success: false
  error: {
    code:
      | "INVALID_REQUEST"
      | "PDF_CORRUPT"
      | "PDF_ENCRYPTED"
      | "PDF_NO_TEXT"
      | "EXTRACTION_LOW_CONFIDENCE"
      | "FILE_TOO_LARGE"
      | "UNAUTHORIZED"
      | "MISSING_MANDATORY_FIELDS"
      | "VERIFICATION_FAILED"
      | "ZUGFERD_REJECTED"
      | "PROCESSING_TEMPORARY_ERROR"
      | "UNKNOWN_ERROR"
    stage: "input" | "access" | "analyse" | "missing" | "verify" | "zugferd" | "deliver" | "unknown"
    httpStatus: number
    retryable: boolean
    userMessage: string
    detail: string
    reference: string
    upstreamReference?: string
    fields?: Array<Record<string, unknown>>
    ruleCodes?: string[]
    explanations?: Array<{
      code: string
      found: boolean
      title: string
      description: string
      source?: string
      file?: string
    }>
    extractionConfidence?: number
  }
  email: { subject: string; text: string; html: string }
}
