import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { formatCpf } from "./financing";

export type FinancingReceiptData = {
  saleId: string;
  customerName: string;
  customerCpf: string;
  vehicleCode: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePlate: string | null;
  installmentNumber: number;
  installmentCount: number;
  dueDate: string;
  paidAt: string;
  amount: number;
};

type BuildFinancingReceiptInput = { receipt: FinancingReceiptData; logoBytes: Uint8Array };

const orange = rgb(1, 0.39, 0);
const ink = rgb(0.08, 0.09, 0.11);
const muted = rgb(0.38, 0.4, 0.44);
const surface = rgb(0.965, 0.97, 0.975);
const border = rgb(0.84, 0.85, 0.87);
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function safeText(value: unknown) {
  return String(value ?? "").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "-");
}

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("pt-BR", includeTime
    ? { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }
    : { timeZone: "America/Sao_Paulo" }).format(new Date(includeTime ? value : `${value.slice(0, 10)}T12:00:00-03:00`));
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safeText(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  return lines;
}

function centeredX(text: string, font: PDFFont, size: number, width: number) {
  return (width - font.widthOfTextAtSize(safeText(text), size)) / 2;
}

export async function buildFinancingReceiptPdf({ receipt, logoBytes }: BuildFinancingReceiptInput) {
  const pdf = await PDFDocument.create();
  const receiptNumber = `GV-${receipt.saleId.slice(0, 8).toUpperCase()}-${String(receipt.installmentNumber).padStart(2, "0")}`;
  pdf.setTitle(`Recibo ${receiptNumber} - GV Moto Center`);
  pdf.setAuthor("GV Moto Center");
  pdf.setSubject("Recibo de parcela de financiamento próprio");
  pdf.setCreator("GV Revenda");

  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(logoBytes);

  page.drawRectangle({ x: 0, y: height - 9, width, height: 9, color: orange });
  const logoScale = Math.min(190 / logo.width, 92 / logo.height);
  const logoWidth = logo.width * logoScale;
  const logoHeight = logo.height * logoScale;
  page.drawImage(logo, { x: (width - logoWidth) / 2, y: height - 128, width: logoWidth, height: logoHeight });

  page.drawLine({ start: { x: 54, y: 686 }, end: { x: width - 54, y: 686 }, thickness: 1, color: border });
  const title = "RECIBO DE PAGAMENTO";
  page.drawText(title, { x: centeredX(title, bold, 17, width), y: 647, size: 17, font: bold, color: ink });

  page.drawRectangle({ x: 54, y: 550, width: width - 108, height: 66, color: surface, borderColor: border, borderWidth: 1 });
  page.drawText("MOTOCICLETA", { x: 70, y: 592, size: 8, font: bold, color: orange });
  page.drawText(safeText(`${receipt.vehicleBrand} ${receipt.vehicleModel} - ${receipt.vehicleYear}`), { x: 70, y: 569, size: 13, font: bold, color: ink });
  const identification = `${receipt.vehicleCode} - ${receipt.vehiclePlate ?? "sem placa"}`;
  page.drawText(safeText(identification), { x: width - 70 - bold.widthOfTextAtSize(safeText(identification), 10), y: 571, size: 10, font: bold, color: muted });

  page.drawText("DECLARAÇÃO", { x: 54, y: 505, size: 9, font: bold, color: orange });
  const statement = `Declaramos ter recebido de ${receipt.customerName}, CPF ${formatCpf(receipt.customerCpf)}, a importância de ${currency.format(receipt.amount)}, referente ao pagamento da parcela ${receipt.installmentNumber} de ${receipt.installmentCount} da motocicleta acima identificada, com vencimento em ${formatDate(receipt.dueDate)}.`;
  wrapText(statement, regular, 12, width - 108).forEach((line, index) => page.drawText(line, { x: 54, y: 474 - index * 21, size: 12, font: regular, color: ink }));

  page.drawText(`Pagamento registrado em ${formatDate(receipt.paidAt, true)}.`, { x: 54, y: 364, size: 10, font: regular, color: muted });

  page.drawLine({ start: { x: 155, y: 235 }, end: { x: 440, y: 235 }, thickness: 1, color: ink });
  const company = "GV MOTO CENTER";
  page.drawText(company, { x: centeredX(company, bold, 10, width), y: 215, size: 10, font: bold, color: ink });
  const signature = "Assinatura do responsável";
  page.drawText(signature, { x: centeredX(signature, regular, 8, width), y: 200, size: 8, font: regular, color: muted });

  return pdf.save();
}