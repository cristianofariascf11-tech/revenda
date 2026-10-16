"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteVehicleAction } from "../actions";

export function DeleteVehicle({ id, code }: { id: string; code: string }) {
  const router = useRouter(); const [open,setOpen]=useState(false); const [complete,setComplete]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function confirm() { setBusy(true); setError(""); const result=await deleteVehicleAction(id,complete); setBusy(false); if(!result.ok)return setError(result.error??"Não foi possível excluir."); router.replace("/vehicles"); router.refresh(); }
  if (!open) return <button className="btn btn-danger" onClick={()=>setOpen(true)}><Trash2 size={17}/>Excluir veículo</button>;
  return <div className="card card-pad stack" role="alertdialog" aria-labelledby="delete-title">
    <h3 className="section-title" id="delete-title">Confirmar exclusão de {code}</h3>
    <p className="muted">A exclusão normal oculta o veículo e preserva o histórico.</p>
    <label className="filter-check"><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/> Exclusão completa: remover também fotos, custos e venda</label>
    {complete && <div className="alert alert-error">Esta opção é permanente e exige a chave administrativa configurada somente no servidor.</div>}
    {error && <div className="alert alert-error">{error}</div>}
    <div className="cluster"><button className="btn btn-danger" disabled={busy} onClick={confirm}>{busy?"Excluindo...":"Sim, excluir"}</button><button className="btn" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button></div>
  </div>;
}