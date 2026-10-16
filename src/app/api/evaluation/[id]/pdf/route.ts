import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildEvaluationPdf } from "@/lib/evaluation-pdf";
import { createClient } from "@/lib/supabase/server";
import type { EvaluationCosts } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Avaliação inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });

  const { data: evaluation, error } = await supabase
    .from("vehicle_evaluations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !evaluation) return Response.json({ error: "Avaliação não encontrada." }, { status: 404 });

  const logoBytes = new Uint8Array(await readFile(join(process.cwd(), "public", "logo-gv.png")));
  let photoBytes: Uint8Array | undefined;
  if (evaluation.photo_path) {
    const { data: photo } = await supabase.storage.from("vehicle-photos").download(evaluation.photo_path);
    if (photo) photoBytes = new Uint8Array(await photo.arrayBuffer());
  }

  const pdf = await buildEvaluationPdf({
    evaluation: {
      plate: evaluation.plate,
      brand: evaluation.brand,
      model: evaluation.model,
      modelYear: Number(evaluation.model_year),
      chassis: evaluation.chassis,
      engineNumber: evaluation.engine_number,
      fipeValue: Number(evaluation.fipe_value),
      discountPercent: Number(evaluation.discount_percent),
      additionalCosts: evaluation.additional_costs as EvaluationCosts,
      additionalCostsTotal: Number(evaluation.additional_costs_total),
      suggestedOffer: Number(evaluation.suggested_offer),
      createdAt: evaluation.created_at,
    },
    logoBytes,
    photoBytes,
  });

  return new Response(Uint8Array.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="avaliacao-${evaluation.plate}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}