# Security policy

## Reporting a vulnerability

Please report security problems privately by email to **support@rechnungsapi.de** with the subject "Security". Don't open a public issue, and don't include real invoices or API tokens in your report. We will acknowledge your report and keep you informed while we look into it.

## Supported versions

Only the latest published version of `rechnungsapi-sdk` receives security fixes. Update with `npm install rechnungsapi-sdk@latest`.

## Keeping your token safe

Your RechnungsAPI token is personal. Keep it in an environment variable or a secret manager, never in source code, and never in a place that ships to browsers. If a token has been exposed, create a new one in your RechnungsAPI profile.
