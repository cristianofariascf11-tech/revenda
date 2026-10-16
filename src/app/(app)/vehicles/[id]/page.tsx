import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import { OWNERSHIP_LABEL, type VehicleCost, type VehicleFinancial, type VehicleMarketplace, type VehiclePhoto } from "@/lib/types";
import { MarketplaceCaption } from "@/components/marketplace-caption";
import { StatusBadge } from "@/components/status-badge";
import { VehicleForm } from "../vehicle-form";
import { DeleteVehicle } from "./delete-vehicle";
import { PhotoManager } from "./photo-manager";
import { CostManager } from "./cost-manager";
import { SaleManager } from "./sale-manager";

export const metadata: Metadata = { title: "Detalhes do veículo" };

type VehicleListingData = VehicleMarketplace & { fipe_reference_value: number | null };

export default async function VehiclePage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{created?:string}> }) {
  const { id } = await params; const query = await searchParams; const supabase = await createClient();
  const [{data:vehicle},{data:costs},{data:photos},{data:marketplaceData}] = await Promise.all([
    supabase.from("v_vehicle_financials").select("*").eq("id",id).is("deleted_at",null).single(),
    supabase.from("vehicle_costs").select("*").eq("vehicle_id",id).order("cost_date",{ascending:false}),
    supabase.from("vehicle_photos").select("*").eq("vehicle_id",id).order("ord"),
    supabase.from("vehicles").select("fipe_reference_value,catalog_description,marketplace_reviewed,marketplace_warranty,marketplace_trade,marketplace_financing,marketplace_card_24x").eq("id",id).is("deleted_at",null).single(),
  ]);
  if (!vehicle || !marketplaceData) notFound();
  const v=vehicle as VehicleFinancial; const photoRows=(photos??[]) as VehiclePhoto[];
  const listingData=marketplaceData as VehicleListingData;
  const { fipe_reference_value: fipeReferenceValue, ...marketplace } = listingData;
  const signed = photoRows.length ? await supabase.storage.from("vehicle-photos").createSignedUrls(photoRows.map(p=>p.path),3600) : {data:[]};
  const signedMap = new Map((signed.data??[]).map(item=>[item.path,item.signedUrl]));
  const hydratedPhotos=photoRows.map(p=>({...p,signedUrl:signedMap.get(p.path)??undefined}));
  const isConsigned = v.ownership_type === "consignada";
  const estimate = isConsigned || v.asking_price == null ? null : Number(v.asking_price)-Number(v.total_invested);
  return <main className="shell page stack">
    <div><Link className="btn btn-ghost btn-sm" href="/vehicles"><ChevronLeft size={17}/>Voltar ao estoque</Link></div>
    {query.created === "1" && <div className="alert alert-info">Veículo {v.code} cadastrado com sucesso.</div>}
    <div className="spread"><div><div className="cluster"><span className="code">{v.code}</span><span className={`badge ${isConsigned?"badge-consigned":"badge-owned"}`}>{OWNERSHIP_LABEL[v.ownership_type]}</span></div><h1 className="page-title">{v.brand} {v.model}</h1><p className="muted">{v.model_year}{v.plate?` • ${v.plate}`:" • Sem placa"}</p>{(v.chassis || v.engine_number) && <p className="muted"><span className="code">Chassi: {v.chassis || "—"}</span> • <span className="code">Motor: {v.engine_number || "—"}</span></p>}</div><StatusBadge status={v.status}/></div>
    <section className="metric-grid"><div className="card metric"><span className="metric-label">{isConsigned?"Custos próprios":"Total investido"}</span><strong className="metric-value">{formatCurrency(v.total_invested)}</strong></div><div className="card metric"><span className="metric-label">Valor FIPE</span><strong className="metric-value">{fipeReferenceValue?formatCurrency(fipeReferenceValue):"—"}</strong><small className="muted">Referência para o anúncio</small></div><div className="card metric"><span className="metric-label">Valor anunciado</span><strong className="metric-value">{v.asking_price?formatCurrency(v.asking_price):"—"}</strong></div><div className="card metric"><span className="metric-label">Tempo em estoque</span><strong className="metric-value">{v.days_in_stock} dias</strong></div><div className="card metric"><span className="metric-label">{v.sale_id?"Lucro realizado":isConsigned?"Comissão na venda":"Lucro estimado"}</span><strong className={`metric-value ${Number(v.profit??estimate??0)<0?"danger-text":"success-text"}`}>{v.profit!=null||estimate!=null?formatCurrency(v.profit??estimate):"—"}</strong></div></section>
    <section className="detail-grid"><div className="stack"><section className="card card-pad stack"><div className="spread"><div><span className="eyebrow">Galeria</span><h2 className="section-title">Fotos do veículo</h2></div><span className="muted">{photoRows.length}/12</span></div><PhotoManager vehicleId={id} photos={hydratedPhotos}/></section><section className="card card-pad stack"><div><span className="eyebrow">Despesas</span><h2 className="section-title">Custos de preparação</h2></div><CostManager vehicleId={id} costs={(costs??[]) as VehicleCost[]}/></section></div><aside className="stack"><section className="card card-pad stack"><div><span className="eyebrow">Financeiro</span><h2 className="section-title">Resumo</h2></div><div className="summary-list"><div className="summary-row"><span>Origem</span><strong>{OWNERSHIP_LABEL[v.ownership_type]}</strong></div><div className="summary-row"><span>Entrada no estoque</span><strong>{formatDate(v.entry_date)}</strong></div><div className="summary-row"><span>Compra</span><strong>{isConsigned?"Não se aplica":formatCurrency(v.purchase_price)}</strong></div><div className="summary-row"><span>Custos</span><strong>{formatCurrency(v.total_costs)}</strong></div><div className="summary-row"><span>{isConsigned?"Capital próprio aplicado":"Total investido"}</span><strong>{formatCurrency(v.total_invested)}</strong></div></div></section><SaleManager vehicle={v}/></aside></section>
    <MarketplaceCaption brand={v.brand} model={v.model} modelYear={v.model_year} askingPrice={v.asking_price == null ? null : Number(v.asking_price)} {...marketplace}/>
    <section className="card card-pad stack"><div><span className="eyebrow">Informações</span><h2 className="section-title">Editar dados</h2></div><VehicleForm vehicleId={id} code={v.code} initial={{brand:v.brand,model:v.model,model_year:v.model_year,plate:v.plate??"",chassis:v.chassis??"",engine_number:v.engine_number??"",ownership_type:v.ownership_type,entry_date:v.entry_date,purchase_price:v.purchase_price==null?"":Number(v.purchase_price),fipe_reference_value:fipeReferenceValue==null?"":Number(fipeReferenceValue),asking_price:v.asking_price==null?"":Number(v.asking_price),...marketplace}}/></section>
    <section className="stack"><DeleteVehicle id={id} code={v.code}/></section>
  </main>;
}