"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AuthGate } from "@/components/AuthGate";


export default function NewVehiclePage() {
  const router = useRouter();

  const [codeLoading, setCodeLoading] = useState(true);


  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [code, setCode] = useState("GV-000001");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");

  // Gera um código simples (pra já funcionar hoje)
  // Depois a gente liga o gerador automático GV-000123 (com a função que te passei)
  

    // opcional: você pode deixar manual por enquanto


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      if (!code || !brand || !model) throw new Error("Preencha Código, Marca e Modelo.");
      if (purchasePrice === "" || Number(purchasePrice) <= 0) throw new Error("Informe o valor de compra.");

     const payload: any = {
  brand,
  model,
  entry_date: entryDate,
  purchase_price: Number(purchasePrice),
  status: "em_preparacao",
};


      const { data: inserted, error } = await supabase
  .from("vehicles")
  .insert(payload)
  .select("id");

if (error) throw new Error(error.message);

const newId = inserted?.[0]?.id;

if (!newId) {
  // Se por algum motivo não retornou o id, busca pelo code recém-criado
  const { data: found, error: findErr } = await supabase
    .from("vehicles")
    .select("id")
    .eq("code", code)
    .order("created_at", { ascending: false })
    .limit(1);

  if (findErr) throw new Error(findErr.message);

  const fallbackId = found?.[0]?.id;
  if (!fallbackId) throw new Error("Veículo foi criado, mas não consegui obter o ID.");

  router.push(`/vehicles/${fallbackId}`);
  return;
}

router.push(`/vehicles/${newId}`);

    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGate>
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22 }}>Novo veículo</h1>

      {err && <p style={{ color: "crimson" }}>Erro: {err}</p>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Field label="Código (gerado ao salvar)">
  <input value="(automático)" disabled style={inputStyle} />
</Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Marca">
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Honda" style={inputStyle} />
          </Field>

          <Field label="Modelo">
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="CG 160" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Data de entrada">
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Compra (R$)">
            <input
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="12000"
              style={inputStyle}
            />
          </Field>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Salvando..." : "Criar veículo"}
        </button>
      </form>
    </div></AuthGate>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  width: "fit-content",
};

