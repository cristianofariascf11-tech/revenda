"use client";

import { Pencil, Save, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCpf, formatPhone } from "@/lib/financing";
import { updateFinancedCustomerAction } from "../actions";

type Buyer = { customer_name: string; customer_cpf: string; customer_phone: string; customer_address: string };

export function BuyerEditor({ financedSaleId, buyer }: { financedSaleId: string; buyer: Buyer }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(buyer);
  const [current, setCurrent] = useState(buyer);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function cancel() { setDraft(current); setEditing(false); setError(""); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const result = await updateFinancedCustomerAction(financedSaleId, draft);
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Não foi possível atualizar o comprador.");
    setCurrent(draft); setEditing(false); setMessage("Dados do comprador atualizados."); router.refresh();
  }

  return <article className="card card-pad stack">
    <div className="spread"><div><span className="eyebrow">Cliente</span><h2 className="section-title"><UserRound size={19}/> Dados do comprador</h2></div>{!editing && <button className="btn btn-sm" type="button" onClick={() => { setEditing(true); setMessage(""); }}><Pencil size={16}/>Editar</button>}</div>
    {message && <div className="alert alert-info" role="status">{message}</div>}
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {editing ? <form className="stack" onSubmit={save}>
      <div className="field"><label htmlFor="edit_customer_name">Nome completo</label><input className="input" id="edit_customer_name" value={draft.customer_name} onChange={event => setDraft({...draft,customer_name:event.target.value})} required/></div>
      <div className="two-col"><div className="field"><label htmlFor="edit_customer_cpf">CPF</label><input className="input" id="edit_customer_cpf" value={draft.customer_cpf} onChange={event => setDraft({...draft,customer_cpf:event.target.value})} inputMode="numeric" required/></div><div className="field"><label htmlFor="edit_customer_phone">Telefone</label><input className="input" id="edit_customer_phone" value={draft.customer_phone} onChange={event => setDraft({...draft,customer_phone:event.target.value})} inputMode="tel" required/></div></div>
      <div className="field"><label htmlFor="edit_customer_address">Endereço completo</label><input className="input" id="edit_customer_address" value={draft.customer_address} onChange={event => setDraft({...draft,customer_address:event.target.value})} required/></div>
      <div className="cluster"><button className="btn btn-primary" disabled={busy}><Save size={16}/>{busy ? "Salvando..." : "Salvar comprador"}</button><button className="btn btn-ghost" type="button" onClick={cancel} disabled={busy}><X size={16}/>Cancelar</button></div>
    </form> : <div className="summary-list"><div className="summary-row"><span>Nome</span><strong>{current.customer_name}</strong></div><div className="summary-row"><span>CPF</span><strong>{formatCpf(current.customer_cpf)}</strong></div><div className="summary-row"><span>Telefone</span><strong>{formatPhone(current.customer_phone)}</strong></div><div className="summary-row"><span>Endereço</span><strong>{current.customer_address}</strong></div></div>}
  </article>;
}