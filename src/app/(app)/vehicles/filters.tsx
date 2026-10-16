"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OWNERSHIP_LABEL, STATUS_LABEL, VEHICLE_OWNERSHIP_TYPES, VEHICLE_STATUSES } from "@/lib/types";

export function VehicleFilters() {
  const current = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [values, setValues] = useState(() => Object.fromEntries(current.entries()));
  function apply() { const params = new URLSearchParams(); Object.entries(values).forEach(([k,v]) => v && params.set(k,v)); router.push(`${pathname}?${params}`); }
  return <section className="card filters" aria-label="Filtros do estoque">
    <div className="field"><label htmlFor="q">Busca</label><div className="cluster" style={{flexWrap:"nowrap"}}><input className="input" id="q" value={values.q ?? ""} onChange={e => setValues({...values,q:e.target.value})} onKeyDown={e => e.key === "Enter" && apply()} placeholder="Código, marca, modelo, ano ou placa"/><button className="btn icon-btn" onClick={apply} aria-label="Buscar"><Search size={18}/></button></div></div>
    <div className="field"><label htmlFor="status">Status</label><select className="select" id="status" value={values.status ?? ""} onChange={e => setValues({...values,status:e.target.value})}><option value="">Todos</option>{VEHICLE_STATUSES.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
    <div className="field"><label htmlFor="ownership">Origem</label><select className="select" id="ownership" value={values.ownership ?? ""} onChange={e => setValues({...values,ownership:e.target.value})}><option value="">Todas</option>{VEHICLE_OWNERSHIP_TYPES.map(type=><option key={type} value={type}>{OWNERSHIP_LABEL[type]}</option>)}</select></div>
    <div className="field"><label htmlFor="entryFrom">Entrada inicial</label><input className="input" type="date" id="entryFrom" value={values.entryFrom ?? ""} onChange={e => setValues({...values,entryFrom:e.target.value})}/></div>
    <div className="field"><label htmlFor="entryTo">Entrada final</label><input className="input" type="date" id="entryTo" value={values.entryTo ?? ""} onChange={e => setValues({...values,entryTo:e.target.value})}/></div>
    <div className="field"><label htmlFor="saleFrom">Venda inicial</label><input className="input" type="date" id="saleFrom" value={values.saleFrom ?? ""} onChange={e => setValues({...values,saleFrom:e.target.value})}/></div>
    <div className="field"><label htmlFor="saleTo">Venda final</label><input className="input" type="date" id="saleTo" value={values.saleTo ?? ""} onChange={e => setValues({...values,saleTo:e.target.value})}/></div>
    <label className="filter-check"><input type="checkbox" checked={values.stale === "1"} onChange={e => setValues({...values,stale:e.target.checked?"1":""})}/> Somente paradas há mais de 30 dias</label>
    <div className="cluster" style={{alignSelf:"end"}}><button className="btn btn-primary" onClick={apply}>Aplicar filtros</button><button className="btn btn-ghost" onClick={()=>{setValues({});router.push(pathname)}}><X size={16}/>Limpar</button></div>
  </section>;
}