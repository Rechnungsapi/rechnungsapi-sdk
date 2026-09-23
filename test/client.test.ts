import { beforeEach, describe, expect, it, vi } from "vitest"
import { RechnungsApiClient, RechnungsApiError, ValidationFailedError } from "../src/index.js"

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  })

describe("RechnungsApiClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
  })

  it("requires an apiToken", () => {
    // @ts-expect-error deliberately omitting the required option
    expect(() => new RechnungsApiClient({})).toThrow(/apiToken/)
  })

  it("sends a Bearer token and JSON body when creating a ZUGFeRD invoice", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, pdfBase64: "abc" }))
    const client = new RechnungsApiClient({ apiToken: "test-token", fetch: fetchMock as any })

    const result = await client.createZugferdFromJson({ invoiceNumber: "RE-1" }, "base64pdf")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.rechnungsapi.de/api/v1/zugferd/createZugferdFromJson",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    )
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ invoice: { invoiceNumber: "RE-1" }, invoicePdf64: "base64pdf" })
    expect(result).toEqual({ success: true, pdfBase64: "abc" })
  })

  it("includes transport options only when provided", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))
    const client = new RechnungsApiClient({ apiToken: "t", fetch: fetchMock as any })

    await client.createXInvoiceFromJson({ invoiceNumber: "RE-2" }, { transport: { method: "email" } })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({
      invoice: { invoiceNumber: "RE-2" },
      transport: { method: "email" },
    })
  })

  it("normalizes the X-Invoice validation response shape", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ valid: true, xInvoiceErrors: [{ message: "warn", type: "warning" }] }),
    )
    const client = new RechnungsApiClient({ apiToken: "t", fetch: fetchMock as any })

    const result = await client.validateXInvoiceXml("<CrossIndustryInvoice/>")

    expect(result.isValid).toBe(true)
    expect(result.messages).toHaveLength(1)
    expect(result.details.xInvoiceErrors).toHaveLength(1)
  })

  it("throws ValidationFailedError on a 412 response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "missing fields", noOfMissingData: 2, errorlist: ["a", "b"] }, { status: 412 }),
    )
    const client = new RechnungsApiClient({ apiToken: "t", fetch: fetchMock as any })

    await expect(client.createZugferdFromJson({}, "x")).rejects.toBeInstanceOf(ValidationFailedError)
  })

  it("throws RechnungsApiError with status on other failures", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "boom" }, { status: 500 }))
    const client = new RechnungsApiClient({ apiToken: "t", fetch: fetchMock as any })

    await expect(client.validateZugferdPdf("x")).rejects.toMatchObject({
      status: 500,
      message: "boom",
    })
  })

  it("polls analysis status against the v2 host", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ job_id: "j1", status: "processing" }))
    const client = new RechnungsApiClient({ apiToken: "t", fetch: fetchMock as any })

    const result = await client.getAnalysisStatus("j1")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.v2.rechnungsapi.de/rechnungsapi-invoice-async-status?id=j1",
      expect.objectContaining({ method: "GET" }),
    )
    expect(result).toEqual({ job_id: "j1", status: "processing" })
  })

  it("respects a custom baseUrl", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))
    const client = new RechnungsApiClient({
      apiToken: "t",
      baseUrl: "https://your-gateway.example.com",
      fetch: fetchMock as any,
    })

    await client.createZugferdPdf("pdf64", "<xml/>")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://your-gateway.example.com/api/v1/zugferd/createZugferdPdf",
      expect.anything(),
    )
  })
})
