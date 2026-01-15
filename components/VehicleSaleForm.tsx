"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function VehicleSaleForm({
  vehicleId,
  onDone,
}: {
  vehicleId: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [saleFees, setSaleFees] = useState<number | "">("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      if (salePrice === "" || Number(salePrice) <= 0) {
        throw new Error("Informe o valor da venda.");
      }

      const payload = {
        vehicle_id: vehicleId,
        sale_date: saleDate,
        sale_price: Number(salePrice),
        sale_fees: saleFees === "" ? 0 : Number(saleFees),
      };

      const { error } = await supabase.from("vehicle_sales").insert(payload);
      if (error) throw new Error(error.message);

      // Atualiza status do veículo
      await supabase
        .from("vehicles")
        .update({ status: "vendida", sold_at: saleDate })
        .eq("id", vehicleId);

      onDone?.();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>Registrar venda</h3>

      {err && <div style={{ marginBottom: 10, color: "crimson" }}>Erro: {err}</div>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Data da venda">
            <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Valor da venda (R$)">
            <input
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value === "" ? "" : Number(e.target.value))}
              style={inputStyle}
            />
          </Field>

          <Field label="Taxas (R$)">
            <input
              type="number"
              step="0.01"
              value={saleFees}
              onChange={(e) => setSaleFees(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Opcional"
              style={inputStyle}
            />
          </Field>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Salvando..." : "Confirmar venda"}
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
