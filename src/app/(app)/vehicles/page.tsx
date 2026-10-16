import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bike, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { signedPhotoMap } from "@/lib/photo-urls";
import { OWNERSHIP_LABEL, type VehicleFinancial, type VehicleStatus } from "@/lib/types";
import { AgeBadge, StatusBadge } from "@/components/status-badge";
import { VehicleFilters } from "./filters";
import { QuickStatus } from "./quick-actions";
import { CatalogShare } from "@/components/catalog-share";

export const metadata: Metadata = { title: "Estoque" };
type Params = { q?:string; status?:string; ownership?:string; stale?:string; entryFrom?:string; entryTo?:string; saleFrom?:string; saleTo?:string };

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams; const supabase = await createClient();
  let query = supabase.from("v_vehicle_financials").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  if (p.q) { const q = p.q.replace(/[,()%]/g, "").trim(); if (/^\d{4}$/.test(q)) query = query.eq("model_year", Number(q)); else query = query.or(`code.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,plate.ilike.%${q}%`); }
  if (p.status && ["em_preparacao","a_venda","reservada","vendida","arquivada"].includes(p.status)) query = query.eq("status", p.status);
  if (p.ownership && ["propria", "consignada"].includes(p.ownership)) query = query.eq("ownership_type", p.ownership);
  if (p.stale === "1") query = query.gt("days_in_stock", 30);
  if (p.entryFrom) query = query.gte("entry_date", p.entryFrom); if (p.entryTo) query = query.lte("entry_date", p.entryTo);
  if (p.saleFrom) query = query.gte("sale_date", p.saleFrom); if (p.saleTo) query = query.lte("sale_date", p.saleTo);
  const { data, error } = await query; const vehicles = (data ?? []) as VehicleFinancial[];
  const urls = await signedPhotoMap(supabase, vehicles.map(v=>v.cover_path));
  const totalInvested = vehicles.filter(v=>v.status!=="vendida").reduce((s,v)=>s+Number(v.total_invested),0);
  const profit = vehicles.reduce((s,v)=>s+Number(v.profit??0),0); const stale = vehicles.filter(v=>v.days_in_stock>30 && v.status!=="vendida").length;
  return <main className="shell page stack">
    <div className="spread"><div><span className="eyebrow">Visão geral</span><h1 className="page-title">Estoque de motocicletas</h1><p className="muted">Acompanhe preparação, investimento e resultado em tempo real.</p></div></div>
    <CatalogShare/>
    <section className="metric-grid"><div className="card metric"><span className="metric-label">Veículos filtrados</span><strong className="metric-value">{vehicles.length}</strong></div><div className="card metric"><span className="metric-label">Parados há mais de 30 dias</span><strong className="metric-value">{stale}</strong></div><div className="card metric"><span className="metric-label">Total investido em estoque</span><strong className="metric-value">{formatCurrency(totalInvested)}</strong></div><div className="card metric"><span className="metric-label">Lucro dos vendidos</span><strong className={`metric-value ${profit<0?"danger-text":"success-text"}`}>{formatCurrency(profit)}</strong></div></section>
    <VehicleFilters/>
    {error && <div className="alert alert-error">Não foi possível carregar o estoque: {error.message}</div>}
    {!error && !vehicles.length ? <section className="card empty"><div className="empty-icon"><Bike/></div><h2>Nenhum veículo encontrado</h2><p>Cadastre uma motocicleta ou ajuste os filtros.</p><Link className="btn btn-primary" href="/vehicles/new">Cadastrar veículo</Link></section> : <VehicleResults vehicles={vehicles} urls={urls}/>}
  </main>;
}

function Cover({ vehicle, url }: { vehicle: VehicleFinancial; url?: string }) { return url ? <Image className="thumb" src={url} alt={`${vehicle.brand} ${vehicle.model}`} width={144} height={104}/> : <div className="thumb"><ImageOff size={22}/></div>; }
function VehicleResults({ vehicles, urls }: { vehicles: VehicleFinancial[]; urls: Map<string,string> }) {
  return <section className="card">
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Foto</th><th>Código</th><th>Veículo</th><th>Compra / Origem</th><th>Custos</th><th>Status</th><th>Dias</th><th>Anunciado</th><th>Lucro</th><th>Ações</th></tr></thead><tbody>{vehicles.map(v=><tr key={v.id}><td><Cover vehicle={v} url={v.cover_path?urls.get(v.cover_path):undefined}/></td><td><span className="code">{v.code}</span></td><td><Link href={`/vehicles/${v.id}`}><span className="vehicle-name">{v.brand} {v.model}</span><br/><small className="muted">{v.model_year}{v.plate?` • ${v.plate}`:""}</small></Link></td><td>{v.ownership_type==="consignada"?<span className="badge badge-consigned">{OWNERSHIP_LABEL[v.ownership_type]}</span>:formatCurrency(v.purchase_price)}</td><td>{formatCurrency(v.total_costs)}</td><td><StatusBadge status={v.status as VehicleStatus}/></td><td><AgeBadge days={v.days_in_stock}/></td><td>{v.asking_price?formatCurrency(v.asking_price):"—"}</td><td className={Number(v.profit??0)<0?"danger-text":"success-text"}>{v.profit==null?"—":formatCurrency(v.profit)}</td><td><div className="stack" style={{gap:7}}><Link className="btn btn-sm" href={`/vehicles/${v.id}`}>Abrir</Link><QuickStatus id={v.id} status={v.status}/></div></td></tr>)}</tbody></table></div>
    <div className="mobile-cards" style={{padding:12}}>{vehicles.map(v=><article className="card vehicle-card" key={v.id}><div className="vehicle-card-head"><Cover vehicle={v} url={v.cover_path?urls.get(v.cover_path):undefined}/><div><span className="code">{v.code}</span><div className="vehicle-name">{v.brand} {v.model}</div><small className="muted">{v.model_year}{v.plate?` • ${v.plate}`:""}</small><div className="cluster" style={{marginTop:7}}><StatusBadge status={v.status}/><span className={`badge ${v.ownership_type==="consignada"?"badge-consigned":"badge-owned"}`}>{OWNERSHIP_LABEL[v.ownership_type]}</span></div></div></div><div className="vehicle-card-values"><div><small>{v.ownership_type==="consignada"?"Custos próprios":"Investido"}</small><strong>{formatCurrency(v.total_invested)}</strong></div><div><small>Dias em estoque</small><AgeBadge days={v.days_in_stock}/></div><div><small>Anunciado</small><strong>{v.asking_price?formatCurrency(v.asking_price):"—"}</strong></div><div><small>Lucro</small><strong className={Number(v.profit??0)<0?"danger-text":"success-text"}>{v.profit==null?"—":formatCurrency(v.profit)}</strong></div></div><div className="vehicle-card-actions"><Link className="btn btn-primary" href={`/vehicles/${v.id}`}>Abrir</Link></div></article>)}</div>
  </section>;
}