"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { financedCustomerSchema, financedSaleSchema, financingFrequencySchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type FinancingActionResult = { ok: boolean; error?: string; id?: string };
type InstallmentActionResult = FinancingActionResult & { paidAt?: string | null };

export async function createFinancedSaleAction(input: unknown): Promise<FinancingActionResult> {
  const parsed = financedSaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados do financiamento inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const values = parsed.data;
  const { data, error } = await supabase.rpc("register_store_financed_sale", {
    p_vehicle_id: values.vehicle_id,
    p_customer_name: values.customer_name,
    p_customer_cpf: values.customer_cpf,
    p_customer_phone: values.customer_phone,
    p_customer_address: values.customer_address,
    p_sale_date: values.sale_date,
    p_down_payment: values.down_payment,
    p_payment_frequency: values.payment_frequency,
    p_installment_count: values.installment_count,
    p_installment_amount: values.installment_amount,
    p_first_due_date: values.first_due_date,
    p_notes: values.notes,
  });

  if (error || !data) return { ok: false, error: error?.message ?? "Não foi possível registrar o financiamento." };
  revalidatePath("/financing");
  revalidatePath("/vehicles");
  revalidatePath("/financial");
  return { ok: true, id: String(data) };
}

export async function setInstallmentPaidAction(financedSaleId: string, installmentId: string, paid: boolean): Promise<InstallmentActionResult> {
  const ids = z.object({ financedSaleId: z.string().uuid(), installmentId: z.string().uuid() }).safeParse({ financedSaleId, installmentId });
  if (!ids.success) return { ok: false, error: "Parcela inválida." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase.rpc("set_store_installment_paid", {
    p_installment_id: installmentId,
    p_paid: paid,
  });
  if (error) return { ok: false, error: error.message };

  const result = (Array.isArray(data) ? data[0] : data) as { paid_at?: string | null } | null;
  revalidatePath("/financing");
  revalidatePath(`/financing/${financedSaleId}`);
  return { ok: true, paidAt: paid ? result?.paid_at ?? new Date().toISOString() : null };
}

export async function updateFinancedCustomerAction(financedSaleId: string, input: unknown): Promise<FinancingActionResult> {
  const id = z.string().uuid().safeParse(financedSaleId);
  if (!id.success) return { ok: false, error: "Financiamento inválido." };
  const parsed = financedCustomerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados do comprador inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase.from("store_financed_sales").update(parsed.data).eq("id", financedSaleId).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Não foi possível atualizar o comprador." };
  revalidatePath("/financing");
  revalidatePath(`/financing/${financedSaleId}`);
  return { ok: true, id: financedSaleId };
}

export async function updateFinancingFrequencyAction(financedSaleId: string, input: unknown): Promise<FinancingActionResult> {
  const id = z.string().uuid().safeParse(financedSaleId);
  if (!id.success) return { ok: false, error: "Financiamento inválido." };
  const parsed = financingFrequencySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Periodicidade inválida." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.rpc("update_store_financing_frequency", {
    p_financed_sale_id: financedSaleId,
    p_payment_frequency: parsed.data.payment_frequency,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/financing");
  revalidatePath(`/financing/${financedSaleId}`);
  return { ok: true, id: financedSaleId };
}