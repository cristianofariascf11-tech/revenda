import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, BadgePercent, Landmark, TrendingUp, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { COST_LABEL, type FinancialStatementEntry, type VehicleCost, type VehicleFinancial } from "@/lib/types";
import { groupCostsByCategory, normalizeMonthlyFinancials, summarizeFinancials, summarizeStatement } from "@/lib/financial-dashboard";
import { FinancialFilters } from "./filters";
import { FinancialChart } from "./financial-chart";
import { FinancialStatement } from "./statement";

export const metadata: Metadata = { title: "Financeiro" };
type Params = { from?: string; to?: string };

export default async function FinancialPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { from, to } = await searchParams;
  const supabase = await createClient();
  let statementQuery = supabase.from("v_financial_statement").select("*").order("event_at", { ascending: true }).order("id", { ascending: true });
  if (to) statementQuery = statementQuery.lte("event_date", to);

  const [
    { data: vehicleData, error: vehicleError },
    { data: monthData, error: monthError },
    { data: statementData, error: statementError },
  ] = await Promise.all([
    supabase.from("v_vehicle_financials").select("*").is("deleted_at", null).order("sale_date", { ascending: false }),
    supabase.from("v_profit_by_month").select("*").order("month", { ascending: false }).limit(12),
    statementQuery,
  ]);

  const allVehicles = (vehicleData ?? []) as VehicleFinancial[];
  const saleInPeriod = (vehicle: VehicleFinancial) => vehicle.status !== "vendida" || Boolean(vehicle.sale_date && (!from || vehicle.sale_date >= from) && (!to || vehicle.sale_date <= to));
  const vehicles = allVehicles.filter(saleInPeriod);
  const soldIds = vehicles.filter(vehicle => vehicle.sale_id).map(vehicle => vehicle.id);
  const { data: costData, error: costError } = soldIds.length
    ? await supabase.from("vehicle_costs").select("*").in("vehicle_id", soldIds)
    : { data: [], error: null };

  const summary = summarizeFinancials(vehicles);
  const categoryCosts = groupCostsByCategory((costData ?? []) as VehicleCost[]);
  const months = normalizeMonthlyFinancials(((monthData ?? []) as { month: string; sales_count: number; gross_sales: number; total_profit: number }[])
    .filter(row => (!from || row.month >= `${from.slice(0, 7)}-01`) && (!to || row.month <= `${to.slice(0, 7)}-01`)));

  const statementRows = (statementData ?? []) as FinancialStatementEntry[];
  const previousRows = from ? statementRows.filter(entry => entry.event_date < from) : [];
  const openingBalance = Number(previousRows.at(-1)?.balance ?? 0);
  const visibleStatement = from ? statementRows.filter(entry => entry.event_date >= from) : statementRows;
  const statementSummary = summarizeStatement(visibleStatement, openingBalance);
  const errors = [vehicleError?.message, monthError?.message, costError?.message, statementError?.message].filter(Boolean);

  return <main className="shell page stack">
    <div><span className="eyebrow">Resultados</span><h1 className="page-title">Financeiro</h1><p className="muted">Entradas, saídas, extrato e rentabilidade das motocicletas.</p></div>
    <FinancialFilters/>
    {errors.length > 0 && <div className="alert alert-error">Não foi possível carregar todos os dados: {errors.join(" • ")}</div>}
    <section className="financial-metric-grid">
      <article className="card metric"><span className="metric-icon metric-icon-entry"><ArrowUpRight/></span><span className="metric-label">Entradas de vendas e comissões</span><strong className="metric-value success-text">{formatCurrency(summary.revenue)}</strong><small className="muted">{summary.salesCount} venda{summary.salesCount === 1 ? "" : "s"} no período</small></article>
      <article className="card metric"><span className="metric-icon metric-icon-outflow"><ArrowDownRight/></span><span className="metric-label">Saídas realizadas</span><strong className="metric-value">{formatCurrency(summary.totalOutflows)}</strong><small className="muted">Compras, preparação e taxas</small></article>
      <article className="card metric"><span className="metric-icon metric-icon-profit"><TrendingUp/></span><span className="metric-label">Lucro realizado</span><strong className={`metric-value ${summary.realizedProfit < 0 ? "danger-text" : "success-text"}`}>{formatCurrency(summary.realizedProfit)}</strong><small className="muted">Após todos os custos</small></article>
      <article className="card metric"><span className="metric-icon"><BadgePercent/></span><span className="metric-label">Margem média de lucro</span><strong className={`metric-value ${summary.averageProfitMargin < 0 ? "danger-text" : "orange"}`}>{summary.averageProfitMargin.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong><small className="muted">Sobre vendas próprias ou comissões</small></article>
      <article className="card metric"><span className="metric-icon"><Landmark/></span><span className="metric-label">Capital em estoque</span><strong className="metric-value">{formatCurrency(summary.stockInvested)}</strong><small className="muted">Veículos ativos, fora dos resultados</small></article>
      <article className="card metric"><span className="metric-icon"><WalletCards/></span><span className="metric-label">Custos de preparação</span><strong className="metric-value">{formatCurrency(summary.preparationCosts)}</strong><small className="muted">Dos veículos vendidos</small></article>
    </section>
    <FinancialStatement entries={visibleStatement} summary={statementSummary}/>
    <section className="detail-grid financial-content-grid"><article className="card card-pad stack"><div><span className="eyebrow">Fluxo mensal</span><h2 className="section-title">Entradas versus saídas</h2></div><FinancialChart months={months}/></article><aside className="card card-pad stack"><div><span className="eyebrow">Composição</span><h2 className="section-title">Saídas separadas</h2></div><div className="summary-list"><div className="summary-row"><span>Compra dos veículos</span><strong>{formatCurrency(summary.purchases)}</strong></div><div className="summary-row"><span>Custos de preparação</span><strong>{formatCurrency(summary.preparationCosts)}</strong></div><div className="summary-row"><span>Taxas de venda</span><strong>{formatCurrency(summary.saleFees)}</strong></div><div className="summary-row"><span>Total de saídas</span><strong>{formatCurrency(summary.totalOutflows)}</strong></div></div></aside></section>
    <section className="card card-pad stack"><div><span className="eyebrow">Detalhamento</span><h2 className="section-title">Custos por categoria</h2><p className="muted">Custos de preparação associados às vendas do período selecionado.</p></div>{categoryCosts.length ? <div className="cost-breakdown-grid">{categoryCosts.map(item => { const percentage = summary.preparationCosts > 0 ? item.total / summary.preparationCosts * 100 : 0; return <article className="cost-breakdown-item" key={item.category}><div className="spread"><span>{COST_LABEL[item.category]}</span><strong>{formatCurrency(item.total)}</strong></div><div className="cost-progress"><span style={{ width: `${Math.min(100, percentage)}%` }}/></div><small className="muted">{percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos custos de preparação</small></article>; })}</div> : <div className="empty"><h3>Sem custos no período</h3><p>Os custos separados aparecerão quando houver vendas com despesas registradas.</p></div>}</section>
  </main>;
}