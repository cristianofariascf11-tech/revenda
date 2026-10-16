import { describe, expect, it } from "vitest";
import { CATALOG_BASE_URL, CATALOG_SHARE_MESSAGE, catalogShareWhatsAppUrl, catalogWhatsAppMessage, catalogWhatsAppUrl } from "./catalog-whatsapp";

describe("contato do catálogo", () => {
  const vehicle = {
    id: "7734c07f-7ed1-40a9-8184-b198698c247c",
    brand: "SUZUKI",
    model: "GSX 1250 F",
    modelYear: 2014,
    askingPrice: 36900,
  };

  it("abre o número correto e identifica a motocicleta consultada", () => {
    const url = new URL(catalogWhatsAppUrl(vehicle));
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/5551999542906");
    expect(url.searchParams.get("text")).toBe(catalogWhatsAppMessage(vehicle));
  });

  it("inclui modelo, ano, valor e link direto do anúncio", () => {
    const message = catalogWhatsAppMessage(vehicle);
    expect(message).toContain("SUZUKI GSX 1250 F — modelo 2014");
    expect(message).toContain("Valor: R$ 36.900,00");
    expect(message).toContain(`${CATALOG_BASE_URL}/${vehicle.id}`);
  });

  it("gera um compartilhamento geral do catálogo pelo WhatsApp", () => {
    const url = new URL(catalogShareWhatsAppUrl());
    expect(url.origin).toBe("https://api.whatsapp.com");
    expect(url.pathname).toBe("/send");
    expect(url.searchParams.get("text")).toBe(CATALOG_SHARE_MESSAGE);
    expect(CATALOG_SHARE_MESSAGE).toContain(CATALOG_BASE_URL);
  });
});