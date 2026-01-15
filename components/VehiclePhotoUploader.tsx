"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabaseClient";

function safeFileExt(name: string) {
  const parts = name.split(".");
  const ext = (parts[parts.length - 1] || "jpg").toLowerCase();
  return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
}

export function VehiclePhotoUploader({
  vehicleId,
  currentCount,
  onDone,
}: {
  vehicleId: string;
  currentCount: number;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remaining = Math.max(0, 4 - currentCount);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selected = Array.from(files).slice(0, remaining);

    if (selected.length === 0) {
      setErr("Limite de 4 fotos atingido.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      for (const file of selected) {
        const ext = safeFileExt(file.name);

        // compressão (boa qualidade e leve)
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });

        const fileName = `${crypto.randomUUID()}.${ext}`;
        const path = `${vehicleId}/${fileName}`;

        // upload no bucket
        const { error: upErr } = await supabase.storage
          .from("vehicle-photos")
          .upload(path, compressed, { upsert: false });

        if (upErr) throw new Error(upErr.message);

        // pega URL pública
        const { data: pub } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
        const publicUrl = pub.publicUrl;

        // grava no banco
        const { error: dbErr } = await supabase.from("vehicle_photos").insert({
          vehicle_id: vehicleId,
          path,
          public_url: publicUrl,
        });

        if (dbErr) throw new Error(dbErr.message);
      }

      onDone?.();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Fotos ({currentCount}/4)</h3>
        <div style={{ fontSize: 12, color: "#666" }}>
          Você pode adicionar mais {remaining} foto(s).
        </div>
      </div>

      {err && <div style={{ marginTop: 10, color: "crimson" }}>Erro: {err}</div>}

      <div style={{ marginTop: 12 }}>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={loading || remaining === 0}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
        Dica: escolha fotos na horizontal quando possível (fica melhor na vitrine).
      </div>
    </div>
  );
}

