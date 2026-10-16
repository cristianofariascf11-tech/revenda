import type { Metadata } from "next";
import Link from "next/link";
import { BadgeDollarSign, Flame, MapPin, MessageCircle, Search, UserRoundCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { formatLeadCpf, formatLeadPhone, LEAD_INTEREST_LABEL, LEAD_STATUS_LABEL, type LeadInterestType, type LeadStatus } from "@/lib/catalog-leads";
import { LeadActions } from "./lead-actions";

export const metadata: Metadata = { title: "Leads" };

type Params = { q?: string; interest?: string; status?: string; marketing?: string };
type LeadRow = {
  id: string;
  vehicle_name: string;
  interest_type: LeadInterestType;
  status: LeadStatus;
  full_name: string;
  age: number;
  phone: string;
  city: string;
  birth_date: string | null;
  cpf: string | null;
  has_proven_income: boolean | null;
  has_cnh_a: boolean | null;
  marketing_consent: boolean;
  created_at: string;
};

function leadWhatsAppUrl(lead: LeadRow) {
  const firstName = lead.full_name.trim().split(/\s+/)[0];
  const message = `Olá, ${firstName}! Aqui é da GV Moto Center. Recebemos seu interesse na ${lead.vehicle_name}.`;
  return `https://wa.me/55${lead.phone}?text=${encodeURIComponent(message)}`;
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge lead-status-${status}`}>{LEAD_STATUS_LABEL[status]}</span>;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("catalog_leads").select("*").order("created_at", { ascending: false }).limit(500);

  if (params.q) {
    const q = params.q.replace(/[,()%]/g, "").trim();
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%,vehicle_name.ilike.%${q}%`);
  }
  if (params.interest === "atendimento" || params.interest === "financiamento") query = query.eq("interest_type", params.interest);
  if (["novo", "contatado", "convertido", "descartado"].includes(params.status ?? "")) query = query.eq("status", params.status);
  if (params.marketing === "1") query = query.eq("marketing_consent", true);

  const { data, error } = await query;
  const leads = (data ?? []) as LeadRow[];
  const newLeads = leads.filter(lead => lead.status === "novo").length;
  const financing = leads.filter(lead => lead.interest_type === "financiamento").length;
  const hotAudience = leads.filter(lead => lead.marketing_consent && lead.status !== "descartado").length;

  return <main className="shell page stack">
    <div><span className="eyebrow">Relacionamento</span><h1 className="page-title">Leads do catálogo</h1><p className="muted">Acompanhe os interessados, retome conversas e identifique seu público quente.</p></div>

    <section className="metric-grid lead-metric-grid">
      <div className="card metric"><span className="metric-icon"><UserRoundCheck/></span><span className="metric-label">Leads encontrados</span><strong className="metric-value">{leads.length}</strong></div>
      <div className="card metric"><span className="metric-icon metric-icon-warning"><Flame/></span><span className="metric-label">Novos</span><strong className="metric-value">{newLeads}</strong></div>
      <div className="card metric"><span className="metric-icon metric-icon-profit"><BadgeDollarSign/></span><span className="metric-label">Financiamento</span><strong className="metric-value">{financing}</strong></div>
      <div className="card metric"><span className="metric-icon metric-icon-entry"><MessageCircle/></span><span className="metric-label">Aceitam ofertas</span><strong className="metric-value">{hotAudience}</strong></div>
    </section>

    <form className="card lead-filters" method="get" aria-label="Filtros de leads">
      <div className="field"><label htmlFor="lead-q">Busca</label><input className="input" id="lead-q" name="q" defaultValue={params.q} placeholder="Nome, telefone, cidade ou moto"/></div>
      <div className="field"><label htmlFor="lead-interest">Interesse</label><select className="select" id="lead-interest" name="interest" defaultValue={params.interest ?? ""}><option value="">Todos</option><option value="atendimento">Atendimento</option><option value="financiamento">Financiamento</option></select></div>
      <div className="field"><label htmlFor="lead-status">Status</label><select className="select" id="lead-status" name="status" defaultValue={params.status ?? ""}><option value="">Todos</option>{Object.entries(LEAD_STATUS_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
      <label className="filter-check"><input type="checkbox" name="marketing" value="1" defaultChecked={params.marketing === "1"}/>Somente quem aceita ofertas</label>
      <button className="btn btn-primary" type="submit"><Search size={17}/>Filtrar</button>
      <Link className="btn" href="/leads">Limpar</Link>
    </form>

    {error && <div className="alert alert-error">Não foi possível carregar os leads: {error.message}</div>}
    {!error && !leads.length ? <section className="card empty"><div className="empty-icon"><UserRoundCheck/></div><h2>Nenhum lead encontrado</h2><p>Os contatos enviados pelo catálogo aparecerão aqui.</p></section> : <LeadResults leads={leads}/>}
  </main>;
}

function LeadResults({ leads }: { leads: LeadRow[] }) {
  return <section className="card">
    <div className="table-wrap"><table className="data-table lead-table"><thead><tr><th>Recebido</th><th>Cliente</th><th>Interesse</th><th>Motocicleta</th><th>Dados</th><th>Marketing</th><th>Status</th><th>Ações</th></tr></thead><tbody>{leads.map(lead=><tr key={lead.id}>
      <td>{formatDate(lead.created_at)}</td>
      <td><strong>{lead.full_name}</strong><br/><small className="muted">{lead.age} anos • {lead.city}</small></td>
      <td><span className={`badge lead-interest-${lead.interest_type}`}>{LEAD_INTEREST_LABEL[lead.interest_type]}</span></td>
      <td><strong>{lead.vehicle_name}</strong></td>
      <td><a className="lead-phone-link" href={leadWhatsAppUrl(lead)} target="_blank" rel="noreferrer"><MessageCircle size={15}/>{formatLeadPhone(lead.phone)}</a>{lead.interest_type === "financiamento" && <small className="lead-financing-summary">CPF {formatLeadCpf(lead.cpf)} • Renda {lead.has_proven_income ? "sim" : "não"} • CNH A {lead.has_cnh_a ? "sim" : "não"}</small>}</td>
      <td>{lead.marketing_consent ? <span className="badge lead-marketing-yes">Aceitou ofertas</span> : <span className="muted">Somente atendimento</span>}</td>
      <td><StatusBadge status={lead.status}/></td>
      <td><LeadActions id={lead.id} status={lead.status}/></td>
    </tr>)}</tbody></table></div>
    <div className="mobile-cards lead-mobile-cards">{leads.map(lead=><article className="lead-card" key={lead.id}>
      <div className="spread"><div><small className="muted">{formatDate(lead.created_at)}</small><h2>{lead.full_name}</h2></div><StatusBadge status={lead.status}/></div>
      <p><MapPin size={15}/>{lead.city} • {lead.age} anos</p>
      <div className="lead-card-tags"><span className={`badge lead-interest-${lead.interest_type}`}>{LEAD_INTEREST_LABEL[lead.interest_type]}</span>{lead.marketing_consent && <span className="badge lead-marketing-yes">Aceitou ofertas</span>}</div>
      <div className="lead-card-vehicle"><small>Motocicleta</small><strong>{lead.vehicle_name}</strong></div>
      {lead.interest_type === "financiamento" && <div className="lead-card-financing"><span>CPF <strong>{formatLeadCpf(lead.cpf)}</strong></span><span>Renda <strong>{lead.has_proven_income ? "Sim" : "Não"}</strong></span><span>CNH A <strong>{lead.has_cnh_a ? "Sim" : "Não"}</strong></span></div>}
      <a className="btn catalog-share-whatsapp" href={leadWhatsAppUrl(lead)} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{formatLeadPhone(lead.phone)}</a>
      <LeadActions id={lead.id} status={lead.status}/>
    </article>)}</div>
  </section>;
}