import type { VehicleMarketplace } from "./types";

type MarketplaceCaptionVehicle = VehicleMarketplace & {
  brand: string;
  model: string;
  modelYear: number;
  askingPrice: number | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function marketplaceBenefits(vehicle: VehicleMarketplace) {
  return [
    vehicle.marketplace_reviewed && "Revisada",
    vehicle.marketplace_warranty && "Garantia de 3 meses",
    vehicle.marketplace_trade && "Aceitamos trocas mediante avaliação",
    vehicle.marketplace_financing && "Financiamento nas principais financeiras",
    vehicle.marketplace_card_24x && "Cartões em até 24x — consulte condições",
  ].filter((item): item is string => Boolean(item));
}

export function buildMarketplaceCaption(vehicle: MarketplaceCaptionVehicle) {
  const benefits = marketplaceBenefits(vehicle);
  return [
    `${vehicle.brand} ${vehicle.model} — ${vehicle.modelYear}`,
    "",
    vehicle.catalog_description || "Motocicleta disponível e pronta para rodar.",
    benefits.length ? "" : null,
    ...benefits.map(item => `• ${item}`),
    "",
    `Valor: ${vehicle.askingPrice == null ? "consulte" : currency.format(vehicle.askingPrice)}`,
    "",
    "GV Moto Center — Gravataí/RS",
    "WhatsApp: (51) 99954-2906",
  ].filter(line => line !== null).join("\n");
}