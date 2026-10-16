import { formatCurrency } from "@/lib/format";
import type { MonthlyFinancial } from "@/lib/financial-dashboard";

const monthLabel=(value:string)=>new Intl.DateTimeFormat("pt-BR",{month:"short",year:"2-digit",timeZone:"UTC"}).format(new Date(`${value.slice(0,10)}T12:00:00Z`)).replace(" de ","/");

export function FinancialChart({months}:{months:MonthlyFinancial[]}){
  if(!months.length)return <div className="empty"><h3>Sem vendas no período</h3><p>O comparativo mensal aparecerá após a primeira venda registrada.</p></div>;
  const max=Math.max(1,...months.flatMap(month=>[month.entries,month.outflows]));
  return <div className="stack"><div className="chart-legend"><span><i className="legend-dot legend-entry"/>Entradas</span><span><i className="legend-dot legend-outflow"/>Saídas</span></div><div className="financial-chart-scroll"><div className="financial-chart" style={{gridTemplateColumns:`repeat(${months.length}, minmax(62px, 1fr))`}}>{months.map(month=><div className="chart-month" key={month.month}><div className="chart-bars"><div className="chart-bar chart-bar-entry" style={{height:`${Math.max(3,month.entries/max*100)}%`}} title={`Entradas: ${formatCurrency(month.entries)}`} aria-label={`Entradas ${formatCurrency(month.entries)}`}/><div className="chart-bar chart-bar-outflow" style={{height:`${Math.max(3,month.outflows/max*100)}%`}} title={`Saídas: ${formatCurrency(month.outflows)}`} aria-label={`Saídas ${formatCurrency(month.outflows)}`}/></div><strong>{monthLabel(month.month)}</strong><small>{month.salesCount} venda{month.salesCount===1?"":"s"}</small></div>)}</div></div></div>;
}