import { z } from "zod";
import { COST_CATEGORIES, PAYMENT_FREQUENCIES, VEHICLE_OWNERSHIP_TYPES, VEHICLE_STATUSES } from "./types";

const money = z.coerce.number().finite().min(0).max(99_999_999);
const requiredMoney = z.coerce.number().finite().positive().max(99_999_999);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const optionalVehicleIdentifier = z.string().trim().max(80, "Use no máximo 80 caracteres")
  .transform(value => value.toUpperCase()).optional().default("").transform(value => value || null);

export const vehicleSchema = z.object({
  brand: z.string().trim().min(1, "Informe a marca").max(80),
  model: z.string().trim().min(1, "Informe o modelo").max(120),
  model_year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 2),
  plate: z.string().trim().toUpperCase().transform(v => v.replace(/[^A-Z0-9]/g, "")).refine(v => !v || /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v), "Placa inválida"),
  chassis: optionalVehicleIdentifier,
  engine_number: optionalVehicleIdentifier,
  ownership_type: z.enum(VEHICLE_OWNERSHIP_TYPES).default("propria"),
  entry_date: dateString,
  purchase_price: z.union([z.literal(""), requiredMoney]).transform(value => value === "" ? null : value),
  fipe_reference_value: z.union([z.literal(""), requiredMoney]).optional().default("").transform(value => value === "" ? null : value),
  asking_price: z.union([z.literal(""), money]).transform(v => v === "" ? null : v),
  catalog_description: z.string().trim().max(1000, "Use no máximo 1000 caracteres").default(""),
  marketplace_reviewed: z.boolean().default(true),
  marketplace_warranty: z.boolean().default(true),
  marketplace_trade: z.boolean().default(true),
  marketplace_financing: z.boolean().default(true),
  marketplace_card_24x: z.boolean().default(true),
}).superRefine((values, context) => {
  if (values.ownership_type === "propria" && values.purchase_price == null) {
    context.addIssue({ code: "custom", path: ["purchase_price"], message: "Informe o valor de compra da moto própria" });
  }
}).transform(values => ({
  ...values,
  purchase_price: values.ownership_type === "consignada" ? null : values.purchase_price,
}));

export const statusSchema = z.object({ status: z.enum(VEHICLE_STATUSES) });
export const costSchema = z.object({
  cost_date: dateString, category: z.enum(COST_CATEGORIES), amount: requiredMoney,
  description: z.string().trim().max(500).default(""),
});
export const saleSchema = z.object({
  sale_date: dateString,
  sale_price: requiredMoney,
  sale_fees: money.default(0),
  commission_amount: z.union([z.literal(""), requiredMoney]).optional().default("").transform(value => value === "" ? null : value),
});
export const loginSchema = z.object({ email: z.string().email("E-mail inválido"), password: z.string().min(6, "Informe a senha") });
export const evaluationSchema = z.object({
  plate: z.string().transform(v => v.toUpperCase().replace(/[^A-Z0-9]/g, "")).refine(v => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v), "Placa inválida"),
  discountPercent: z.coerce.number().refine(v => [15,20,25].includes(v)),
});

export const financedCustomerSchema = z.object({
  customer_name: z.string().trim().min(3, "Informe o nome completo").max(160),
  customer_cpf: z.string().transform(value => value.replace(/\D/g, "")).refine(value => /^\d{11}$/.test(value), "Informe um CPF com 11 dígitos"),
  customer_phone: z.string().transform(value => value.replace(/\D/g, "")).refine(value => /^\d{10,11}$/.test(value), "Informe um telefone com DDD"),
  customer_address: z.string().trim().min(5, "Informe o endereço do cliente").max(500),
});

export const financingFrequencySchema = z.object({
  payment_frequency: z.enum(PAYMENT_FREQUENCIES),
});

export const financedSaleSchema = financedCustomerSchema.extend({
  vehicle_id: z.string().uuid("Selecione uma motocicleta"),
  sale_date: dateString,
  down_payment: money,
  payment_frequency: z.enum(PAYMENT_FREQUENCIES).default("mensal"),
  installment_count: z.coerce.number().int().min(1, "Informe ao menos uma parcela").max(312, "O limite é de 312 parcelas semanais"),
  installment_amount: requiredMoney,
  first_due_date: dateString,
  notes: z.string().trim().max(1000).default(""),
}).superRefine((values, context) => {
  if (values.first_due_date < values.sale_date) context.addIssue({ code: "custom", message: "O primeiro vencimento não pode ser anterior à venda", path: ["first_due_date"] });
  if (values.payment_frequency === "mensal" && values.installment_count > 72) context.addIssue({ code: "custom", message: "O limite é de 72 parcelas mensais", path: ["installment_count"] });
});