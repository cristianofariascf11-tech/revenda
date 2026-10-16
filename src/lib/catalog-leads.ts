import { z } from "zod";
import { CATALOG_BASE_URL, CATALOG_WHATSAPP_NUMBER } from "./catalog-whatsapp";

export const LEAD_INTEREST_TYPES = ["atendimento", "financiamento"] as const;
export const LEAD_STATUSES = ["novo", "contatado", "convertido", "descartado"] as const;

export type LeadInterestType = typeof LEAD_INTEREST_TYPES[number];
export type LeadStatus = typeof LEAD_STATUSES[number];

export const LEAD_INTEREST_LABEL: Record<LeadInterestType, string> = {
  atendimento: "Falar com atendente",
  financiamento: "Simular financiamento",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  convertido: "Convertido",
  descartado: "Descartado",
};

export function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function ageFromBirthDate(value: string, today = new Date()) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return Number.NaN;
  let age = today.getUTCFullYear() - year;
  const birthdayPending = today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  if (birthdayPending) age -= 1;
  return age;
}

const optionalDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida")])
  .optional().nullable().transform(value => value || null);
const optionalCpf = z.string().optional().nullable().transform(value => value?.replace(/\D/g, "") || null);

export const catalogLeadSchema = z.object({
  vehicleId: z.string().uuid("Motocicleta inválida"),
  interestType: z.enum(LEAD_INTEREST_TYPES),
  fullName: z.string().trim().min(3, "Informe seu nome completo").max(160),
  age: z.coerce.number().int().min(18, "É necessário ter pelo menos 18 anos").max(100, "Idade inválida"),
  phone: z.string().transform(value => value.replace(/\D/g, "")).refine(value => /^\d{10,11}$/.test(value), "Informe um telefone com DDD"),
  city: z.string().trim().min(2, "Informe sua cidade").max(120),
  birthDate: optionalDate,
  cpf: optionalCpf,
  hasProvenIncome: z.boolean().optional().nullable(),
  hasCnhA: z.boolean().optional().nullable(),
  privacyAcknowledged: z.literal(true, { error: "Confirme o aviso de privacidade" }),
  marketingConsent: z.boolean().default(false),
  website: z.string().max(0).optional().default(""),
}).superRefine((values, context) => {
  if (values.interestType !== "financiamento") return;
  if (!values.birthDate) context.addIssue({ code: "custom", path: ["birthDate"], message: "Informe sua data de nascimento" });
  if (!values.cpf || !isValidCpf(values.cpf)) context.addIssue({ code: "custom", path: ["cpf"], message: "Informe um CPF válido" });
  if (values.hasProvenIncome == null) context.addIssue({ code: "custom", path: ["hasProvenIncome"], message: "Informe se possui renda comprovada" });
  if (values.hasCnhA == null) context.addIssue({ code: "custom", path: ["hasCnhA"], message: "Informe se possui CNH A" });
  if (values.birthDate) {
    const calculatedAge = ageFromBirthDate(values.birthDate);
    if (!Number.isFinite(calculatedAge) || calculatedAge < 18 || calculatedAge > 100) {
      context.addIssue({ code: "custom", path: ["birthDate"], message: "Data de nascimento inválida" });
    } else if (Math.abs(calculatedAge - values.age) > 1) {
      context.addIssue({ code: "custom", path: ["age"], message: "A idade não confere com a data de nascimento" });
    }
  }
});

export type CatalogLeadInput = z.infer<typeof catalogLeadSchema>;

type LeadVehicle = { id: string; brand: string; model: string };

export function catalogLeadWhatsAppMessage(vehicle: LeadVehicle, lead: CatalogLeadInput) {
  const lines = [
    `Olá, tenho interesse na ${vehicle.brand} ${vehicle.model}.`,
    `Atendimento: ${LEAD_INTEREST_LABEL[lead.interestType]}`,
    "",
    `Nome: ${lead.fullName}`,
    `Idade: ${lead.age} anos`,
    `Telefone: ${lead.phone}`,
    `Cidade: ${lead.city}`,
  ];

  if (lead.interestType === "financiamento") {
    lines.push(
      `Data de nascimento: ${lead.birthDate}`,
      `CPF: ${lead.cpf}`,
      `Renda comprovada: ${lead.hasProvenIncome ? "Sim" : "Não"}`,
      `CNH categoria A: ${lead.hasCnhA ? "Sim" : "Não"}`,
    );
  }

  lines.push("", `${CATALOG_BASE_URL}/${vehicle.id}`);
  return lines.join("\n");
}

export function catalogLeadWhatsAppUrl(vehicle: LeadVehicle, lead: CatalogLeadInput) {
  return `https://wa.me/${CATALOG_WHATSAPP_NUMBER}?text=${encodeURIComponent(catalogLeadWhatsAppMessage(vehicle, lead))}`;
}

export function formatLeadCpf(value: string | null) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  return `***.***.***-${digits.slice(-2)}`;
}

export function formatLeadPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}