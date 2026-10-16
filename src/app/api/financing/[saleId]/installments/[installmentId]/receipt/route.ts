import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildFinancingReceiptPdf } from "@/lib/financing-receipt-pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ saleId: string; installmentId: string }> }) {
  const { saleId, installmentId } = await params;
  if (!uuid.test(saleId) || !uuid.test(installmentId)) return Response.json({ error: "Parcela inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });

  const { data: sale } = await supabase.from("store_financed_sales").select("*").eq("id", saleId).eq("user_id", user.id).single();
  if (!sale) return Response.json({ error: "Financiamento não encontrado." }, { status: 404 });
  const [{ data: vehicle }, { data: installment }] = await Promise.all([
    supabase.from("vehicles").select("code,brand,model,model_year,plate").eq("id", sale.vehicle_id).single(),
    supabase.from("store_financed_installments").select("*").eq("id", installmentId).eq("financed_sale_id", saleId).not("paid_at", "is", null).single(),
  ]);
  if (!vehicle || !installment?.paid_at) return Response.json({ error: "O recibo só fica disponível depois da baixa da parcela." }, { status: 404 });

  const logoBytes = new Uint8Array(await readFile(join(process.cwd(), "public", "logo-gv.png")));
  const pdf = await buildFinancingReceiptPdf({
    logoBytes,
    receipt: {
      saleId: sale.id,
      customerName: sale.customer_name,
      customerCpf: sale.customer_cpf,
      vehicleCode: vehicle.code,
      vehicleBrand: vehicle.brand,
      vehicleModel: vehicle.model,
      vehicleYear: Number(vehicle.model_year),
      vehiclePlate: vehicle.plate,
      installmentNumber: Number(installment.installment_number),
      installmentCount: Number(sale.installment_count),
      dueDate: installment.due_date,
      paidAt: installment.paid_at,
      amount: Number(installment.amount),
    },
  });
  const filenamePart = String(vehicle.plate ?? vehicle.code).replace(/[^A-Z0-9-]/gi, "");
  return new Response(Uint8Array.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${filenamePart}-parcela-${installment.installment_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}