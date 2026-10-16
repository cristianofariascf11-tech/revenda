"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Trash2, UserCheck } from "lucide-react";
import type { LeadStatus } from "@/lib/catalog-leads";
import { updateLeadStatusAction } from "./actions";

const actions: Record<LeadStatus, { label: string; value: LeadStatus; icon: typeof Check }[]> = {
  novo: [
    { label: "Marcar contatado", value: "contatado", icon: UserCheck },
    { label: "Descartar", value: "descartado", icon: Trash2 },
  ],
  contatado: [
    { label: "Marcar convertido", value: "convertido", icon: Check },
    { label: "Voltar para novo", value: "novo", icon: RotateCcw },
    { label: "Descartar", value: "descartado", icon: Trash2 },
  ],
  convertido: [{ label: "Voltar para contatado", value: "contatado", icon: RotateCcw }],
  descartado: [{ label: "Reabrir lead", value: "novo", icon: RotateCcw }],
};

export function LeadActions({ id, status }: { id: string; status: LeadStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(nextStatus: LeadStatus) {
    setBusy(true);
    setError("");
    const result = await updateLeadStatusAction(id, nextStatus);
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Não foi possível atualizar.");
    router.refresh();
  }

  return <div className="lead-admin-actions">
    {actions[status].map(action => {
      const Icon = action.icon;
      return <button className="btn btn-sm" type="button" key={action.value} disabled={busy} onClick={() => change(action.value)}><Icon size={15}/>{action.label}</button>;
    })}
    {error && <small className="danger-text">{error}</small>}
  </div>;
}