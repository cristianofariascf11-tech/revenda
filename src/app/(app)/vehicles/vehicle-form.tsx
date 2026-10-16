"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { todayISO } from "@/lib/format";
import { vehicleSchema } from "@/lib/schemas";
import type { VehicleOwnershipType } from "@/lib/types";
import { createVehicleAction, updateVehicleAction } from "./actions";

type FormInput = z.input<typeof vehicleSchema>;
type FormData = z.output<typeof vehicleSchema>;
export type VehicleFormInitial = {
  brand: string;
  model: string;
  model_year: number;
  plate: string;
  chassis: string;
  engine_number: string;
  ownership_type: VehicleOwnershipType;
  entry_date: string;
  purchase_price: number | "";
  fipe_reference_value: number | "";
  asking_price: number | "";
  catalog_description: string;
  marketplace_reviewed: boolean;
  marketplace_warranty: boolean;
  marketplace_trade: boolean;
  marketplace_financing: boolean;
  marketplace_card_24x: boolean;
};

export function VehicleForm({ vehicleId, initial, code }: { vehicleId?: string; initial?: VehicleFormInitial; code?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: initial ?? { brand: "", model: "", model_year: new Date().getFullYear(), plate: "", chassis: "", engine_number: "", ownership_type: "propria", entry_date: todayISO(), purchase_price: "", fipe_reference_value: "", asking_price: "", catalog_description: "", marketplace_reviewed: true, marketplace_warranty: true, marketplace_trade: true, marketplace_financing: true, marketplace_card_24x: true },
  });
  const ownershipType = watch("ownership_type") ?? "propria";
  async function submit(values: FormData) {
    setMessage("");
    const result = vehicleId ? await updateVehicleAction(vehicleId, values) : await createVehicleAction(values);
    if (!result.ok) return setMessage(result.error ?? "Não foi possível salvar.");
    if (vehicleId) { setMessage("Dados salvos com sucesso."); router.refresh(); }
    else if (result.id) router.replace(`/vehicles/${result.id}?created=1`);
    else setMessage("O veículo foi salvo, mas a identificação não foi retornada.");
  }
  return <form className="stack" onSubmit={handleSubmit(submit)} noValidate>
    {message && <div className={message.includes("sucesso") ? "alert alert-info" : "alert alert-error"} role="status">{message}</div>}
    <div className="form-grid">
      <div className="field"><label>Código interno</label><input className="input" value={code ?? "Gerado ao salvar"} disabled aria-label="Código automático"/></div>
      <div className="field"><label htmlFor="plate">Placa (opcional)</label><input className="input" id="plate" placeholder="ABC1D23" maxLength={8} {...register("plate")}/>{errors.plate && <span className="field-error">{String(errors.plate.message)}</span>}</div>
      <div className="field"><label htmlFor="brand">Marca</label><input className="input" id="brand" placeholder="Honda" {...register("brand")}/>{errors.brand && <span className="field-error">{String(errors.brand.message)}</span>}</div>
      <div className="field"><label htmlFor="model">Modelo</label><input className="input" id="model" placeholder="CG 160 Titan" {...register("model")}/>{errors.model && <span className="field-error">{String(errors.model.message)}</span>}</div>
      <div className="field"><label htmlFor="model_year">Ano do modelo</label><input className="input" id="model_year" type="number" {...register("model_year")}/>{errors.model_year && <span className="field-error">{String(errors.model_year.message)}</span>}</div>
      <div className="field"><label htmlFor="chassis">Chassi (opcional)</label><input className="input code" id="chassis" maxLength={80} placeholder="Ex.: 9C2KC..." {...register("chassis")}/>{errors.chassis && <span className="field-error">{String(errors.chassis.message)}</span>}</div>
      <div className="field"><label htmlFor="engine_number">Número do motor (opcional)</label><input className="input code" id="engine_number" maxLength={80} placeholder="Ex.: KC16E..." {...register("engine_number")}/>{errors.engine_number && <span className="field-error">{String(errors.engine_number.message)}</span>}</div>
      <div className="field"><label htmlFor="ownership_type">Origem do veículo</label><select className="select" id="ownership_type" {...register("ownership_type", { onChange: event => {
        if (event.target.value === "consignada") setValue("purchase_price", "", { shouldValidate: true });
      } })}><option value="propria">Moto própria</option><option value="consignada">Moto consignada</option></select></div>
      <div className="field"><label htmlFor="entry_date">Data de entrada</label><input className="input" id="entry_date" type="date" {...register("entry_date")}/>{errors.entry_date && <span className="field-error">{String(errors.entry_date.message)}</span>}</div>
      {ownershipType === "propria" ? <div className="field"><label htmlFor="purchase_price">Valor de compra</label><input className="input" id="purchase_price" type="number" min="0.01" step="0.01" {...register("purchase_price")}/>{errors.purchase_price && <span className="field-error">{String(errors.purchase_price.message)}</span>}</div> : <div className="ownership-note"><strong>Moto consignada</strong><span>Não gera custo de compra. A comissão será informada somente quando a venda for registrada.</span></div>}
      <div className="field"><label htmlFor="fipe_reference_value">Valor FIPE de referência (opcional)</label><input className="input" id="fipe_reference_value" type="number" min="0" step="0.01" placeholder="Usado como parâmetro do anúncio" {...register("fipe_reference_value")}/>{errors.fipe_reference_value && <span className="field-error">{String(errors.fipe_reference_value.message)}</span>}</div>
      <div className="field"><label htmlFor="asking_price">Valor anunciado (opcional)</label><input className="input" id="asking_price" type="number" min="0" step="0.01" {...register("asking_price")}/>{errors.asking_price && <span className="field-error">{String(errors.asking_price.message)}</span>}</div>
    </div>
    <section className="marketplace-form-section">
      <div><span className="eyebrow">Anúncio</span><h2 className="section-title">Descrição para o catálogo e marketplaces</h2><p className="muted">Informe os diferenciais específicos desta moto. Depois de salvar, o app gera uma legenda completa para copiar.</p></div>
      <div className="field"><label htmlFor="catalog_description">Destaques da motocicleta (opcional)</label><textarea className="input textarea" id="catalog_description" rows={4} maxLength={1000} placeholder="Ex.: Pneus novos, relação nova, baixa quilometragem e manual do proprietário." {...register("catalog_description")}/>{errors.catalog_description && <span className="field-error">{String(errors.catalog_description.message)}</span>}</div>
      <div><span className="field-label">Itens que serão incluídos no anúncio</span><div className="marketplace-option-grid">
        <label className="marketplace-option"><input type="checkbox" {...register("marketplace_reviewed")}/><span><strong>Revisada</strong><small>Pronta para rodar</small></span></label>
        <label className="marketplace-option"><input type="checkbox" {...register("marketplace_warranty")}/><span><strong>Garantia de 3 meses</strong><small>Conforme condições da loja</small></span></label>
        <label className="marketplace-option"><input type="checkbox" {...register("marketplace_trade")}/><span><strong>Aceitamos trocas</strong><small>Mediante avaliação</small></span></label>
        <label className="marketplace-option"><input type="checkbox" {...register("marketplace_financing")}/><span><strong>Financiamento</strong><small>Nas principais financeiras</small></span></label>
        <label className="marketplace-option"><input type="checkbox" {...register("marketplace_card_24x")}/><span><strong>Cartão em até 24x</strong><small>Consulte as condições</small></span></label>
      </div></div>
    </section>
    <div className="cluster"><button className="btn btn-primary" disabled={isSubmitting}><Save size={18}/>{isSubmitting ? "Salvando..." : "Salvar veículo"}</button></div>
  </form>;
}