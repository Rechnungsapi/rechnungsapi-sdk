import { describe, expect, it, vi } from "vitest"
import {
  RechnungsApiClient,
  RechnungsApiError,
  ValidationFailedError,
  type RechnungsApiClientOptions,
} from "../src/index.js"

const GATEWAY = "https://api.rechnungsapi.de/api/v1/zugferd"
const V2 = "https://api.v2.rechnungsapi.de"

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init })

function setup(respond: Response, options: Partial<RechnungsApiClientOptions> = {}) {
  const fetchMock = vi.fn(async (..._args: unknown[]) => respond.clone())
  const client = new RechnungsApiClient({
    apiToken: "tok_123",
    fetch: fetchMock as unknown as typeof fetch,
    ...options,
  })
  const last = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    return {
      url,
      init,
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    }
  }
  return { client, fetchMock, last }
}

type Case = { name: string; call: (c: RechnungsApiClient) => Promise<unknown>; url: string; body: unknown }

// These routes are the ones published at https://rechnungsapi.de/api-docs. Take them from there,
// not from the web app's internal API list: the public gateway doesn't expose every internal route
// (e.g. it serves createZugferdPdfFromXinvoice, not createZugferdPdf).
const endpointCases: Case[] = [
  { name: "createZugferdFromJson", call: (c) => c.createZugferdFromJson({ n: 1 }, "pdf64"), url: `${GATEWAY}/createZugferdFromJson`, body: { invoice: { n: 1 }, invoicePdf64: "pdf64" } },
  { name: "createZugferdFromJson with transport", call: (c) => c.createZugferdFromJson({ n: 1 }, "pdf64", { transport: { to: "a@b.c" } }), url: `${GATEWAY}/createZugferdFromJson`, body: { invoice: { n: 1 }, invoicePdf64: "pdf64", transport: { to: "a@b.c" } } },
  { name: "createXInvoiceFromJson", call: (c) => c.createXInvoiceFromJson({ n: 1 }), url: `${GATEWAY}/createXinvoiceFromJson`, body: { invoice: { n: 1 } } },
  { name: "createZugferdPdf", call: (c) => c.createZugferdPdf("pdf64", "<x/>"), url: `${GATEWAY}/createZugferdPdfFromXinvoice`, body: { invoicePdf64: "pdf64", xInvoiceXml: "<x/>" } },
  { name: "extractXInvoiceFromZugferd", call: (c) => c.extractXInvoiceFromZugferd("z64"), url: `${GATEWAY}/extractXinvoiceFromZugferdToJson`, body: { zugferd64: "z64" } },
  { name: "validateXInvoiceXml", call: (c) => c.validateXInvoiceXml("<x/>"), url: `${GATEWAY}/validateXinvoiceXml`, body: { xinvoiceXML: "<x/>" } },
  { name: "validateZugferdPdf", call: (c) => c.validateZugferdPdf("z64"), url: `${GATEWAY}/validateZugferdPdf`, body: { zugferdFile64: "z64", comparePDF2XML: false } },
  { name: "validateZugferdPdf with comparePDF2XML", call: (c) => c.validateZugferdPdf("z64", { comparePDF2XML: true }), url: `${GATEWAY}/validateZugferdPdf`, body: { zugferdFile64: "z64", comparePDF2XML: true } },
  { name: "analyzePdfInvoice (v1, gateway host)", call: (c) => c.analyzePdfInvoice("p64"), url: `${GATEWAY}/createJSONFromAnalysedPdf`, body: { pdfInvoiceBase64: "p64" } },
  { name: "analyzePdfInvoiceV2 (v2 host)", call: (c) => c.analyzePdfInvoiceV2("p64"), url: `${V2}/createJSONFromAnalysedPdf`, body: { pdfInvoiceBase64: "p64", withLineItems: false } },
  { name: "analyzePdfInvoiceV2 with line items", call: (c) => c.analyzePdfInvoiceV2("p64", true), url: `${V2}/createJSONFromAnalysedPdf`, body: { pdfInvoiceBase64: "p64", withLineItems: true } },
  { name: "analyzePdfInvoiceAsync, flag omitted", call: (c) => c.analyzePdfInvoiceAsync("p64"), url: `${V2}/createJSONFromAnalysedPdfAsync`, body: { pdfInvoiceBase64: "p64" } },
  { name: "analyzePdfInvoiceAsync, explicit false is still sent", call: (c) => c.analyzePdfInvoiceAsync("p64", false), url: `${V2}/createJSONFromAnalysedPdfAsync`, body: { pdfInvoiceBase64: "p64", withLineItems: false } },
]

describe("every method sends exactly the right request", () => {
  it.each(endpointCases)("$name", async ({ call, url, body }) => {
    const { client, fetchMock, last } = setup(json({ valid: true }))
    await call(client)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const sent = last()
    expect(sent.url).toBe(url)
    expect(sent.init.method).toBe("POST")
    expect(sent.headers.Authorization).toBe("Bearer tok_123")
    expect(sent.headers["Content-Type"]).toBe("application/json")
    expect(sent.body).toEqual(body)
  })
})

describe("getAnalysisStatus", () => {
  it("is a GET with the token and a URL-encoded job id", async () => {
    const { client, last } = setup(json({ job_id: "a b/c", status: "processing" }))
    const res = await client.getAnalysisStatus("a b/c")
    const sent = last()
    expect(sent.url).toBe(`${V2}/rechnungsapi-invoice-async-status?id=a%20b%2Fc`)
    expect(sent.init.method).toBe("GET")
    expect(sent.headers.Authorization).toBe("Bearer tok_123")
    expect(res).toEqual({ job_id: "a b/c", status: "processing" })
  })

  it("throws a RechnungsApiError carrying the server's message on failure", async () => {
    const { client } = setup(json({ message: "job not found" }, { status: 404 }))
    await expect(client.getAnalysisStatus("x")).rejects.toMatchObject({
      name: "RechnungsApiError",
      status: 404,
      message: "job not found",
    })
  })
})

describe("URL handling", () => {
  it.each(["https://gw.example.com", "https://gw.example.com/"])("baseUrl %s gives exactly one slash before the path", async (baseUrl) => {
    const { client, last } = setup(json({}), { baseUrl })
    await client.createZugferdPdf("p", "<x/>")
    expect(last().url).toBe("https://gw.example.com/api/v1/zugferd/createZugferdPdfFromXinvoice")
  })

  it.each(["https://v2.example.com", "https://v2.example.com/", "https://v2.example.com///"])("v2BaseUrl %s never produces a double slash", async (v2BaseUrl) => {
    const { client, last } = setup(json({}), { v2BaseUrl })
    await client.analyzePdfInvoiceV2("p")
    expect(last().url).toBe("https://v2.example.com/createJSONFromAnalysedPdf")
  })

  it("applies the same normalisation to the status endpoint", async () => {
    const { client, last } = setup(json({ status: "processing" }), { v2BaseUrl: "https://v2.example.com/" })
    await client.getAnalysisStatus("j1")
    expect(last().url).toBe("https://v2.example.com/rechnungsapi-invoice-async-status?id=j1")
  })

  it("refuses to be constructed without a token", () => {
    expect(() => new RechnungsApiClient({ apiToken: "" })).toThrow(/apiToken/)
  })
})

describe("successful responses that are not JSON", () => {
  it("an empty 200 body resolves to { success: true } rather than null", async () => {
    const { client } = setup(new Response("", { status: 200 }))
    await expect(client.createZugferdPdf("p", "<x/>")).resolves.toEqual({ success: true })
  })

  it("a plain-text 200 body resolves to { success: true } too", async () => {
    const { client } = setup(new Response("OK", { status: 200, headers: { "content-type": "text/plain" } }))
    await expect(client.createXInvoiceFromJson({})).resolves.toEqual({ success: true })
  })
})

describe("failures", () => {
  it("keeps the server's message, status and parsed body", async () => {
    const { client } = setup(json({ message: "Invalid token.", error: "x" }, { status: 401 }))
    const err = await client.validateXInvoiceXml("<x/>").catch((e) => e)
    expect(err).toBeInstanceOf(RechnungsApiError)
    expect(err.status).toBe(401)
    expect(err.message).toBe("Invalid token.")
    expect(err.body).toEqual({ message: "Invalid token.", error: "x" })
  })

  it("falls back to a generic message when the failure body is not JSON", async () => {
    const { client } = setup(new Response("<html>Bad Gateway</html>", { status: 502 }))
    const err = await client.createZugferdPdf("p", "<x/>").catch((e) => e)
    expect(err).toBeInstanceOf(RechnungsApiError)
    expect(err.status).toBe(502)
    expect(err.message).toBe("API request failed with status: 502")
    expect(err.body).toBeNull()
  })

  it("maps 412 to ValidationFailedError with the missing-field details", async () => {
    const { client } = setup(json({ message: "missing", noOfMissingData: 2, errorlist: ["a", "b"] }, { status: 412 }))
    const err = await client.createZugferdFromJson({}, "p").catch((e) => e)
    expect(err).toBeInstanceOf(ValidationFailedError)
    expect(err).toBeInstanceOf(RechnungsApiError)
    expect(err.status).toBe(412)
    expect(err.noOfMissingData).toBe(2)
    expect(err.errorlist).toEqual(["a", "b"])
  })

  it("a 412 without a JSON body still yields a ValidationFailedError", async () => {
    const { client } = setup(new Response("", { status: 412 }))
    const err = await client.createZugferdFromJson({}, "p").catch((e) => e)
    expect(err).toBeInstanceOf(ValidationFailedError)
    expect(err.noOfMissingData).toBe(0)
    expect(err.errorlist).toEqual([])
  })

  it("lets network errors through untouched", async () => {
    const client = new RechnungsApiClient({
      apiToken: "t",
      fetch: (async () => {
        throw new TypeError("network down")
      }) as unknown as typeof fetch,
    })
    await expect(client.validateXInvoiceXml("<x/>")).rejects.toThrow("network down")
  })

  it("never leaks the token into an error's message or body", async () => {
    const { client } = setup(json({ message: "nope" }, { status: 403 }), { apiToken: "tok_SECRET_VALUE" })
    const err = await client.validateXInvoiceXml("<x/>").catch((e) => e)
    expect(`${err.message} ${JSON.stringify(err.body)} ${String(err.stack).split("\n")[0]}`).not.toContain("tok_SECRET_VALUE")
  })
})

describe("validateXInvoiceXml response normalisation", () => {
  it("reads isValid directly and the `errors` alias", async () => {
    const { client } = setup(json({ isValid: true, errors: [{ message: "m" }] }))
    const res = await client.validateXInvoiceXml("<x/>")
    expect(res.isValid).toBe(true)
    expect(res.messages).toHaveLength(1)
  })

  it("treats a response with no validity flag as invalid", async () => {
    const { client } = setup(json({ message: "done" }))
    const res = await client.validateXInvoiceXml("<x/>")
    expect(res.isValid).toBe(false)
    expect(res.messages).toEqual([])
  })
})

describe("createZugferdFromPdf", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]) // "%PDF-1.7"
  const pdfResponse = (headers: Record<string, string> = {}) =>
    new Response(pdf, { status: 200, headers: { "content-type": "application/pdf", ...headers } })

  it("returns the PDF as base64 with the server's filename and reference", async () => {
    const { client } = setup(
      pdfResponse({ "content-disposition": 'attachment; filename="rechnung-zugferd.pdf"', "x-zugferd-reference": "ref-42" }),
    )
    const res = await client.createZugferdFromPdf("p64", "scan.png")
    expect(res).toEqual({
      ok: true,
      pdfBase64: Buffer.from(pdf).toString("base64"),
      fileName: "rechnung-zugferd.pdf",
      reference: "ref-42",
    })
  })

  it("derives the filename from the input when the server sends none", async () => {
    const { client } = setup(pdfResponse())
    expect(await client.createZugferdFromPdf("p64", "scan.final.png")).toMatchObject({ ok: true, fileName: "scan.final-zugferd.pdf", reference: "" })
  })

  it("falls back to invoice-zugferd.pdf when no name is known at all", async () => {
    const { client } = setup(pdfResponse())
    expect(await client.createZugferdFromPdf("p64")).toMatchObject({ ok: true, fileName: "invoice-zugferd.pdf" })
  })

  it("posts to the v2 host and sends fileName only when given", async () => {
    const a = setup(pdfResponse())
    await a.client.createZugferdFromPdf("p64")
    expect(a.last().url).toBe(`${V2}/createZugferdFromPdf`)
    expect(a.last().headers.Authorization).toBe("Bearer tok_123")
    expect(a.last().body).toEqual({ pdfInvoiceBase64: "p64" })

    const b = setup(pdfResponse())
    await b.client.createZugferdFromPdf("p64", "x.pdf")
    expect(b.last().body).toEqual({ pdfInvoiceBase64: "p64", fileName: "x.pdf" })
  })

  it("round-trips arbitrary bytes through base64 without corruption", async () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
    const { client } = setup(new Response(bytes, { status: 200, headers: { "content-type": "application/pdf" } }))
    const res = await client.createZugferdFromPdf("p64")
    expect(res.ok).toBe(true)
    if (res.ok) expect(Buffer.from(res.pdfBase64, "base64")).toEqual(Buffer.from(bytes))
  })

  it("returns the structured error envelope instead of throwing", async () => {
    const envelope = {
      success: false,
      error: { code: "PDF_NO_TEXT", stage: "analyse", httpStatus: 422, retryable: false, userMessage: "no text", detail: "d", reference: "r1" },
      email: { subject: "s", text: "t", html: "h" },
    }
    const { client } = setup(json(envelope, { status: 422 }))
    expect(await client.createZugferdFromPdf("p64")).toEqual({ ok: false, status: 422, body: envelope })
  })

  it("synthesises an UNKNOWN_ERROR envelope when the failure is not JSON", async () => {
    const { client } = setup(new Response("<html>Bad Gateway</html>", { status: 502, headers: { "x-zugferd-reference": "r9" } }))
    const res = await client.createZugferdFromPdf("p64")
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(502)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatchObject({ code: "UNKNOWN_ERROR", stage: "unknown", httpStatus: 502, reference: "r9", retryable: false })
    }
  })
})
