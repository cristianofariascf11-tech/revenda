import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { todayISO } from "@/lib/format";
import { VehicleForm, type VehicleFormInitial } from "../vehicle-form";

export const metadata: Metadata = { title: "Novo veículo" };

type Params = { from?: string; plate?: string; brand?: string; model?: string; modelYear?: string; chassis?: string; engineNumber?: string; fipeValue?: string };

function cleanText(value: string | undefined, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function evaluationPrefill(params: Params): VehicleFormInitial | undefined {
  if (params.from !== "evaluation") return undefined;
  const currentYear = new Date().getFullYear();
  const requestedYear = Number(params.modelYear);
  const modelYear = Number.isInteger(requestedYear) && requestedYear >= 1950 && requestedYear <= currentYear + 2 ? requestedYear : currentYear;
  const normalizedPlate = cleanText(params.plate, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const requestedFipeValue = Number(params.fipeValue);
  return {
    brand: cleanText(params.brand, 80),
    model: cleanText(params.model, 120),
    model_year: modelYear,
    plate: /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizedPlate) ? normalizedPlate : "",
    chassis: cleanText(params.chassis, 80).toUpperCase(),
    engine_number: cleanText(params.engineNumber, 80).toUpperCase(),
    ownership_type: "propria",
    entry_date: todayISO(),
    purchase_price: "",
    fipe_reference_value: Number.isFinite(requestedFipeValue) && requestedFipeValue > 0 ? requestedFipeValue : "",
    asking_price: "",
    catalog_description: "",
    marketplace_reviewed: true,
    marketplace_warranty: true,
    marketplace_trade: true,
    marketplace_financing: true,
    marketplace_card_24x: true,
  };
}

export default async function NewVehiclePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const initial = evaluationPrefill(params);
  return <main className="shell page stack">
    <div><Link className="btn btn-ghost btn-sm" href="/vehicles"><ChevronLeft size={17}/>Voltar ao estoque</Link></div>
    <div><span className="eyebrow">Cadastro</span><h1 className="page-title">Novo veículo</h1><p className="muted">O código interno será criado automaticamente somente após salvar.</p></div>
    {initial && <div className="alert alert-info">Dados trazidos da avaliação. Confira os identificadores e informe os valores financeiros antes de salvar.</div>}
    <section className="card card-pad"><VehicleForm initial={initial}/></section>
  </main>;
}