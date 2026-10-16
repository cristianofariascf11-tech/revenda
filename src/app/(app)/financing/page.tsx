import type { Metadata } from "next";
import { AlertTriangle, CalendarClock, CircleDollarSign, HandCoins, Plus } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInstallmentAlert } from "@/lib/financing";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_FREQUENCY_LABEL, type StoreFinancingSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Financiamentos da loja" };

function FinancingStatus({ sale }: { sale: StoreFinancingSummary }) {
  if (sale.financing_status === "quitado") return <span className="badge financing-badge-paid">Quitado</span>;
  if (sale.overdue_count > 0) return <span className="badge financing-badge-overdue">{sale.overdue_count} vencida{sale.overdue_count === 1 ? "" : "s"}</span>;
  const alert = sale.next_due_date ? getInstallmentAlert(sale.next_due_date, null) : null;
  if (alert?.status === "today" || alert?.status === "upcoming") return <span className="badge financing-badge-upcoming">{alert.label}</span>;
  return <span className="badge financing-badge-active">Em dia</span>;
}

function rowTone(sale: StoreFinancingSummary) {
  if (sale.overdue_count > 0) return "financing-row-overdue";
  const alert = sale.next_due_date ? getInstallmentAlert(sale.next_due_date, null) : null;
  if (alert?.status === "today" || alert?.status === "upcoming") return "financing-row-upcoming";
  if (sale.financing_status === "quitado") return "financing-row-paid";
  return "";
}

export default async function FinancingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_store_financing_summary").select("*").order("created_at", { ascending: false });
  const sales = ((data ?? []) as StoreFinancingSummary[]).sort((a, b) => {
    const priority = (sale: StoreFinancingSummary) => sale.overdue_count > 0 ? 3 : sale.financing_status === "quitado" ? 0 : sale.due_soon_amount > 0 ? 2 : 1;
    return priority(b) - priority(a) || String(a.next_due_date ?? "9999").localeCompare(String(b.next_due_date ?? "9999"));
  });
  const totals = sales.reduce((result, sale) => ({
    received: result.received + Number(sale.total_received),
    outstanding: result.outstanding + Number(sale.outstanding_amount),
    overdue: result.overdue + Number(sale.overdue_amount),
    dueSoon: result.dueSoon + Number(sale.due_soon_amount),
  }), { received: 0, outstanding: 0, overdue: 0, dueSoon: 0 });
  const active = sales.filter(sale => sale.financing_status !== "quitado").length;

  return <main className="shell page stack">
    <div className="spread">
      <div><span className="eyebrow">Crediário próprio</span><h1 className="page-title">Financiamentos da loja</h1><p className="muted">Acompanhe contratos, vencimentos e recebimentos das motocicletas.</p></div>
      <Link className="btn btn-primary" href="/financing/new"><Plus size={18}/>Novo financiamento</Link>
    </div>
    {error && <div className="alert alert-error">Não foi possível carregar os financiamentos: {error.message}</div>}
    {totals.overdue > 0 && <div className="financing-critical-alert" role="alert"><AlertTriangle/><div><strong>Atenção máxima: existem parcelas vencidas</strong><span>{formatCurrency(totals.overdue)} em atraso. Os contratos mais urgentes aparecem primeiro.</span></div></div>}

    <section className="financing-metric-grid">
      <article className="card metric"><span className="metric-icon"><HandCoins/></span><span className="metric-label">Contratos ativos</span><strong className="metric-value">{active}</strong><small className="muted">de {sales.length} financiamento{sales.length === 1 ? "" : "s"}</small></article>
      <article className="card metric"><span className="metric-icon metric-icon-entry"><CircleDollarSign/></span><span className="metric-label">Total recebido</span><strong className="metric-value success-text">{formatCurrency(totals.received)}</strong><small className="muted">Entradas e parcelas pagas</small></article>
      <article className="card metric"><span className="metric-icon"><CalendarClock/></span><span className="metric-label">Saldo a receber</span><strong className="metric-value">{formatCurrency(totals.outstanding)}</strong><small className="muted">Parcelas ainda em aberto</small></article>
      <article className="card metric"><span className="metric-icon metric-icon-outflow"><AlertTriangle/></span><span className="metric-label">Total vencido</span><strong className={`metric-value ${totals.overdue > 0 ? "danger-text" : "success-text"}`}>{formatCurrency(totals.overdue)}</strong><small className="muted">Exige cobrança imediata</small></article>
      <article className="card metric"><span className="metric-icon metric-icon-warning"><CalendarClock/></span><span className="metric-label">Próximos 5 dias</span><strong className="metric-value warning-text">{formatCurrency(totals.dueSoon)}</strong><small className="muted">Inclui parcelas que vencem hoje</small></article>
    </section>

    {sales.length > 0 ? <section className="card">
      <div className="table-wrap"><table className="data-table financing-table"><thead><tr><th>Cliente / motocicleta</th><th>Situação</th><th>Próximo vencimento</th><th>Recebido</th><th>A receber</th><th>Parcelas</th><th></th></tr></thead><tbody>
        {sales.map(sale => <tr key={sale.id} className={rowTone(sale)}>
          <td><strong className="vehicle-name">{sale.customer_name}</strong><br/><span className="muted">{sale.vehicle_code} • {sale.brand} {sale.model} • {sale.plate ?? "sem placa"}</span></td>
          <td><FinancingStatus sale={sale}/></td>
          <td>{sale.next_due_date ? <><strong>{formatDate(sale.next_due_date)}</strong><br/><small className="muted">{getInstallmentAlert(sale.next_due_date, null).label}</small></> : "—"}</td>
          <td className="success-text"><strong>{formatCurrency(Number(sale.total_received))}</strong></td>
          <td><strong>{formatCurrency(Number(sale.outstanding_amount))}</strong></td>
          <td>{sale.paid_count}/{sale.installment_count}<br/><small className="muted">{PAYMENT_FREQUENCY_LABEL[sale.payment_frequency]}</small></td>
          <td><Link className="btn btn-sm" href={`/financing/${sale.id}`}>Ver parcelas</Link></td>
        </tr>)}
      </tbody></table></div>
      <div className="mobile-cards">{sales.map(sale => <article className={`financing-contract-card ${rowTone(sale)}`} key={sale.id}>
        <div className="spread"><div><span className="code">{sale.vehicle_code}</span><h2>{sale.customer_name}</h2></div><FinancingStatus sale={sale}/></div>
        <p className="muted">{sale.brand} {sale.model} {sale.model_year} • {sale.plate ?? "sem placa"} • {PAYMENT_FREQUENCY_LABEL[sale.payment_frequency]}</p>
        <div className="vehicle-card-values"><div><small>Próximo vencimento</small><strong>{formatDate(sale.next_due_date)}</strong></div><div><small>Parcelas pagas</small><strong>{sale.paid_count}/{sale.installment_count}</strong></div><div><small>Recebido</small><strong className="success-text">{formatCurrency(Number(sale.total_received))}</strong></div><div><small>A receber</small><strong>{formatCurrency(Number(sale.outstanding_amount))}</strong></div></div>
        <Link className="btn" href={`/financing/${sale.id}`}>Abrir parcelas</Link>
      </article>)}</div>
    </section> : !error && <section className="card empty"><span className="empty-icon"><HandCoins/></span><h2>Nenhum financiamento cadastrado</h2><p>Registre a primeira venda parcelada diretamente pela loja.</p><Link className="btn btn-primary" href="/financing/new">Novo financiamento</Link></section>}
  </main>;
}