"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/catalog-leads";
import { createClient } from "@/lib/supabase/server";

export async function updateLeadStatusAction(id: string, status: string) {
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Lead inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("catalog_leads").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}