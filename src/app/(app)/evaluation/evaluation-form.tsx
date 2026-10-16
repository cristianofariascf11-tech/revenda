"use client";

import { Bike, Calculator, Camera, FileDown, History, Save, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateSuggestedOffer, evaluationCostTotal } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { EvaluationCosts } from "@/lib/types";
import { saveEvaluationAction } from "./actions";

type Initial = {
  plate: string;
  brand: string;
  model: string;
  modelYear: number;
  chassis?: string | null;
  engineNumber?: string | null;
  fipeValue: number;
  discountPercent: number;
  costs: EvaluationCosts;
  source: string;
  consultedAt: string;
};

type ApiAlternative = {
  brand: string;
  model: string;
  modelYear: number;
  fipeCode: string;
  referenceMonth: string;
  fuel: string;
  value: number;
  similarity: number;
  correspondence: number;
};

const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ORIGINAL_PHOTO_SIZE = 15 * 1024 * 1024;
const emptyCosts: EvaluationCosts = { tires: 0, documents: 0, workshop: 0, detailing: 0, transport: 0, others: 0 };
const costLabels: Record<keyof EvaluationCosts, string> = {
  tires: "Pneus",
  documents: "Documentação",
  workshop: "Oficina",
  detailing: "Estética",
  transport: "Transporte",
  others: "Outros",
};

async function compressEvaluationPhoto(file: File) {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) throw new Error("Formato não aceito. Use JPG, PNG ou WEBP.");
  if (file.size > MAX_ORIGINAL_PHOTO_SIZE) throw new Error("A foto original deve ter no máximo 15 MB.");

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("Não foi possível compactar a foto.");
    if (blob.size > 5 * 1024 * 1024) throw new Error("A foto compactada ultrapassou 5 MB.");
    return blob;
  } finally {
    bitmap.close();
  }
}

export function EvaluationForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [modelYear, setModelYear] = useState(initial?.modelYear ?? new Date().getFullYear());
  const [chassis, setChassis] = useState(initial?.chassis ?? "");
  const [engineNumber, setEngineNumber] = useState(initial?.engineNumber ?? "");
  const [fipe, setFipe] = useState(initial?.fipeValue ?? 0);
  const [discount, setDiscount] = useState(initial?.discountPercent ?? 20);
  const [costs, setCosts] = useState(initial?.costs ?? emptyCosts);
  const [source, setSource] = useState(initial?.source ?? "Entrada manual");
  const [consultedAt, setConsultedAt] = useState(initial?.consultedAt ?? new Date().toISOString());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [couldNotFetch, setCouldNotFetch] = useState(!initial);
  const [alternatives, setAlternatives] = useState<ApiAlternative[]>([]);
  const [selectedAlternative, setSelectedAlternative] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [savedEvaluationId, setSavedEvaluationId] = useState("");

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const total = useMemo(() => evaluationCostTotal(costs), [costs]);
  const offer = useMemo(() => calculateSuggestedOffer(fipe, discount, total), [fipe, discount, total]);
  const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const canAddVehicle = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizedPlate) && Boolean(brand.trim() && model.trim() && modelYear >= 1950);
  const addVehicleHref = useMemo(() => {
    const params = new URLSearchParams({
      from: "evaluation",
      plate: normalizedPlate,
      brand: brand.trim(),
      model: model.trim(),
      modelYear: String(modelYear),
      fipeValue: String(fipe),
    });
    if (chassis.trim()) params.set("chassis", chassis.trim());
    if (engineNumber.trim()) params.set("engineNumber", engineNumber.trim());
    return `/vehicles/new?${params.toString()}`;
  }, [brand, chassis, engineNumber, fipe, model, modelYear, normalizedPlate]);
  const infoMessage = message.includes("concluída") || message.includes("salva") || message.includes("selecionada") || message.includes("Enviando");

  async function lookup() {
    setLoading(true);
    setMessage("");
    setAlternatives([]);
    setSelectedAlternative(0);
    setSavedEvaluationId("");
    setChassis("");
    setEngineNumber("");
    try {
      const response = await fetch("/api/evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate }),
      });
      const data = await response.json();
      setConsultedAt(data.consultedAt ?? new Date().toISOString());
      if (data.vehicle) {
        setBrand(data.vehicle.brand);
        setModel(data.vehicle.model);
        setModelYear(data.vehicle.modelYear);
        setChassis(data.vehicle.chassis ?? "");
        setEngineNumber(data.vehicle.engineNumber ?? "");
      }
      if (data.ok) {
        setFipe(data.fipeValue);
        setSource(data.source);
        setAlternatives(data.alternatives ?? []);
        setCouldNotFetch(false);
        setMessage(data.warning ?? "Consulta concluída.");
      } else {
        setFipe(0);
        setSource(data.source ? `${data.source} / FIPE manual` : "Entrada manual");
        setCouldNotFetch(true);
        setMessage(data.error ?? "Consulta indisponível. Informe os dados manualmente.");
      }
    } catch {
      setFipe(0);
      setSource("Entrada manual");
      setCouldNotFetch(true);
      setMessage("O serviço está indisponível. Informe a FIPE manualmente.");
    } finally {
      setLoading(false);
    }
  }

  function chooseAlternative(index: number) {
    const item = alternatives[index];
    if (!item) return;
    setSelectedAlternative(index);
    setBrand(item.brand);
    setModel(item.model);
    setModelYear(item.modelYear);
    setFipe(item.value);
    setSource(`Placa FIPE • ${item.referenceMonth || "referência atual"} • ${item.fipeCode || "sem código"}`);
  }

  function selectPhoto(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setMessage("Formato não aceito. Use JPG, PNG ou WEBP.");
      if (photoInput.current) photoInput.current.value = "";
      return;
    }
    if (file.size > MAX_ORIGINAL_PHOTO_SIZE) {
      setMessage("A foto original deve ter no máximo 15 MB.");
      if (photoInput.current) photoInput.current.value = "";
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMessage("Foto selecionada. Ela será salva junto com a avaliação.");
  }

  function removeSelectedPhoto() {
    setPhoto(null);
    setPhotoPreview("");
    if (photoInput.current) photoInput.current.value = "";
  }

  async function save() {
    setLoading(true);
    setMessage(photo ? "Enviando e salvando a foto..." : "");
    let photoPath: string | undefined;
    const supabase = photo ? createClient() : null;

    try {
      if (photo && supabase) {
        const blob = await compressEvaluationPhoto(photo);
        photoPath = `evaluations/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("vehicle-photos").upload(photoPath, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }

      const result = await saveEvaluationAction({
        plate: plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        brand,
        model,
        model_year: modelYear,
        chassis,
        engine_number: engineNumber,
        fipe_value: fipe,
        discount_percent: discount,
        additional_costs: costs,
        additional_costs_total: total,
        suggested_offer: offer,
        source,
        source_consulted_at: consultedAt,
        photo_path: photoPath,
      });

      if (!result.ok) {
        if (photoPath && supabase) await supabase.storage.from("vehicle-photos").remove([photoPath]);
        setMessage(result.error ?? "Falha ao salvar.");
        return;
      }

      removeSelectedPhoto();
      setSavedEvaluationId(result.id);
      setMessage("Avaliação salva no histórico com sucesso.");
      router.refresh();
    } catch (error) {
      if (photoPath && supabase) await supabase.storage.from("vehicle-photos").remove([photoPath]);
      setMessage(error instanceof Error ? error.message : "Falha ao enviar a foto.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="stack">
    {message && <div className={infoMessage ? "alert alert-info" : "alert alert-error"}>{message}</div>}

    <section className="card card-pad stack">
      <div className="spread">
        <div><span className="eyebrow">Etapa 1</span><h2 className="section-title">Consultar veículo</h2></div>
        <Link className="btn" href="/evaluation/history"><History size={17} />Histórico</Link>
      </div>
      <div className="cluster" style={{ alignItems: "end" }}>
        <div className="field" style={{ flex: "1 1 260px" }}>
          <label htmlFor="plate">Placa</label>
          <input className="input" id="plate" maxLength={8} value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} placeholder="ABC1D23" />
        </div>
        <button className="btn btn-primary" onClick={lookup} disabled={loading || plate.replace(/[^A-Z0-9]/g, "").length !== 7}>
          <Search size={17} />{loading ? "Consultando..." : "Consultar placa e FIPE"}
        </button>
      </div>
      <small className="muted">A consulta usa somente os fornecedores configurados. Se eles falharem, o preenchimento manual é liberado.</small>
    </section>

    <section className="card card-pad stack">
      <div><span className="eyebrow">Etapa 2</span><h2 className="section-title">Dados e referência FIPE</h2></div>
      {alternatives.length > 1 && <div className="field">
        <label htmlFor="fipe_match">Correspondência FIPE encontrada</label>
        <select className="select" id="fipe_match" value={selectedAlternative} onChange={(event) => chooseAlternative(Number(event.target.value))}>
          {alternatives.map((item, index) => <option key={`${item.fipeCode}-${index}`} value={index}>{item.brand} {item.model} • {item.modelYear} • {item.fuel} • {formatCurrency(item.value)}</option>)}
        </select>
        <small className="muted">Confira o modelo antes de salvar a oferta.</small>
      </div>}
      <div className="form-grid-3">
        <div className="field"><label>Marca</label><input className="input" value={brand} onChange={(event) => setBrand(event.target.value)} disabled={!couldNotFetch} /></div>
        <div className="field"><label>Modelo</label><input className="input" value={model} onChange={(event) => setModel(event.target.value)} disabled={!couldNotFetch} /></div>
        <div className="field"><label>Ano</label><input className="input" type="number" value={modelYear} onChange={(event) => setModelYear(Number(event.target.value))} disabled={!couldNotFetch} /></div>
        <div className="field"><label>Chassi</label><input className="input code" maxLength={80} value={chassis} onChange={(event) => setChassis(event.target.value.toUpperCase())} placeholder="Não informado pela API" /></div>
        <div className="field"><label>Número do motor</label><input className="input code" maxLength={80} value={engineNumber} onChange={(event) => setEngineNumber(event.target.value.toUpperCase())} placeholder="Não informado pela API" /></div>
        <div className="field"><label>Valor FIPE {couldNotFetch ? "(manual)" : ""}</label><input className="input" type="number" min="0" step="0.01" value={fipe || ""} onChange={(event) => { setFipe(Number(event.target.value)); setSource(source.includes("manual") ? source : "Entrada manual"); }} /></div>
        <div className="field"><label>Percentual abaixo da FIPE</label><select className="select" value={discount} onChange={(event) => setDiscount(Number(event.target.value))}>{[15, 20, 25].map((value) => <option value={value} key={value}>{value}% abaixo</option>)}</select></div>
      </div>
      {(chassis.includes("*") || engineNumber.includes("*")) && <small className="muted">A API protege alguns identificadores com asteriscos. Você pode completar ou corrigir os dados após a conferência presencial.</small>}
      <small className="muted">Fonte: {source} • Consulta: {new Date(consultedAt).toLocaleString("pt-BR")}</small>
    </section>

    <section className="card card-pad stack">
      <div><span className="eyebrow">Etapa 3</span><h2 className="section-title">Foto da avaliação</h2></div>
      <div className="evaluation-photo-upload">
        <div className="evaluation-photo-preview">
          {photoPreview
            ? <Image src={photoPreview} alt="Prévia da motocicleta" fill unoptimized sizes="(max-width: 700px) 100vw, 280px" />
            : <div className="evaluation-photo-placeholder"><Camera size={34} /><span>Nenhuma foto selecionada</span></div>}
        </div>
        <div className="stack" style={{ alignContent: "center" }}>
          <p className="muted">Adicione uma foto da motocicleta para identificá-la facilmente no histórico.</p>
          <div className="cluster">
            <input ref={photoInput} hidden id="evaluation-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectPhoto(event.target.files?.[0])} disabled={loading} />
            <label className="btn btn-primary" htmlFor="evaluation-photo"><Camera size={17} />{photo ? "Trocar foto" : "Adicionar foto"}</label>
            {photo && <button className="btn btn-danger" type="button" onClick={removeSelectedPhoto} disabled={loading}><Trash2 size={16} />Remover</button>}
          </div>
          <small className="muted">JPG, PNG ou WEBP • até 15 MB • compactação automática</small>
        </div>
      </div>
    </section>

    <section className="card card-pad stack">
      <div><span className="eyebrow">Etapa 4</span><h2 className="section-title">Custos previstos</h2></div>
      <div className="form-grid-3">{(Object.keys(costs) as (keyof EvaluationCosts)[]).map((key) => <div className="field" key={key}><label>{costLabels[key]}</label><input className="input" type="number" min="0" step="0.01" value={costs[key] || ""} onChange={(event) => setCosts({ ...costs, [key]: Number(event.target.value) })} /></div>)}</div>
    </section>

    <section className="card card-pad">
      <div className="detail-grid">
        <div><span className="eyebrow">Oferta calculada</span><h2 className="page-title" style={{ color: "var(--orange)" }}>{fipe > 0 ? formatCurrency(offer) : "FIPE indisponível"}</h2><p className="muted">{formatCurrency(fipe)} − {discount}% − {formatCurrency(total)} em custos</p></div>
        <div className="stack">
          <div className="alert alert-info"><Calculator size={17} /> A oferta nunca fica negativa e só pode ser salva com FIPE maior que zero.</div>
          <button className="btn btn-primary" onClick={save} disabled={loading || fipe <= 0 || !brand || !model}><Save size={17} />{loading ? "Salvando..." : "Salvar no histórico"}</button>
          {canAddVehicle && <Link className="btn" href={addVehicleHref}><Bike size={17} />Adicionar veículo ao estoque</Link>}
          {savedEvaluationId && <a className="btn" href={`/api/evaluation/${savedEvaluationId}/pdf`}><FileDown size={17} />Baixar PDF da avaliação</a>}
        </div>
      </div>
    </section>
  </div>;
}