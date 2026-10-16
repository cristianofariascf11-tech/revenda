"use client";

import { Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAYMENT_FREQUENCY_LABEL, type PaymentFrequency } from "@/lib/types";
import { updateFinancingFrequencyAction } from "../actions";

export function FrequencyEditor({ financedSaleId, initialFrequency, paidInstallments }: {
  financedSaleId: string;
  initialFrequency: PaymentFrequency;
  paidInstallments: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage("");
    const result = await updateFinancingFrequencyAction(financedSaleId, { payment_frequency: frequency });
    setSaving(false);
    if (!result.ok) return setMessage(result.error ?? "Não foi possível alterar a periodicidade.");
    setEditing(false);
    setMessage("Periodicidade atualizada. As parcelas em aberto foram recalculadas.");
    router.refresh();
  }

  return <div className="financing-frequency-editor stack">
    <div className="spread">
      <div><span className="eyebrow">Periodicidade do carnê</span><strong>{PAYMENT_FREQUENCY_LABEL[editing ? frequency : initialFrequency]}</strong></div>
      {!editing && <button className="btn btn-sm" type="button" onClick={() => { setEditing(true); setMessage(""); }}><Pencil size={15}/>Alterar</button>}
    </div>
    {editing && <>
      <div className="field"><label htmlFor="edit_payment_frequency">Nova periodicidade</label><select className="select" id="edit_payment_frequency" value={frequency} onChange={event => setFrequency(event.target.value as PaymentFrequency)}><option value="mensal">Mensal</option><option value="semanal">Semanal</option></select></div>
      <p className="muted">As parcelas em aberto serão recalculadas a partir do primeiro vencimento. {paidInstallments === 1 ? "A parcela já paga será preservada." : paidInstallments > 1 ? `As ${paidInstallments} parcelas já pagas serão preservadas.` : "Nenhuma parcela paga será alterada."}</p>
      <div className="cluster"><button className="btn btn-primary btn-sm" type="button" disabled={saving} onClick={save}><Save size={15}/>{saving ? "Salvando..." : "Salvar alteração"}</button><button className="btn btn-ghost btn-sm" type="button" disabled={saving} onClick={() => { setFrequency(initialFrequency); setEditing(false); setMessage(""); }}><X size={15}/>Cancelar</button></div>
    </>}
    {message && <div className={message.includes("atualizada") ? "alert alert-info" : "alert alert-error"} role="status">{message}</div>}
  </div>;
}