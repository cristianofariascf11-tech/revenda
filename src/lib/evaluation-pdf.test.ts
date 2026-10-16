import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEvaluationPdf } from "./evaluation-pdf";

describe("PDF da avaliação", () => {
  it("gera um documento PDF válido e completo", async () => {
    const logo = new Uint8Array(readFileSync(resolve(process.cwd(), "public/logo-gv.png")));
    const pdf = await buildEvaluationPdf({
      logoBytes: logo,
      photoBytes: logo,
      evaluation: {
        plate: "ABC1D23",
        brand: "Honda",
        model: "CG 160 Titan",
        modelYear: 2025,
        chassis: "******1234",
        engineNumber: "KC16E2******",
        fipeValue: 24500,
        discountPercent: 20,
        additionalCosts: { tires: 450, documents: 250, workshop: 600, detailing: 180, transport: 120, others: 0 },
        additionalCostsTotal: 1600,
        suggestedOffer: 18000,
        createdAt: "2026-07-13T12:00:00.000Z",
      },
    });

    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(10_000);

    if (process.env.WRITE_PDF_PREVIEW === "1") {
      const previewDir = resolve(process.cwd(), "tmp/pdfs");
      mkdirSync(previewDir, { recursive: true });
      writeFileSync(resolve(previewDir, "avaliacao-exemplo.pdf"), pdf);
    }
  });
});