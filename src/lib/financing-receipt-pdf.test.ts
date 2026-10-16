import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildFinancingReceiptPdf } from "./financing-receipt-pdf";

describe("recibo PDF do financiamento", () => {
  it("gera um recibo válido, identificado e pronto para impressão", async () => {
    const logoBytes = new Uint8Array(readFileSync(resolve(process.cwd(), "public/logo-gv.png")));
    const pdf = await buildFinancingReceiptPdf({
      logoBytes,
      receipt: {
        saleId: "9f44c935-4d24-45b3-9464-daa6a124af44",
        customerName: "Cristiano da Silva",
        customerCpf: "12345678901",
        vehicleCode: "GV-000123",
        vehicleBrand: "Honda",
        vehicleModel: "CG 160 Titan",
        vehicleYear: 2025,
        vehiclePlate: "ABC1D23",
        installmentNumber: 7,
        installmentCount: 30,
        dueDate: "2026-07-10",
        paidAt: "2026-07-13T14:30:00.000Z",
        amount: 500,
      },
    });

    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(10_000);
    const document = await PDFDocument.load(pdf);
    expect(document.getPageCount()).toBe(1);
    expect(document.getTitle()).toContain("Recibo GV-");

    if (process.env.WRITE_PDF_PREVIEW === "1") {
      const previewDir = resolve(process.cwd(), "tmp/pdfs");
      mkdirSync(previewDir, { recursive: true });
      writeFileSync(resolve(previewDir, "recibo-financiamento-exemplo.pdf"), pdf);
    }
  });
});