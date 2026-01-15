"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { sumCosts } from "@/lib/costs";

type Cost = {
  id: string;
  cost_date: string;
  category: string;
  amount: number;
  description: string | null;
};

function formatCategory(cat: string) {
  const map: Record<string, string> = {
    pecas: "Peças",
    oficina: "Oficina",
    lavagem_polimento: "Lavagem / Polimento",
    despachante_cartorio: "Despachante / Cartório",
    ipva_licenciamento_multas: "IPVA / Licenciamento / Multas",
    transporte_guincho: "Transporte / Guincho",
    anuncios_marketing: "Anúncios / Marketing",
    outros: "Outros",
  };
  return map[cat] ?? cat;
}

export function VehicleCostList({
  vehicleId,
  costs,
  onChanged,
}: {
  vehicleId: string;
  costs: Cost[];
  onChanged?: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const total = sumCosts(costs);

  async function removeCost(id: string) {
    if (!confirm("Excluir este custo?")) return;

    setBusyId(id);
    try {
      const { error } = await supabase
        .from("vehicle_costs")
        .delete()
        .eq("id", id)
        .eq("vehicle_id", vehicleId);

      if (error) throw new Error(error.message);
      onChanged?.();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Custos</h3>
        <div style={{ fontWeight: 800 }}>Total: R$ {total.toFixed(2)}</div>
      </div>

      {costs.length === 0 ? (
        <div style={{ marginTop: 10, color: "#666" }}>Nenhum custo cadastrado ainda.</div>
      ) : (
        <div style={{ marginTop: 12, borderTop: "1px solid #eee" }}>
          {costs
            .slice()
            .sort((a, b) => (a.cost_date < b.cost_date ? 1 : -1))
            .map((c) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr 120px 90px",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid #f2f2f2",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13, color: "#666" }}>{c.cost_date}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{formatCategory(c.category)}</div>
                  {c.description && <div style={{ fontSize: 13, color: "#666" }}>{c.description}</div>}
                </div>
                <div style={{ textAlign: "right", fontWeight: 700 }}>R$ {Number(c.amount).toFixed(2)}</div>
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => removeCost(c.id)}
                    disabled={busyId === c.id}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    {busyId === c.id ? "..." : "Excluir"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
