/** Free-form invoice payload as accepted by the ZUGFeRD and XRechnung endpoints. */
export type InvoiceJson = Record<string, unknown>

/** Optional transport metadata (e.g. email delivery) accepted by the create endpoints. */
export type TransportOptions = Record<string, unknown>

export interface CreateOptions {
  transport?: TransportOptions
}

export interface CreateInvoicePdfOptions extends CreateOptions {
  /** Custom file name for the generated PDF (also used for the email attachment when `transport` is set). */
  invoiceFilename?: string
  /**
   * The API defaults to `true`: the document is only returned in the response and not stored. Set `false` to
   * also store it, so it can be viewed and downloaded from the invoice list in your account later.
   */
  invoicePassthrough?: boolean
  /**
   * Sent as the `Idempotency-Key` request header (any unique string, e.g. a UUID). Resending the same key with an
   * identical body within 24 hours replays the first response instead of generating a new invoice, and uses no
   * credits. The same key with a different body is rejected with 409.
   */
  idempotencyKey?: string
}

/** The mail to send with {@link RechnungsApiClient.sendEmail}. Recipients are comma-separated for several addresses. */
export interface DeliveryEmail {
  sender: string
  senderName?: string
  receiver: string
  cc?: string
  bcc?: string
  /** Subject. Supports `{placeholders}` filled from `content`. */
  subject: string
  /** Body as plain text or full HTML. Supports `{placeholders}` filled from `content`. */
  message: string
  /** Key-value pairs that fill the placeholders in `subject` and `message`, e.g. `{ invoicedate: "02.09.2026" }`. */
  content?: Record<string, string>
  attachments?: Array<{ fileName: string; fileBase64: string }>
}

export interface ValidateZugferdPdfOptions {
  /** When true, cross-checks the embedded XML against the visual PDF content. */
  comparePDF2XML?: boolean
}

export interface XRechnungValidationMessage {
  type: string
  message: string
  location: string
  schemaFile: string
  id: string
  line: string
}

export interface XRechnungValidationResult {
  isValid: boolean
  message: string
  messages: XRechnungValidationMessage[]
  details: Record<string, unknown>
}

/** @deprecated Renamed to {@link XRechnungValidationMessage}. */
export type XInvoiceValidationMessage = XRechnungValidationMessage

/** @deprecated Renamed to {@link XRechnungValidationResult}. */
export type XInvoiceValidationResult = XRechnungValidationResult

export interface AsyncPdfSubmitResult {
  job_id: string
  status: "processing"
}

export interface AsyncPdfStatusProcessing {
  job_id: string
  status: "processing"
}

export interface AsyncPdfStatusDone {
  job_id: string
  status: "done"
  result: { extractionConfidence: number; invoice: InvoiceJson }
}

export interface AsyncPdfStatusFailed {
  job_id: string
  status: "failed"
  error: { resultStatus: number; message: string }
}

export type AsyncPdfStatusResult = AsyncPdfStatusProcessing | AsyncPdfStatusDone | AsyncPdfStatusFailed

export type ZugferdFromPdfResult =
  | { ok: true; pdfBase64: string; fileName: string; reference: string }
  | { ok: false; status: number; body: import("./errors.js").ZugferdFromPdfErrorBody }
