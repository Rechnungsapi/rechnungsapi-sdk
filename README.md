# rechnungsapi-sdk

The official TypeScript/JavaScript SDK for **[RechnungsAPI](https://rechnungsapi.de)** — the ZUGFeRD & XRechnung API from [rechnungsapi.de](https://rechnungsapi.de). Create e-invoices from JSON, validate them, extract the data from PDFs and scans, and send them by email, all from your own code.

This SDK talks to **rechnungsapi.de** only, so you need a RechnungsAPI account and API token to use it.

[Website](https://rechnungsapi.de) · [API documentation](https://rechnungsapi.de/api-docs) · [MCP server for AI agents](https://www.npmjs.com/package/rechnungsapi-mcp) · [Support](mailto:support@rechnungsapi.de)

## Install

```bash
npm install rechnungsapi-sdk
```

## Documentation

The complete API reference — every endpoint with its request, response and error codes — is at **[rechnungsapi.de/api-docs](https://rechnungsapi.de/api-docs)** (English and German).

- [Authentication](https://rechnungsapi.de/api-docs#authentication) — how the Bearer token is sent
- [Quickstart](https://rechnungsapi.de/api-docs#quickstart) — your first call in under a minute
- [Endpoints](https://rechnungsapi.de/api-docs#endpoints) — request and response of every endpoint
- [Invoice object reference](https://rechnungsapi.de/api-docs#invoice-object) — all invoice fields (EN 16931 business terms)
- [Email transport](https://rechnungsapi.de/api-docs#email-transport) — generate and send an invoice in one call
- [Errors](https://rechnungsapi.de/api-docs#errors) — HTTP status codes and validation results
- [MCP server & SDK](https://rechnungsapi.de/api-docs#mcp-sdk) — using RechnungsAPI from AI agents

## Get an API token

Every request needs your own Bearer token — there's no shared or default token.

1. [Sign in](https://rechnungsapi.de/login) to the RechnungsAPI dashboard ([sign up](https://rechnungsapi.de/register) if you don't have an account yet).
2. Open your **Profile** page and copy the API token at the bottom.
3. Store it as an environment variable — never hardcode it or commit it to source control:
   ```bash
   # .env
   RECHNUNGSAPI_TOKEN=your-token-here
   ```

See [Authentication](https://rechnungsapi.de/api-docs#authentication) in the API documentation for how the token is sent.

## Usage

```ts
import { RechnungsApiClient } from "rechnungsapi-sdk"

const client = new RechnungsApiClient({ apiToken: process.env.RECHNUNGSAPI_TOKEN! })

// Create a ZUGFeRD PDF from structured invoice JSON
const result = await client.createZugferdFromJson(
  { invoiceNumber: "RE-2026-001", /* ... */ },
  invoicePdfBase64,
)

// Validate an XRechnung XML document
const validation = await client.validateXRechnungXml(xmlString)
if (!validation.isValid) {
  console.log(validation.messages)
}

// Extract structured JSON from a scanned/PDF invoice
const extracted = await client.analyzePdfInvoiceV2(pdfBase64, /* withLineItems */ true)
```

The invoice objects you pass in follow EN 16931 — the [Invoice Object Reference](https://rechnungsapi.de/api-docs#invoice-object) lists every field and which ones are mandatory. To have a generated invoice emailed in the same call, pass a `transport` option (see [Email Transport](https://rechnungsapi.de/api-docs#email-transport)).

By default the client talks to the production gateway (`https://api.rechnungsapi.de`). To point it at a different gateway, pass `baseUrl`:

```ts
const client = new RechnungsApiClient({
  apiToken: process.env.RECHNUNGSAPI_TOKEN!,
  baseUrl: "https://your-gateway.example.com",
})
```

## API

| Method | Description | API docs |
|---|---|---|
| `createZugferdFromJson(invoice, invoicePdf64, options?)` | Create a ZUGFeRD PDF/A-3 from structured invoice JSON | [docs](https://rechnungsapi.de/api-docs#createZugferdFromJson) |
| `createXRechnungFromJson(invoice, options?)` | Create an XRechnung XML from structured invoice JSON | [docs](https://rechnungsapi.de/api-docs#createXinvoiceFromJson) |
| `createZugferdPdf(invoicePdf64, xrechnungXml)` | Embed an existing XRechnung XML into a visual PDF | [docs](https://rechnungsapi.de/api-docs#createZugferdPdfFromXinvoice) |
| `extractXRechnungFromZugferd(zugferd64)` | Extract the embedded XRechnung XML from a ZUGFeRD PDF as JSON | [docs](https://rechnungsapi.de/api-docs#extractXInvoiceFromZugferdToJson) |
| `validateXRechnungXml(xml)` | Validate an XRechnung XML against schema and business rules | [docs](https://rechnungsapi.de/api-docs#validateXinvoiceXML) |
| `validateZugferdPdf(zugferdFile64, options?)` | Validate a ZUGFeRD PDF's embedded XML | [docs](https://rechnungsapi.de/api-docs#validateZugferdPdf) |
| `analyzePdfInvoice(pdfBase64)` | Extract structured JSON from a PDF/scanned invoice (sync) | [docs](https://rechnungsapi.de/api-docs#createJSONFromAnalysedPdf) |
| `analyzePdfInvoiceV2(pdfBase64, withLineItems?)` | High-accuracy analyzer, optional line-item extraction | [docs](https://rechnungsapi.de/api-docs#createJSONFromAnalysedPdfV2) |
| `analyzePdfInvoiceAsync(pdfBase64, withLineItems?)` / `getAnalysisStatus(jobId)` | Async analysis for large files | [submit](https://rechnungsapi.de/api-docs#createJSONFromAnalysedPdfAsync) / [status](https://rechnungsapi.de/api-docs#rechnungsapiInvoiceAsyncStatus) |
| `createZugferdFromPdf(pdfBase64, fileName?)` | Convert a PDF/scan directly into a validated ZUGFeRD PDF | [docs](https://rechnungsapi.de/api-docs#createZugferdFromPdf) |

Errors are thrown as `RechnungsApiError` (with `.status` and `.body`), or `ValidationFailedError` for HTTP 412 responses (missing mandatory invoice fields). What each status code means is described under [Errors](https://rechnungsapi.de/api-docs#errors) in the API documentation.

## Development

```bash
yarn install
yarn test
yarn build
```

## License

MIT © RechnungsAPI · [rechnungsapi.de](https://rechnungsapi.de) · support@rechnungsapi.de
