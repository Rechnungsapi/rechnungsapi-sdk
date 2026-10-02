<p align="center">
  <a href="https://rechnungsapi.de"><img src="https://raw.githubusercontent.com/Rechnungsapi/rechnungsapi-sdk/main/assets/banner.svg" alt="RechnungsAPI: the XRechnung and ZUGFeRD API for developers" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/rechnungsapi-sdk"><img src="https://img.shields.io/npm/v/rechnungsapi-sdk?color=2563eb&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/rechnungsapi-sdk"><img src="https://img.shields.io/npm/dm/rechnungsapi-sdk?color=2563eb&label=downloads" alt="npm downloads per month"></a>
  <a href="https://github.com/Rechnungsapi/rechnungsapi-sdk/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Rechnungsapi/rechnungsapi-sdk/ci.yml?branch=main&label=tests" alt="tests"></a>
  <img src="https://img.shields.io/badge/TypeScript-types%20included-3178c6" alt="TypeScript types included">
  <img src="https://img.shields.io/badge/runtime%20dependencies-0-16a34a" alt="zero runtime dependencies">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a" alt="MIT license"></a>
</p>

<h1 align="center">rechnungsapi-sdk</h1>

<p align="center">
  <b>E-invoices in a few lines of code.</b><br>
  The official TypeScript/JavaScript SDK for <a href="https://rechnungsapi.de">RechnungsAPI</a>: create, validate and read ZUGFeRD and XRechnung invoices.
</p>

Germany's e-invoicing obligation (E-Rechnungspflicht) is being phased in, and structured invoices such as XRechnung and ZUGFeRD are becoming the standard. **RechnungsAPI** is the REST API that takes care of the hard parts, and this SDK is the quickest way to use it from Node.js, serverless functions and any TypeScript backend.

**[Start free](https://rechnungsapi.de/register)** · [Try the free XRechnung validator](https://rechnungsapi.de/xrechnung-validator-online-kostenlos) · [Pricing](https://rechnungsapi.de/pricing) · [Documentation](https://rechnungsapi.de/api-docs)

## What you can do

| | |
|---|---|
| **Create** | Turn invoice JSON into a ZUGFeRD PDF/A-3 or an XRechnung XML, using your own invoice templates |
| **Validate** | Check XRechnung XML and ZUGFeRD PDFs against the schema and the business rules before you send them |
| **Read** | Extract structured data from PDFs, scans and photos of invoices with AI-powered recognition |
| **Convert** | A scan or PDF goes in, a validated ZUGFeRD PDF comes out, in one call |
| **Send** | Generate the invoice and email it in the same call, DKIM-signed, without any mail infrastructure of your own |

## Quick start

```bash
npm install rechnungsapi-sdk
```

1. [Create a free account](https://rechnungsapi.de/register), open your **Profile** and copy your API token.
2. Keep it in an environment variable and never commit it: `RECHNUNGSAPI_TOKEN=your-token-here`
3. Make your first calls:

```ts
import { RechnungsApiClient } from "rechnungsapi-sdk"

const client = new RechnungsApiClient({ apiToken: process.env.RECHNUNGSAPI_TOKEN! })

// 1. Create a ZUGFeRD e-invoice (a PDF with the structured XML embedded) from your invoice data
const zugferd = await client.createZugferdFromJson(
  { invoiceNumber: "RE-2026-001", /* seller, buyer, lines, totals ... */ },
  invoicePdfBase64, // your invoice layout as a base64 PDF
)

// 2. Validate an XRechnung before you send it
const validation = await client.validateXRechnungXml(xmlString)
if (!validation.isValid) {
  console.log(validation.messages)
}

// 3. Turn a scan or a PDF invoice into structured data
const extracted = await client.analyzePdfInvoiceV2(pdfBase64, /* withLineItems */ true)
```

The invoice objects follow EN 16931. The [Invoice Object Reference](https://rechnungsapi.de/api-docs#invoice-object) lists every field and which ones are mandatory.

### Generate and send in one call

Add a `transport` option and the generated invoice is emailed in the same call:

```ts
await client.createXRechnungFromJson(
  { invoiceNumber: "RE-2026-002", /* ... */ },
  {
    transport: {
      type: "email",
      useTransport: true,
      sender: "invoices@your-domain.com",
      senderName: "Your Company",
      receiver: "accounting@customer.com",
      subject: "Invoice {invoicenumber} from {invoicedate}",
      message: "<p>Hello, please find invoice {invoicenumber} attached.</p>",
    },
  },
)
```

Email delivery is switched on per account and needs your sender domain authenticated once. See [Email Transport](https://rechnungsapi.de/api-docs#email-transport).

## Why RechnungsAPI

- **One API for the formats that matter.** ZUGFeRD, XRechnung and Factur-X compliant.
- **Compliance built in.** Built for EN 16931, GoBD and GDPR, with data processed on German servers.
- **Works with what you have.** Keep your existing PDF layouts and workflows; it is a plain REST API, so it fits ERP systems and custom software alike.
- **Developer first.** A typed SDK with zero runtime dependencies, documentation in English and German, and an AI integration assistant on [rechnungsapi.de](https://rechnungsapi.de) that maps your fields and writes code stubs.
- **Free to start.** Try it without a credit card.

## Built for

- **Small and medium businesses** that want to modernise invoicing without changing how they work.
- **Software vendors and IT teams** adding e-invoicing to an ERP or a custom system.
- **Tax advisors** who help clients move to e-invoices.

## Use it from AI agents

Prefer to let your AI assistant do the work? [`rechnungsapi-mcp`](https://www.npmjs.com/package/rechnungsapi-mcp) is the official MCP server for RechnungsAPI. Connect it once, then ask in plain language to validate an XRechnung, read a scanned invoice or create a ZUGFeRD PDF.

## API reference

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

By default the client talks to the production gateway (`https://api.rechnungsapi.de`). To point it at a different gateway, pass `baseUrl`:

```ts
const client = new RechnungsApiClient({
  apiToken: process.env.RECHNUNGSAPI_TOKEN!,
  baseUrl: "https://your-gateway.example.com",
})
```

## Documentation

The complete API reference, with every endpoint, request, response and error code, is at **[rechnungsapi.de/api-docs](https://rechnungsapi.de/api-docs)** (English and German).

- [Authentication](https://rechnungsapi.de/api-docs#authentication): how the Bearer token is sent
- [Quickstart](https://rechnungsapi.de/api-docs#quickstart): your first call in under a minute
- [Endpoints](https://rechnungsapi.de/api-docs#endpoints): request and response of every endpoint
- [Invoice object reference](https://rechnungsapi.de/api-docs#invoice-object): all invoice fields (EN 16931 business terms)
- [Email transport](https://rechnungsapi.de/api-docs#email-transport): generate and send an invoice in one call
- [Errors](https://rechnungsapi.de/api-docs#errors): HTTP status codes and validation results
- [MCP server & SDK](https://rechnungsapi.de/api-docs#mcp-sdk): using RechnungsAPI from AI agents

## Start free

RechnungsAPI is free to start, with no credit card required. [Create your account](https://rechnungsapi.de/register), copy your token and make your first call in minutes. Questions about plans, integration or your project? [Talk to us](https://rechnungsapi.de/contact) or write to support@rechnungsapi.de.

## Development

```bash
yarn install
yarn test
yarn build
```

Found a security problem? Please read [SECURITY.md](SECURITY.md).

## License

MIT © RechnungsAPI · [rechnungsapi.de](https://rechnungsapi.de) · support@rechnungsapi.de
