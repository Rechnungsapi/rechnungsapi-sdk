import { RechnungsApiError, ValidationFailedError, type ZugferdFromPdfErrorBody } from "./errors.js"
import type {
  AsyncPdfStatusResult,
  AsyncPdfSubmitResult,
  CreateOptions,
  InvoiceJson,
  ValidateZugferdPdfOptions,
  XInvoiceValidationResult,
  ZugferdFromPdfResult,
} from "./types.js"

export interface RechnungsApiClientOptions {
  /** Your RechnungsAPI Bearer token. Get one from the dashboard at rechnungsapi.de. */
  apiToken: string
  /** Gateway base URL. Defaults to the production API. */
  baseUrl?: string
  /** Base URL for the v2 analyzer/converter endpoints. Defaults to the production v2 host. */
  v2BaseUrl?: string
  /** Override the fetch implementation (mainly for tests). */
  fetch?: typeof fetch
}

const DEFAULT_BASE_URL = "https://api.rechnungsapi.de/"
const DEFAULT_V2_BASE_URL = "https://api.v2.rechnungsapi.de"

const withTrailingSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`)

/**
 * Client for the RechnungsAPI e-invoicing gateway: create, validate, and
 * analyze ZUGFeRD (PDF/A-3) and X-Invoice (XRechnung/UBL) documents.
 */
export class RechnungsApiClient {
  private readonly apiToken: string
  private readonly baseUrl: string
  private readonly v2BaseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: RechnungsApiClientOptions) {
    if (!options.apiToken) {
      throw new Error("RechnungsApiClient requires an apiToken")
    }
    this.apiToken = options.apiToken
    this.baseUrl = withTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL)
    this.v2BaseUrl = options.v2BaseUrl ?? DEFAULT_V2_BASE_URL
    this.fetchImpl = options.fetch ?? fetch
  }

  /** Create a ZUGFeRD PDF/A-3 invoice from structured invoice JSON. */
  async createZugferdFromJson(
    invoice: InvoiceJson,
    invoicePdf64: string,
    options: CreateOptions = {},
  ): Promise<unknown> {
    return this.callGateway("api/v1/zugferd/createZugferdFromJson", {
      invoice,
      invoicePdf64,
      ...(options.transport ? { transport: options.transport } : {}),
    })
  }

  /** Create an X-Invoice (XRechnung/UBL) XML from structured invoice JSON. */
  async createXInvoiceFromJson(invoice: InvoiceJson, options: CreateOptions = {}): Promise<unknown> {
    return this.callGateway("api/v1/zugferd/createXinvoiceFromJson", {
      invoice,
      ...(options.transport ? { transport: options.transport } : {}),
    })
  }

  /** Embed an existing X-Invoice XML into a visual PDF to produce a ZUGFeRD PDF. */
  async createZugferdPdf(invoicePdf64: string, xInvoiceXml: string): Promise<unknown> {
    return this.callGateway("api/v1/zugferd/createZugferdPdf", { invoicePdf64, xInvoiceXml })
  }

  /** Extract the embedded XRechnung XML from a ZUGFeRD PDF as structured JSON. */
  async extractXInvoiceFromZugferd(zugferd64: string): Promise<unknown> {
    return this.callGateway("api/v1/zugferd/extractXinvoiceFromZugferdToJson", { zugferd64 })
  }

  /** Validate an X-Invoice XML document against the XRechnung/UBL schema and business rules. */
  async validateXInvoiceXml(xinvoiceXML: string): Promise<XInvoiceValidationResult> {
    const result = (await this.callGateway("api/v1/zugferd/validateXinvoiceXml", {
      xinvoiceXML,
    })) as any

    return {
      isValid: Boolean(result.isValid ?? result.valid ?? false),
      message: result.message ?? "",
      messages: [...(result.messages ?? result.errors ?? result.warnings ?? []), ...(result.xInvoiceErrors ?? [])],
      details: { ...(result.details ?? {}), xInvoiceErrors: result.xInvoiceErrors ?? [] },
    }
  }

  /** Validate a ZUGFeRD PDF's embedded XML content. */
  async validateZugferdPdf(zugferdFile64: string, options: ValidateZugferdPdfOptions = {}): Promise<unknown> {
    return this.callGateway("api/v1/zugferd/validateZugferdPdf", {
      zugferdFile64,
      comparePDF2XML: options.comparePDF2XML ?? false,
    })
  }

  /**
   * Extract structured invoice JSON from a scanned or digital PDF/PNG/JPEG/TIFF
   * invoice (synchronous — use {@link analyzePdfInvoiceAsync} for large files).
   */
  async analyzePdfInvoice(pdfInvoiceBase64: string): Promise<unknown> {
    return this.callGateway("api/v1/zugferd/createJSONFromAnalysedPdf", { pdfInvoiceBase64 })
  }

  /**
   * High-accuracy PDF/image invoice analyzer (v2). Set `withLineItems` to
   * also extract individual line items.
   */
  async analyzePdfInvoiceV2(pdfInvoiceBase64: string, withLineItems = false): Promise<unknown> {
    return this.callV2("createJSONFromAnalysedPdf", { pdfInvoiceBase64, withLineItems })
  }

  /**
   * Submit a PDF/image invoice for asynchronous analysis (for files too
   * large to finish within the synchronous gateway timeout). Returns a
   * `job_id` to poll with {@link getAnalysisStatus}.
   */
  async analyzePdfInvoiceAsync(pdfInvoiceBase64: string, withLineItems?: boolean): Promise<AsyncPdfSubmitResult> {
    const body: Record<string, unknown> = { pdfInvoiceBase64 }
    if (typeof withLineItems === "boolean") body.withLineItems = withLineItems
    return this.callV2("createJSONFromAnalysedPdfAsync", body) as Promise<AsyncPdfSubmitResult>
  }

  /** Poll the status of an asynchronous PDF analysis job. */
  async getAnalysisStatus(jobId: string): Promise<AsyncPdfStatusResult> {
    const response = await this.fetchImpl(
      `${this.v2BaseUrl}/rechnungsapi-invoice-async-status?id=${encodeURIComponent(jobId)}`,
      { method: "GET", headers: this.authHeaders() },
    )
    const data = await this.safeJson(response)
    if (!response.ok) {
      throw new RechnungsApiError(data?.message ?? `Status check failed with status ${response.status}`, response.status, data)
    }
    return data as AsyncPdfStatusResult
  }

  /**
   * Convert a PDF/image invoice directly into a validated ZUGFeRD PDF/A-3 in
   * one call. Returns a discriminated result rather than throwing, since
   * every failure mode (bad file, low-confidence extraction, missing
   * mandatory fields, ...) carries structured detail worth branching on.
   */
  async createZugferdFromPdf(pdfInvoiceBase64: string, fileName?: string): Promise<ZugferdFromPdfResult> {
    const response = await this.fetchImpl(`${this.v2BaseUrl}/createZugferdFromPdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: JSON.stringify({ pdfInvoiceBase64, ...(fileName ? { fileName } : {}) }),
    })

    const reference = response.headers.get("x-zugferd-reference") ?? ""
    const contentType = response.headers.get("content-type") ?? ""

    if (response.ok && contentType.startsWith("application/pdf")) {
      const buffer = await response.arrayBuffer()
      const disposition = response.headers.get("content-disposition") ?? ""
      const suggested =
        /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${(fileName ?? "invoice").replace(/\.[^.]+$/, "")}-zugferd.pdf`
      return { ok: true, pdfBase64: Buffer.from(buffer).toString("base64"), fileName: suggested, reference }
    }

    let body: ZugferdFromPdfErrorBody
    try {
      body = (await response.json()) as ZugferdFromPdfErrorBody
    } catch {
      body = {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          stage: "unknown",
          httpStatus: response.status,
          retryable: false,
          userMessage: "The request could not be processed.",
          detail: "",
          reference,
        },
        email: { subject: "", text: "", html: "" },
      }
    }
    return { ok: false, status: response.status, body }
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiToken}` }
  }

  private async safeJson(response: Response): Promise<any> {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  private async callGateway(path: string, body: unknown): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: JSON.stringify(body),
    })
    return this.handleResponse(response)
  }

  private async callV2(path: string, body: unknown): Promise<unknown> {
    const response = await this.fetchImpl(`${this.v2BaseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: JSON.stringify(body),
    })
    return this.handleResponse(response)
  }

  private async handleResponse(response: Response): Promise<unknown> {
    if (response.ok) {
      return this.safeJson(response) ?? { success: true }
    }

    const data = await this.safeJson(response)

    if (response.status === 412) {
      throw new ValidationFailedError(data?.message ?? "Data validation failed", data ?? {})
    }

    throw new RechnungsApiError(
      data?.message ?? `API request failed with status: ${response.status}`,
      response.status,
      data,
    )
  }
}
