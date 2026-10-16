import type { Metadata } from "next";
import { AlertTriangle, CalendarClock, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInstallmentAlert } from "@/lib/financing";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_FREQUENCY_LABEL, type StoreFinancedInstallment, type StoreFinancedSale } from "@/lib/types";
import { InstallmentList } from "./installment-list";
import { BuyerEditor } from "./buyer-editor";
import { FrequencyEditor } from "./frequency-editor";

export const metadata: Metadata = { title: "Parcelas do financiamento" };

type VehicleInfo = { id: string; code: string; brand: string; model: string; model_year: number; plate: string | null };

export default async function FinancingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: saleData } = await supabase.from("store_financed_sales").select("*").eq("id", id).single();
  if (!saleData) notFound();
  const sale = saleData as StoreFinancedSale;
  const [{ data: vehicleData }, { data: installmentData, error }] = await Promise.all([
    supabase.from("vehicles").select("id,code,brand,model,model_year,plate").eq("id", sale.vehicle_id).single(),
    supabase.from("store_financed_installments").select("*").eq("financed_sale_id", id).order("installment_number"),
  ]);
  if (!vehicleData) notFound();
  const vehicle = vehicleData as VehicleInfo;
  const installments = (installmentData ?? []) as StoreFinancedInstallment[];
  const paid = installments.filter(item => item.paid_at);
  const pending = installments.filter(item => !item.paid_at);
  const overdue = pending.filter(item => getInstallmentAlert(item.due_date, null).status === "overdue");
  const dueSoon = pending.filter(item => ["today", "upcoming"].includes(getInstallmentAlert(item.due_date, null).status));
  const installmentsReceived = paid.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalReceived = Number(sale.down_payment) + installmentsReceived;
  const outstanding = pending.reduce((sum, item) => sum + Number(item.amount), 0);

  return <main className="shell page stack">
    <div><Link className="btn btn-ghost btn-sm" href="/financing"><ChevronLeft size={17}/>Voltar aos financiamentos</Link></div>
    {query.created === "1" && <div className="alert alert-info">Financiamento registrado e {sale.installment_count} parcelas geradas com sucesso.</div>}
    {overdue.length > 0 && <div className="financing-critical-alert" role="alert"><AlertTriangle/><div><strong>Alerta máximo: {overdue.length} parcela{overdue.length === 1 ? " está" : "s estão"} vencida{overdue.length === 1 ? "" : "s"}</strong><span>Total em atraso: {formatCurrency(overdue.reduce((sum, item) => sum + Number(item.amount), 0))}. Regularize as parcelas destacadas em vermelho.</span></div></div>}
    {overdue.length === 0 && dueSoon.length > 0 && <div className="financing-upcoming-alert"><CalendarClock/><div><strong>{dueSoon.length} parcela{dueSoon.length === 1 ? " vence" : "s vencem"} nos próximos 5 dias</strong><span>Os vencimentos próximos estão destacados para facilitar o contato com o cliente.</span></div></div>}
    <div className="spread"><div><span className="code">{vehicle.code}</span><h1 className="page-title">{vehicle.brand} {vehicle.model}</h1><p className="muted">{vehicle.model_year} • {vehicle.plate ?? "Sem placa"} • Cliente: {sale.customer_name}</p></div><span className={`badge ${pending.length === 0 ? "financing-badge-paid" : overdue.length ? "financing-badge-overdue" : "financing-badge-active"}`}>{pending.length === 0 ? "Quitado" : overdue.length ? "Em atraso" : "Em dia"}</span></div>

    <section className="metric-grid">
      <article className="card metric"><span className="metric-label">Valor total da venda</span><strong className="metric-value">{formatCurrency(Number(sale.total_sale_amount))}</strong><small className="muted">Entrada + {sale.installment_count} parcelas</small></article>
      <article className="card metric"><span className="metric-label">Total recebido</span><strong className="metric-value success-text">{formatCurrency(totalReceived)}</strong><small className="muted">Inclui entrada de {formatCurrency(Number(sale.down_payment))}</small></article>
      <article className="card metric"><span className="metric-label">Saldo a receber</span><strong className="metric-value">{formatCurrency(outstanding)}</strong><small className="muted">{pending.length} parcela{pending.length === 1 ? "" : "s"} em aberto</small></article>
      <article className="card metric"><span className="metric-label">Progresso</span><strong className="metric-value">{paid.length}/{sale.installment_count}</strong><small className="muted">parcelas recebidas</small></article>
    </section>

    <section className="detail-grid financing-detail-grid">
      <BuyerEditor financedSaleId={sale.id} buyer={{customer_name:sale.customer_name,customer_cpf:sale.customer_cpf,customer_phone:sale.customer_phone,customer_address:sale.customer_address}}/>
      <aside className="card card-pad stack"><div><span className="eyebrow">Contrato</span><h2 className="section-title">Condições da venda</h2></div><div className="summary-list"><div className="summary-row"><span>Data da venda</span><strong>{formatDate(sale.sale_date)}</strong></div><div className="summary-row"><span>Entrada</span><strong>{formatCurrency(Number(sale.down_payment))}</strong></div><div className="summary-row"><span>Periodicidade</span><strong>{PAYMENT_FREQUENCY_LABEL[sale.payment_frequency]}</strong></div><div className="summary-row"><span>Parcelamento</span><strong>{sale.installment_count} × {formatCurrency(Number(sale.installment_amount))}</strong></div><div className="summary-row"><span>1º vencimento</span><strong>{formatDate(sale.first_due_date)}</strong></div>{sale.notes && <div className="summary-row"><span>Observações</span><strong>{sale.notes}</strong></div>}</div><FrequencyEditor financedSaleId={sale.id} initialFrequency={sale.payment_frequency} paidInstallments={paid.length}/></aside>
    </section>

    <section className="card card-pad stack"><div className="spread"><div><span className="eyebrow">Carnê {sale.payment_frequency}</span><h2 className="section-title">Parcelas do financiamento</h2></div><span className="muted">Baixa e estorno com um clique</span></div>{error ? <div className="alert alert-error">Não foi possível carregar as parcelas: {error.message}</div> : <InstallmentList financedSaleId={sale.id} installments={installments}/>}</section>
  </main>;
}