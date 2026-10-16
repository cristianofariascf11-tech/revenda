"use client";

import { Check, FileText, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInstallmentAlert } from "@/lib/financing";
import type { StoreFinancedInstallment } from "@/lib/types";
import { setInstallmentPaidAction } from "../actions";

function paidDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function InstallmentList({ financedSaleId, installments }: { financedSaleId: string; installments: StoreFinancedInstallment[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(installments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function toggle(row: StoreFinancedInstallment) {
    const paid = !row.paid_at;
    setBusyId(row.id);
    setMessage("");
    setError("");
    const result = await setInstallmentPaidAction(financedSaleId, row.id, paid);
    setBusyId(null);
    if (!result.ok) return setError(result.error ?? "Não foi possível atualizar a parcela.");
    setRows(current => current.map(item => item.id === row.id ? { ...item, paid_at: result.paidAt ?? null, paid_by: paid ? "current-user" : null } : item));
    setMessage(paid ? `Parcela ${row.installment_number} recebida. O recibo já está disponível.` : `Baixa da parcela ${row.installment_number} desfeita.`);
    router.refresh();
  }

  return <div className="stack">
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {message && <div className="alert alert-info" role="status">{message}</div>}
    <div className="table-wrap"><table className="data-table installment-table"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody>
      {rows.map(row => {
        const alert = getInstallmentAlert(row.due_date, row.paid_at);
        return <tr key={row.id} className={`installment-row installment-${alert.status}`}>
          <td><strong>{String(row.installment_number).padStart(2, "0")}/{rows.length}</strong></td>
          <td><strong>{formatDate(row.due_date)}</strong></td>
          <td><strong>{formatCurrency(Number(row.amount))}</strong></td>
          <td><span className={`badge installment-badge-${alert.status}`}>{alert.label}</span></td>
          <td>{row.paid_at ? <small>{paidDate(row.paid_at)}</small> : <span className="muted">Aguardando</span>}</td>
          <td><div className="cluster">
            <button className={`btn btn-sm ${row.paid_at ? "btn-ghost" : "btn-primary"}`} onClick={() => toggle(row)} disabled={busyId === row.id} aria-label={row.paid_at ? `Desfazer baixa da parcela ${row.installment_number}` : `Dar baixa na parcela ${row.installment_number}`}>
              {row.paid_at ? <RotateCcw size={16}/> : <Check size={16}/>} {busyId === row.id ? "Salvando..." : row.paid_at ? "Desfazer baixa" : "Dar baixa"}
            </button>
            {row.paid_at && <a className="btn btn-sm" href={`/api/financing/${financedSaleId}/installments/${row.id}/receipt`} target="_blank" rel="noreferrer"><FileText size={16}/>Recibo PDF</a>}
          </div></td>
        </tr>;
      })}
    </tbody></table></div>
    <div className="mobile-cards">{rows.map(row => {
      const alert = getInstallmentAlert(row.due_date, row.paid_at);
      return <article className={`installment-card installment-${alert.status}`} key={row.id}>
        <div className="spread"><strong>Parcela {String(row.installment_number).padStart(2, "0")}/{rows.length}</strong><span className={`badge installment-badge-${alert.status}`}>{alert.label}</span></div>
        <div className="installment-card-value"><span><small>Vencimento</small><strong>{formatDate(row.due_date)}</strong></span><strong>{formatCurrency(Number(row.amount))}</strong></div>
        {row.paid_at && <small className="muted">Recebida em {paidDate(row.paid_at)}</small>}
        <div className="installment-card-actions"><button className={`btn ${row.paid_at ? "btn-ghost" : "btn-primary"}`} onClick={() => toggle(row)} disabled={busyId === row.id}>{row.paid_at ? <RotateCcw size={17}/> : <Check size={17}/>} {row.paid_at ? "Desfazer baixa" : "Dar baixa"}</button>{row.paid_at && <a className="btn" href={`/api/financing/${financedSaleId}/installments/${row.id}/receipt`} target="_blank" rel="noreferrer"><FileText size={17}/>Recibo PDF</a>}</div>
      </article>;
    })}</div>
  </div>;
}