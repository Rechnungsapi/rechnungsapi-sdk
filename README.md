# rechnungsapi-sdk

Official TypeScript/JavaScript SDK for [RechnungsAPI](https://rechnungsapi.de) — create, validate, and analyze ZUGFeRD (PDF/A-3) and X-Invoice (XRechnung/UBL) e-invoices.

## Install

```bash
npm install rechnungsapi-sdk
```

## Usage

```ts
import { RechnungsApiClient } from "rechnungsapi-sdk"

const client = new RechnungsApiClient({ apiToken: process.env.RECHNUNGSAPI_TOKEN! })

// Create a ZUGFeRD PDF from structured invoice JSON
const result = await client.createZugferdFromJson(
  { invoiceNumber: "RE-2026-001", /* ... */ },
  invoicePdfBase64,
)

// Validate an X-Invoice XML document
const validation = await client.validateXInvoiceXml(xmlString)
if (!validation.isValid) {
  console.log(validation.messages)
}

// Extract structured JSON from a scanned/PDF invoice
const extracted = await client.analyzePdfInvoiceV2(pdfBase64, /* withLineItems */ true)
```

Get your API token from the [RechnungsAPI dashboard](https://rechnungsapi.de).

## API

| Method | Description |
|---|---|
| `createZugferdFromJson(invoice, invoicePdf64, options?)` | Create a ZUGFeRD PDF/A-3 from structured invoice JSON |
| `createXInvoiceFromJson(invoice, options?)` | Create an X-Invoice (XRechnung/UBL) XML from structured invoice JSON |
| `createZugferdPdf(invoicePdf64, xInvoiceXml)` | Embed an existing X-Invoice XML into a visual PDF |
| `extractXInvoiceFromZugferd(zugferd64)` | Extract the embedded XRechnung XML from a ZUGFeRD PDF as JSON |
| `validateXInvoiceXml(xml)` | Validate an X-Invoice XML against schema and business rules |
| `validateZugferdPdf(zugferdFile64, options?)` | Validate a ZUGFeRD PDF's embedded XML |
| `analyzePdfInvoice(pdfBase64)` | Extract structured JSON from a PDF/scanned invoice (sync) |
| `analyzePdfInvoiceV2(pdfBase64, withLineItems?)` | High-accuracy analyzer, optional line-item extraction |
| `analyzePdfInvoiceAsync(pdfBase64, withLineItems?)` / `getAnalysisStatus(jobId)` | Async analysis for large files |
| `createZugferdFromPdf(pdfBase64, fileName?)` | Convert a PDF/scan directly into a validated ZUGFeRD PDF |

Errors are thrown as `RechnungsApiError` (with `.status` and `.body`), or `ValidationFailedError` for HTTP 412 responses (missing mandatory invoice fields).

## Development

```bash
yarn install
yarn test
yarn build
```

## License

MIT
