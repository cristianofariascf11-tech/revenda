import type { Metadata } from "next";
import { Bike, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FinancingForm, type FinancingVehicleOption } from "../financing-form";

export const metadata: Metadata = { title: "Novo financiamento" };

export default async function NewFinancingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_vehicle_financials")
    .select("id,code,brand,model,model_year,plate,asking_price,status,sale_id")
    .is("deleted_at", null)
    .is("sale_id", null)
    .eq("ownership_type", "propria")
    .in("status", ["em_preparacao", "a_venda", "reservada"])
    .order("created_at", { ascending: false });
  const vehicles = (data ?? []) as FinancingVehicleOption[];

  return <main className="shell page stack">
    <div><Link className="btn btn-ghost btn-sm" href="/financing"><ChevronLeft size={17}/>Voltar aos financiamentos</Link></div>
    <div><span className="eyebrow">Venda direta da loja</span><h1 className="page-title">Novo financiamento</h1><p className="muted">Cadastre o cliente e gere automaticamente o carnê mensal ou semanal.</p></div>
    {error && <div className="alert alert-error">Não foi possível carregar as motocicletas: {error.message}</div>}
    {vehicles.length > 0
      ? <section className="card card-pad"><FinancingForm vehicles={vehicles}/></section>
      : <section className="card empty"><span className="empty-icon"><Bike/></span><h2>Nenhuma motocicleta disponível</h2><p>Cadastre uma moto ou verifique se ela já possui uma venda registrada.</p><Link className="btn btn-primary" href="/vehicles/new">Cadastrar motocicleta</Link></section>}
  </main>;
}