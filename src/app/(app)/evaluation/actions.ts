"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  plate: z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  model_year: z.coerce.number().int().min(1950),
  chassis: z.preprocess((value) => typeof value === "string" && !value.trim() ? null : value, z.string().trim().max(80).nullable().optional()),
  engine_number: z.preprocess((value) => typeof value === "string" && !value.trim() ? null : value, z.string().trim().max(80).nullable().optional()),
  fipe_value: z.coerce.number().positive(),
  discount_percent: z.coerce.number().refine((value) => [15, 20, 25].includes(value)),
  additional_costs: z.record(z.string(), z.coerce.number().min(0)),
  additional_costs_total: z.coerce.number().min(0),
  suggested_offer: z.coerce.number().min(0),
  source: z.string().min(1),
  source_consulted_at: z.string().datetime(),
  photo_path: z.string().regex(/^evaluations\/[0-9a-f-]{36}\.jpg$/).optional().nullable(),
});

export async function saveEvaluationAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Avaliação inválida." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("vehicle_evaluations")
    .insert({ ...parsed.data, chassis: parsed.data.chassis ?? null, engine_number: parsed.data.engine_number ?? null, photo_path: parsed.data.photo_path ?? null, user_id: user.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/evaluation/history");
  return { ok: true, id: data.id };
}