"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { VehicleCostForm } from "@/components/VehicleCostForm";
import { VehicleCostList } from "@/components/VehicleCostList";
import { VehicleSaleForm } from "@/components/VehicleSaleForm";
import { VehiclePhotoUploader } from "@/components/VehiclePhotoUploader";
import { VehiclePhotoGallery } from "@/components/VehiclePhotoGallery";
import { AuthGate } from "@/components/AuthGate";





export default function VehicleDetail() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id || id === "undefined") {
        setErr('ID inválido na URL (está vindo "undefined"). Volte e crie o veículo novamente.');
        return;
      }

      const { data, error } = await supabase
  .from("vehicles")
  .select(`
  id, code, brand, model, status, entry_date, purchase_price,
  vehicle_costs (id, cost_date, category, amount, description),
  vehicle_sales (id, sale_date, sale_price, sale_fees),
  vehicle_photos (id, path, public_url, created_at)
`)

  .eq("id", id)
  .single();

      if (error) setErr(error.message);
      else setData(data);
    }

    load();
  }, [id]);

  return (
    <AuthGate>
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <Link href="/vehicles">← Voltar</Link>

      <h1 style={{ fontSize: 22, marginTop: 12 }}>Detalhe do veículo</h1>

      <div style={{ fontSize: 12, color: "#666" }}>ID na URL: {String(id)}</div>

      {err && <p style={{ color: "crimson" }}>Erro: {err}</p>}
      {!err && !data && <p>Carregando...</p>}

      {data && (
  <>
    <VehicleCostList
      vehicleId={data.id}
      costs={data.vehicle_costs ?? []}
      onChanged={() => window.location.reload()}
    />

    <VehicleCostForm
      vehicleId={data.id}
      onDone={() => window.location.reload()}
    />
    <VehiclePhotoGallery
  vehicleId={data.id}
  photos={(data.vehicle_photos ?? []).slice().sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))}
  onChanged={() => window.location.reload()}
/>

<VehiclePhotoUploader
  vehicleId={data.id}
  currentCount={(data.vehicle_photos ?? []).length}
  onDone={() => window.location.reload()}
/>


    {/* FORMULÁRIO DE VENDA: só aparece se NÃO estiver vendida */}
{data && data.status !== "vendida" && (
  <VehicleSaleForm
    vehicleId={data.id}
    onDone={() => window.location.reload()}
  />
)}

{/* RESUMO DA VENDA: aparece só se JÁ estiver vendida */}
{data && data.status === "vendida" && (() => {
  const sale = Array.isArray(data.vehicle_sales)
    ? data.vehicle_sales[0]
    : data.vehicle_sales;

  const saleDate = sale?.sale_date ?? "—";
  const salePrice = sale?.sale_price;
  const saleFees = sale?.sale_fees ?? 0;

  return (
    <div style={{ marginTop: 18, padding: 14, border: "1px solid #e6ffe6", borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>Venda registrada</h3>
      <div>Data: {saleDate}</div>
      <div>Valor: {salePrice == null ? "—" : `R$ ${Number(salePrice).toFixed(2)}`}</div>
      <div>Taxas: R$ {Number(saleFees).toFixed(2)}</div>
    </div>
  );
  
})()}


  </>
  
  
)}

    </div></AuthGate>
  );
}
