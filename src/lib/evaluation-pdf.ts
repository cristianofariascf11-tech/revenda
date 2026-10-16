import { PDFDocument, PDFFont, PDFImage, StandardFonts, rgb } from "pdf-lib";
import type { EvaluationCosts } from "@/lib/types";

export type EvaluationPdfData = {
  plate: string;
  brand: string;
  model: string;
  modelYear: number;
  chassis?: string | null;
  engineNumber?: string | null;
  fipeValue: number;
  discountPercent: number;
  additionalCosts: EvaluationCosts;
  additionalCostsTotal: number;
  suggestedOffer: number;
  createdAt: string;
};

type BuildEvaluationPdfInput = {
  evaluation: EvaluationPdfData;
  logoBytes: Uint8Array;
  photoBytes?: Uint8Array;
};

const orange = rgb(1, 0.39, 0);
const ink = rgb(0.08, 0.09, 0.11);
const muted = rgb(0.38, 0.4, 0.44);
const surface = rgb(0.96, 0.965, 0.972);
const border = rgb(0.86, 0.87, 0.89);
const white = rgb(1, 1, 1);

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function safeText(value: unknown) {
  return String(value ?? "").replace(/[^ -~ -ÿ]/g, "-");
}

function identifierText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "Não informado";
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const clean = safeText(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let shortened = clean;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}...`, size) > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened.trim()}...`;
}

function drawContainedImage(page: ReturnType<PDFDocument["addPage"]>, image: PDFImage, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  page.drawImage(image, { x: x + (width - drawWidth) / 2, y: y + (height - drawHeight) / 2, width: drawWidth, height: drawHeight });
}

async function embedImage(pdf: PDFDocument, bytes: Uint8Array) {
  try {
    return await pdf.embedJpg(bytes);
  } catch {
    return pdf.embedPng(bytes);
  }
}

export async function buildEvaluationPdf({ evaluation, logoBytes, photoBytes }: BuildEvaluationPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Avaliação ${evaluation.plate} - GV Moto Center`);
  pdf.setAuthor("GV Moto Center");
  pdf.setSubject("Proposta de avaliação de motocicleta");
  pdf.setCreator("GV Revenda");

  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(logoBytes);

  page.drawRectangle({ x: 0, y: height - 12, width, height: 12, color: orange });
  drawContainedImage(page, logo, 40, height - 102, 160, 76);
  page.drawText("PROPOSTA DE AVALIAÇÃO", { x: 326, y: height - 52, size: 9, font: bold, color: orange });
  page.drawText("Oferta de compra", { x: 326, y: height - 77, size: 20, font: bold, color: ink });
  page.drawText(`Emitida em ${new Date(evaluation.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, { x: 326, y: height - 96, size: 9, font: regular, color: muted });
  page.drawLine({ start: { x: 40, y: height - 118 }, end: { x: width - 40, y: height - 118 }, thickness: 1, color: border });

  const vehicleY = 555;
  page.drawRectangle({ x: 40, y: vehicleY, width: width - 80, height: 150, color: surface, borderColor: border, borderWidth: 1 });
  page.drawRectangle({ x: 52, y: vehicleY + 12, width: 198, height: 126, color: white, borderColor: border, borderWidth: 1 });
  if (photoBytes) {
    const photo = await embedImage(pdf, photoBytes);
    drawContainedImage(page, photo, 56, vehicleY + 16, 190, 118);
  } else {
    page.drawText("FOTO NÃO INFORMADA", { x: 91, y: vehicleY + 72, size: 9, font: bold, color: muted });
  }

  page.drawText(safeText(evaluation.plate), { x: 276, y: vehicleY + 112, size: 10, font: bold, color: orange });
  page.drawText(fitText(`${evaluation.brand} ${evaluation.model}`, bold, 18, 265), { x: 276, y: vehicleY + 82, size: 18, font: bold, color: ink });
  page.drawText(`Ano/modelo ${evaluation.modelYear}`, { x: 276, y: vehicleY + 58, size: 11, font: regular, color: muted });
  page.drawText(fitText(`Chassi: ${identifierText(evaluation.chassis)}`, regular, 9, 265), { x: 276, y: vehicleY + 36, size: 9, font: regular, color: muted });
  page.drawText(fitText(`Motor: ${identifierText(evaluation.engineNumber)}`, regular, 9, 265), { x: 276, y: vehicleY + 19, size: 9, font: regular, color: muted });

  page.drawText("RESUMO DA AVALIAÇÃO", { x: 40, y: 525, size: 10, font: bold, color: orange });
  const metrics = [
    ["Valor FIPE", currency.format(evaluation.fipeValue)],
    ["Percentual aplicado", `${evaluation.discountPercent}% abaixo`],
    ["Ajustes previstos", currency.format(evaluation.additionalCostsTotal)],
  ];
  metrics.forEach(([label, value], index) => {
    const x = 40 + index * 176;
    page.drawRectangle({ x, y: 445, width: 163, height: 64, color: surface, borderColor: border, borderWidth: 1 });
    page.drawText(label, { x: x + 12, y: 486, size: 8, font: regular, color: muted });
    page.drawText(fitText(value, bold, 14, 139), { x: x + 12, y: 462, size: 14, font: bold, color: ink });
  });

  page.drawText("COMPOSIÇÃO DOS AJUSTES", { x: 40, y: 414, size: 10, font: bold, color: orange });
  const costItems: Array<[string, number]> = [
    ["Pneus", evaluation.additionalCosts.tires],
    ["Documentação", evaluation.additionalCosts.documents],
    ["Oficina", evaluation.additionalCosts.workshop],
    ["Estética", evaluation.additionalCosts.detailing],
    ["Transporte", evaluation.additionalCosts.transport],
    ["Outros", evaluation.additionalCosts.others],
  ];
  costItems.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 40 + column * 264;
    const y = 376 - row * 34;
    page.drawText(label, { x, y, size: 9, font: regular, color: muted });
    page.drawText(currency.format(value), { x: x + 150, y, size: 9, font: bold, color: ink });
    page.drawLine({ start: { x, y: y - 10 }, end: { x: x + 245, y: y - 10 }, thickness: 0.6, color: border });
  });

  page.drawRectangle({ x: 40, y: 190, width: width - 80, height: 92, color: orange });
  page.drawText("OFERTA SUGERIDA", { x: 58, y: 252, size: 10, font: bold, color: white });
  page.drawText(currency.format(evaluation.suggestedOffer), { x: 58, y: 215, size: 27, font: bold, color: white });
  page.drawText("Valor estimado após aplicação do percentual e dos ajustes previstos.", { x: 280, y: 225, size: 8, font: regular, color: white });

  page.drawText("CONDIÇÕES", { x: 40, y: 154, size: 9, font: bold, color: orange });
  page.drawText("Esta proposta é uma estimativa e está sujeita à conferência presencial da motocicleta,", { x: 40, y: 134, size: 9, font: regular, color: muted });
  page.drawText("análise documental e validação das condições informadas. Não constitui obrigação de compra.", { x: 40, y: 119, size: 9, font: regular, color: muted });

  page.drawLine({ start: { x: 40, y: 74 }, end: { x: width - 40, y: 74 }, thickness: 1, color: border });
  page.drawText("GV MOTO CENTER", { x: 40, y: 50, size: 9, font: bold, color: ink });
  page.drawText("#FamiliaGV", { x: 40, y: 36, size: 8, font: regular, color: orange });
  page.drawText(`Placa ${safeText(evaluation.plate)}`, { x: width - 120, y: 43, size: 8, font: regular, color: muted });

  return pdf.save();
}