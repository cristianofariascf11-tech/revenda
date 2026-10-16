import { ArrowDownRight, ArrowUpRight, Landmark, ListChecks } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FinancialStatementEntry } from "@/lib/types";

type StatementSummary = {
  openingBalance: number;
  totalEntries: number;
  totalOutflows: number;
  periodResult: number;
  closingBalance: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  compra_veiculo: "Compra da moto",
  pecas: "Peças",
  oficina: "Oficina",
  lavagem_polimento: "Lavagem/Polimento",
  despachante_cartorio: "Despachante/Cartório",
  ipva_licenciamento_multas: "IPVA/Licenciamento/Multas",
  transporte_guincho: "Transporte/Guincho",
  anuncios_marketing: "Anúncios/Marketing",
  outros: "Outros",
  taxa_venda: "Taxa da venda",
  venda_vista: "Venda à vista",
  comissao_consignacao: "Comissão de consignação",
  entrada_financiamento: "Entrada do financiamento",
  parcela_financiamento: "Parcela do financiamento",
};

export function FinancialStatement({ entries, summary }: { entries: FinancialStatementEntry[]; summary: StatementSummary }) {
  const ordered = [...entries].sort((a, b) => b.event_at.localeCompare(a.event_at) || b.id.localeCompare(a.id));

  return <section className="card card-pad stack financial-statement">
    <div className="spread"><div><span className="eyebrow">Conferência de caixa</span><h2 className="section-title">Extrato de entradas e saídas</h2><p className="muted">Lançamentos automáticos em ordem cronológica, sem duplicar vendas financiadas.</p></div><ListChecks className="orange"/></div>
    <div className="statement-summary-grid">
      <article><span>Saldo anterior</span><strong>{formatCurrency(summary.openingBalance)}</strong></article>
      <article><span>Entradas no período</span><strong className="success-text">+ {formatCurrency(summary.totalEntries)}</strong></article>
      <article><span>Saídas no período</span><strong className="danger-text">- {formatCurrency(summary.totalOutflows)}</strong></article>
      <article><span>Saldo final</span><strong className={summary.closingBalance < 0 ? "danger-text" : "success-text"}>{formatCurrency(summary.closingBalance)}</strong></article>
    </div>

    {ordered.length > 0 ? <>
      <div className="table-wrap"><table className="data-table statement-table"><thead><tr><th>Data</th><th>Tipo</th><th>Lançamento</th><th>Motocicleta</th><th>Entrada</th><th>Saída</th><th>Saldo</th></tr></thead><tbody>
        {ordered.map(entry => <tr key={entry.id}>
          <td><strong>{formatDate(entry.event_date)}</strong></td>
          <td><span className={`badge statement-badge-${entry.direction}`}>{entry.direction === "entrada" ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {entry.direction === "entrada" ? "Entrada" : "Saída"}</span></td>
          <td><strong>{CATEGORY_LABEL[entry.category] ?? entry.category}</strong><br/><small className="muted">{entry.description}</small></td>
          <td><span className="code">{entry.vehicle_code}</span><br/><small className="muted">{entry.vehicle_label}{entry.plate ? ` • ${entry.plate}` : ""}</small></td>
          <td className="success-text">{entry.direction === "entrada" ? <strong>+ {formatCurrency(Number(entry.amount))}</strong> : "—"}</td>
          <td className="danger-text">{entry.direction === "saida" ? <strong>- {formatCurrency(Number(entry.amount))}</strong> : "—"}</td>
          <td><strong>{formatCurrency(Number(entry.balance))}</strong></td>
        </tr>)}
      </tbody></table></div>
      <div className="mobile-cards">{ordered.map(entry => <article className="statement-card" key={entry.id}>
        <div className="spread"><span className={`badge statement-badge-${entry.direction}`}>{entry.direction === "entrada" ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {entry.direction === "entrada" ? "Entrada" : "Saída"}</span><strong>{formatDate(entry.event_date)}</strong></div>
        <div><span className="code">{entry.vehicle_code}</span><h3>{CATEGORY_LABEL[entry.category] ?? entry.category}</h3><p className="muted">{entry.description}</p></div>
        <div className="statement-card-values"><span><small>Valor</small><strong className={entry.direction === "entrada" ? "success-text" : "danger-text"}>{entry.direction === "entrada" ? "+" : "-"} {formatCurrency(Number(entry.amount))}</strong></span><span><small>Saldo após lançamento</small><strong>{formatCurrency(Number(entry.balance))}</strong></span></div>
      </article>)}</div>
    </> : <div className="empty"><span className="empty-icon"><Landmark/></span><h3>Sem lançamentos no período</h3><p>Altere as datas ou registre uma compra, custo, venda ou recebimento.</p></div>}
  </section>;
}