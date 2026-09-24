# rechnungsapi-sdk

Official TypeScript/JavaScript SDK for [RechnungsAPI](https://rechnungsapi.de) — create, validate, and analyze ZUGFeRD (PDF/A-3) and X-Invoice (XRechnung/UBL) e-invoices.

## Install

```bash
npm install rechnungsapi-sdk
```

## Get an API token

Every request needs your own Bearer token — there's no shared or default token.

1. Sign in to the dashboard at [rechnungsapi.de](https://rechnungsapi.de) (sign up if you don't have an account yet).
2. Open your **Profile** page and copy the API token at the bottom.
3. Store it as an environment variable — never hardcode it or commit it to source control:
   ```bash
   # .env
   RECHNUNGSAPI_TOKEN=your-token-here
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

By default the client talks to the production gateway. To test against a sandbox instead (if your account has one), pass `baseUrl`:

```ts
const client = new RechnungsApiClient({
  apiToken: process.env.RECHNUNGSAPI_TOKEN!,
  baseUrl: "https://your-gateway.example.com",
})
```

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
