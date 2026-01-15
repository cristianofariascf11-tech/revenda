"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Photo = {
  id: string;
  path: string;
  public_url: string;
  created_at: string;
};

export function VehiclePhotoGallery({
  vehicleId,
  photos,
  onChanged,
}: {
  vehicleId: string;
  photos: Photo[];
  onChanged?: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function removePhoto(p: Photo) {
    if (!confirm("Excluir esta foto?")) return;

    setBusyId(p.id);
    try {
      // remove do storage
      const { error: stErr } = await supabase.storage.from("vehicle-photos").remove([p.path]);
      if (stErr) throw new Error(stErr.message);

      // remove do banco
      const { error: dbErr } = await supabase
        .from("vehicle_photos")
        .delete()
        .eq("id", p.id)
        .eq("vehicle_id", vehicleId);

      if (dbErr) throw new Error(dbErr.message);

      onChanged?.();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>Galeria</h3>

      {photos.length === 0 ? (
        <div style={{ color: "#666" }}>Nenhuma foto cadastrada ainda.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <img
                src={p.public_url}
                alt="Foto do veículo"
                style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
              />
              <div style={{ padding: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <a href={p.public_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                  Abrir
                </a>
                <button
                  onClick={() => removePhoto(p)}
                  disabled={busyId === p.id}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {busyId === p.id ? "..." : "Excluir"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
