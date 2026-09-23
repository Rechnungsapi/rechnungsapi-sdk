/** Free-form invoice payload as accepted by the ZUGFeRD/X-Invoice endpoints. */
export type InvoiceJson = Record<string, unknown>

/** Optional transport metadata (e.g. email delivery) accepted by the create endpoints. */
export type TransportOptions = Record<string, unknown>

export interface CreateOptions {
  transport?: TransportOptions
}

export interface ValidateZugferdPdfOptions {
  /** When true, cross-checks the embedded XML against the visual PDF content. */
  comparePDF2XML?: boolean
}

export interface XInvoiceValidationMessage {
  type: string
  message: string
  location: string
  schemaFile: string
  id: string
  line: string
}

export interface XInvoiceValidationResult {
  isValid: boolean
  message: string
  messages: XInvoiceValidationMessage[]
  details: Record<string, unknown>
}

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
