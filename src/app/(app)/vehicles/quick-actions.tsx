"use client";

import { useState, useTransition } from "react";
import { updateStatusAction } from "./actions";
import type { VehicleStatus } from "@/lib/types";

export function QuickStatus({ id, status }: { id: string; status: VehicleStatus }) {
  const [message, setMessage] = useState(""); const [pending, start] = useTransition();
  const actions: { label: string; value: VehicleStatus }[] = status === "em_preparacao" ? [{label:"Colocar à venda",value:"a_venda"},{label:"Arquivar",value:"arquivada"}] : status === "a_venda" ? [{label:"Reservar",value:"reservada"},{label:"Arquivar",value:"arquivada"}] : status === "reservada" ? [{label:"Voltar à venda",value:"a_venda"},{label:"Arquivar",value:"arquivada"}] : status === "arquivada" ? [{label:"Reabrir",value:"em_preparacao"}] : [];
  if (!actions.length) return null;
  return <div className="cluster">{actions.map(action=><button key={action.value} className="btn btn-sm" disabled={pending} title={message} onClick={()=>start(async()=>{const r=await updateStatusAction(id,action.value);setMessage(r.error??"")})}>{action.label}</button>)}</div>;
}