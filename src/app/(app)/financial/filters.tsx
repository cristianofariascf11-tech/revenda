"use client";

import { Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function FinancialFilters() {
  const current = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [from, setFrom] = useState(current.get("from") ?? "");
  const [to, setTo] = useState(current.get("to") ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(params.size ? `${pathname}?${params}` : pathname);
  }

  function clear() {
    setFrom("");
    setTo("");
    router.push(pathname);
  }

  return <section className="card card-pad financial-filters" aria-label="Período financeiro">
    <div className="field"><label htmlFor="financial_from">Data inicial</label><input className="input" id="financial_from" type="date" value={from} onChange={event => setFrom(event.target.value)}/></div>
    <div className="field"><label htmlFor="financial_to">Data final</label><input className="input" id="financial_to" type="date" value={to} onChange={event => setTo(event.target.value)}/></div>
    <button className="btn btn-primary" onClick={apply}><Filter size={17}/>Aplicar período</button>
    <button className="btn btn-ghost" onClick={clear}><X size={17}/>Limpar</button>
  </section>;
}