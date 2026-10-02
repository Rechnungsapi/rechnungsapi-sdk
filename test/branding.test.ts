import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const pkg = JSON.parse(read("package.json")) as {
  description: string
  keywords: string[]
  homepage: string
  author: { name: string; email: string; url: string }
}
const readme = read("README.md")

/** What a reader of the npm page can see: the README with link targets removed. */
const visibleText = (markdown: string) => markdown.replace(/\]\([^)]*\)/g, "]")

describe("this package presents itself as RechnungsAPI (rechnungsapi.de)", () => {
  it("says so in the npm description, homepage and author", () => {
    expect(pkg.description).toContain("RechnungsAPI")
    expect(pkg.description).toContain("rechnungsapi.de")
    expect(pkg.homepage).toMatch(/^https:\/\/rechnungsapi\.de(\/|$)/)
    expect(pkg.author).toMatchObject({ name: "RechnungsAPI", email: "support@rechnungsapi.de", url: "https://rechnungsapi.de" })
    expect(pkg.keywords).toEqual(expect.arrayContaining(["rechnungsapi", "rechnungsapi.de", "zugferd", "xrechnung"]))
  })

  it("opens the README with what this is and where it comes from", () => {
    const opening = readme.slice(0, 700)
    expect(opening).toContain("RechnungsAPI")
    expect(opening).toContain("rechnungsapi.de")
    expect(readme).toContain("https://rechnungsapi.de/api-docs")
    expect(readme).toContain("support@rechnungsapi.de")
  })

  it("keeps the term another vendor uses as its product name out of what readers see", () => {
    // "X-Invoice" / "xinvoice" is another company's brand. The gateway's own route and field names
    // (createXinvoiceFromJson, xinvoiceXML, ...) stay in the source because they are the API contract.
    const metadata = [pkg.description, ...pkg.keywords].join("\n")
    expect(metadata).not.toMatch(/x-?invoice/i)
    expect(visibleText(readme)).not.toMatch(/x-?invoice/i)
  })
})
