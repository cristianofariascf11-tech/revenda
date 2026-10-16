import { formatCurrency } from "./format";

export const CATALOG_WHATSAPP_NUMBER = "5551999542906";
export const CATALOG_BASE_URL = "https://gv-revenda.vercel.app/catalogo";
export const CATALOG_SHARE_MESSAGE = `Olá! Confira as motos disponíveis na GV Moto Center:\n${CATALOG_BASE_URL}`;

export function catalogShareWhatsAppUrl() {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(CATALOG_SHARE_MESSAGE)}`;
}

type CatalogWhatsAppVehicle = {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
  askingPrice: number;
};

export function catalogWhatsAppMessage(vehicle: CatalogWhatsAppVehicle) {
  return [
    "Olá, tenho interesse nessa moto:",
    `${vehicle.brand} ${vehicle.model} — modelo ${vehicle.modelYear}`,
    `Valor: ${formatCurrency(vehicle.askingPrice).replace(/\u00a0/g, " ")}`,
    `${CATALOG_BASE_URL}/${vehicle.id}`,
  ].join("\n");
}

export function catalogWhatsAppUrl(vehicle: CatalogWhatsAppVehicle) {
  return `https://wa.me/${CATALOG_WHATSAPP_NUMBER}?text=${encodeURIComponent(catalogWhatsAppMessage(vehicle))}`;
}