import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { catalogLeadSchema, catalogLeadWhatsAppUrl } from "@/lib/catalog-leads";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function clientFingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return ip && secret ? createHmac("sha256", secret).update(ip).digest("hex") : null;
}

export async function POST(request: NextRequest) {
  const parsed = catalogLeadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Revise os dados informados." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const values = parsed.data;
    const fingerprint = clientFingerprint(request);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000).toISOString();

    if (fingerprint) {
      const { count, error: limitError } = await admin
        .from("catalog_leads")
        .select("id", { count: "exact", head: true })
        .eq("request_fingerprint", fingerprint)
        .gte("created_at", fifteenMinutesAgo);
      if (limitError) throw limitError;
      if ((count ?? 0) >= 5) {
        return NextResponse.json({ ok: false, error: "Muitas solicitações em sequência. Aguarde alguns minutos." }, { status: 429 });
      }
    }

    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("id,brand,model")
      .eq("id", values.vehicleId)
      .eq("status", "a_venda")
      .is("deleted_at", null)
      .gt("asking_price", 0)
      .maybeSingle();

    if (vehicleError) throw vehicleError;
    if (!vehicle) return NextResponse.json({ ok: false, error: "Esta motocicleta não está mais disponível." }, { status: 409 });

    const vehicleName = `${vehicle.brand} ${vehicle.model}`.trim();
    const financing = values.interestType === "financiamento";
    const { data: lead, error: leadError } = await admin.from("catalog_leads").insert({
      vehicle_id: vehicle.id,
      vehicle_name: vehicleName,
      interest_type: values.interestType,
      full_name: values.fullName,
      age: values.age,
      phone: values.phone,
      city: values.city,
      birth_date: financing ? values.birthDate : null,
      cpf: financing ? values.cpf : null,
      has_proven_income: financing ? values.hasProvenIncome : null,
      has_cnh_a: financing ? values.hasCnhA : null,
      privacy_acknowledged: values.privacyAcknowledged,
      marketing_consent: values.marketingConsent,
      marketing_consented_at: values.marketingConsent ? new Date().toISOString() : null,
      request_fingerprint: fingerprint,
    }).select("id").single();

    if (leadError || !lead) throw leadError ?? new Error("Lead não criado");

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      whatsappUrl: catalogLeadWhatsAppUrl(vehicle, values),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("catalog lead error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "Não foi possível registrar seu interesse. Tente novamente." }, { status: 500 });
  }
}