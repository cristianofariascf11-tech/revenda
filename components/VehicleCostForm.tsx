"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const CATEGORY_OPTIONS = [
  { value: "pecas", label: "Peças" },
  { value: "oficina", label: "Oficina" },
  { value: "lavagem_polimento", label: "Lavagem / Polimento" },
  { value: "despachante_cartorio", label: "Despachante / Cartório" },
  { value: "ipva_licenciamento_multas", label: "IPVA / Licenciamento / Multas" },
  { value: "transporte_guincho", label: "Transporte / Guincho" },
  { value: "anuncios_marketing", label: "Anúncios / Marketing" },
  { value: "outros", label: "Outros" },
];

export function VehicleCostForm({
  vehicleId,
  onDone,
}: {
  vehicleId: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      if (amount === "" || Number(amount) <= 0) throw new Error("Informe um valor válido.");

      const payload = {
        vehicle_id: vehicleId,
        cost_date: costDate,
        category,
        amount: Number(amount),
        description: description || null,
      };

      const { error } = await supabase.from("vehicle_costs").insert(payload);
      if (error) throw new Error(error.message);

      setAmount("");
      setDescription("");
      onDone?.();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Adicionar custo</h3>

      {err && <div style={{ marginBottom: 10, color: "crimson" }}>Erro: {err}</div>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Data">
            <input type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex: 250.00"
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Descrição (opcional)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: pastilhas, mão de obra, guincho..."
            style={inputStyle}
          />
        </Field>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Salvando..." : "Salvar custo"}
        </button>
      </form>
    </div>
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
