import { describe, expect, it } from "vitest";
import { buildMarketplaceCaption } from "./marketplace-caption";

describe("legenda de marketplace", () => {
  it("combina descrição, benefícios selecionados e valor", () => {
    const caption = buildMarketplaceCaption({ brand: "Honda", model: "CG 160 Titan", modelYear: 2024, askingPrice: 18500, catalog_description: "Pneus e relação novos.", marketplace_reviewed: true, marketplace_warranty: true, marketplace_trade: true, marketplace_financing: true, marketplace_card_24x: true });
    expect(caption).toContain("Honda CG 160 Titan — 2024");
    expect(caption).toContain("Pneus e relação novos.");
    expect(caption).toContain("• Garantia de 3 meses");
    expect(caption).toContain("R$ 18.500,00");
  });

  it("omite benefícios desmarcados", () => {
    const caption = buildMarketplaceCaption({ brand: "Yamaha", model: "Fazer", modelYear: 2022, askingPrice: null, catalog_description: "", marketplace_reviewed: false, marketplace_warranty: false, marketplace_trade: true, marketplace_financing: false, marketplace_card_24x: false });
    expect(caption).toContain("• Aceitamos trocas mediante avaliação");
    expect(caption).not.toContain("Garantia de 3 meses");
    expect(caption).toContain("Valor: consulte");
  });
});