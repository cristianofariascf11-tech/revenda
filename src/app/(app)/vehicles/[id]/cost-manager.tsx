"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { COST_CATEGORIES, COST_LABEL, type CostCategory, type VehicleCost } from "@/lib/types";
import { deleteCostAction, saveCostAction } from "../actions";

type Draft={cost_date:string;category:CostCategory;amount:string;description:string};
const empty=():Draft=>({cost_date:todayISO(),category:"oficina",amount:"",description:""});

export function CostManager({vehicleId,costs}:{vehicleId:string;costs:VehicleCost[]}) {
  const router=useRouter();const[draft,setDraft]=useState<Draft>(empty);const[editing,setEditing]=useState<string|null>(null);const[busy,setBusy]=useState(false);const[error,setError]=useState("");
  async function save(){setBusy(true);setError("");const result=await saveCostAction(vehicleId,editing,{...draft,amount:draft.amount});setBusy(false);if(!result.ok)return setError(result.error??"Falha ao salvar custo.");setDraft(empty());setEditing(null);router.refresh();}
  function edit(cost:VehicleCost){setEditing(cost.id);setDraft({cost_date:cost.cost_date,category:cost.category,amount:String(cost.amount),description:cost.description});}
  async function remove(id:string){if(!confirm("Excluir este custo?"))return;setBusy(true);const result=await deleteCostAction(vehicleId,id);setBusy(false);if(!result.ok)return setError(result.error??"Falha ao excluir.");router.refresh();}
  return <div className="stack">
    {error&&<div className="alert alert-error">{error}</div>}
    <div className="form-grid"><div className="field"><label htmlFor="cost_date">Data</label><input className="input" id="cost_date" type="date" value={draft.cost_date} onChange={e=>setDraft({...draft,cost_date:e.target.value})}/></div><div className="field"><label htmlFor="category">Categoria</label><select className="select" id="category" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as CostCategory})}>{COST_CATEGORIES.map(c=><option key={c} value={c}>{COST_LABEL[c]}</option>)}</select></div><div className="field"><label htmlFor="amount">Valor</label><input className="input" id="amount" type="number" min="0.01" step="0.01" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})}/></div><div className="field"><label htmlFor="description">Descrição</label><input className="input" id="description" maxLength={500} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></div></div>
    <div className="cluster"><button className="btn btn-primary" disabled={busy} onClick={save}>{editing?<Pencil size={16}/>:<Plus size={16}/>} {editing?"Salvar edição":"Adicionar custo"}</button>{editing&&<button className="btn" onClick={()=>{setEditing(null);setDraft(empty())}}><X size={16}/>Cancelar</button>}</div>
    {costs.length?<div className="table-wrap"><table className="data-table" style={{minWidth:600}}><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{costs.map(cost=><tr key={cost.id}><td>{formatDate(cost.cost_date)}</td><td>{COST_LABEL[cost.category]}</td><td>{cost.description||"—"}</td><td><strong>{formatCurrency(cost.amount)}</strong></td><td><div className="cluster"><button className="btn btn-sm icon-btn" onClick={()=>edit(cost)} title="Editar"><Pencil size={15}/></button><button className="btn btn-danger btn-sm icon-btn" disabled={busy} onClick={()=>remove(cost.id)} title="Excluir"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>:<p className="muted">Nenhum custo registrado.</p>}
  </div>;
}