"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuthGate } from "@/components/AuthGate";

type FinRow = {
  id: string;
  code: string;
  brand: string;
  model: string;
  model_year: number | null;
  status: string;
  entry_date: string;
  purchase_price: number;
  asking_price: number | null;
  total_costs: number;
  total_invested: number;
  sale_date: string | null;
  sale_price: number | null;
  sale_fees: number | null;
  profit: number | null;
};

type PhotoRow = {
  path: any;
  vehicle_id: string;
  url: string;
  ord: number | null;
};


const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "em_preparacao", label: "Em preparação" },
  { value: "a_venda", label: "À venda" },
  { value: "reservada", label: "Reservada" },
  { value: "vendida", label: "Vendida" },
  { value: "arquivada", label: "Arquivada" },
];

function daysBetween(today: Date, past: Date) {
  return Math.floor((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

function brl(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `R$ ${v.toFixed(2)}`;
}

function badgeForDays(days: number) {
  if (days >= 60) return { label: "60+ dias", tone: "bad" as const };
  if (days >= 45) return { label: "45+ dias", tone: "warn" as const };
  if (days >= 30) return { label: "30+ dias", tone: "soft" as const };
  return null;
}

export default function VehiclesPage() {
  function MobileList({ rows, photos, onStatus }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r: any) => {
        const days = Math.floor(
          (new Date().getTime() - new Date(r.entry_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return (
          <div
            key={r.id}
            style=
            {{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
            }}
          >
            <img
              src={photos[r.id]}
              style={{
                width: "100%",
                height: 160,
                objectFit: "cover",
                borderRadius: 8,
                background: "#fafafa",
              }}
            />

            <div style={{ marginTop: 8, fontWeight: 800 }}>
              {r.brand} {r.model}
            </div>

            <div style={{ fontSize: 12, color: "#666" }}>
              Código: {r.code}
            </div>

            <div style={{ marginTop: 6 }}>
              Compra: {brl(r.purchase_price)}
            </div>

            <div>Custos: {brl(r.total_costs)}</div>
            <div>Anunciado: {r.asking_price ? brl(r.asking_price) : "—"}</div>

            <div style={{ marginTop: 6 }}>
              Dias no pátio: <strong>{days}</strong>
            </div>

            <div style={{ marginTop: 6 }}>
              Lucro:{" "}
              <strong style={{ color: r.profit >= 0 ? "green" : "crimson" }}>
                {r.profit != null ? brl(r.profit) : "—"}
              </strong>
            </div>

            <div style={{ marginTop: 10 }}>
              <Link href={`/vehicles/${r.id}`} style={miniLink}>
                Abrir
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
  const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth <= 768);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<FinRow[]>([]);
  const [photoByVehicle, setPhotoByVehicle] = useState<Record<string, string>>({});

  // filtros
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [onlyStale30, setOnlyStale30] = useState(false);

  const [entryFrom, setEntryFrom] = useState("");
  const [entryTo, setEntryTo] = useState("");
  const [saleFrom, setSaleFrom] = useState("");
  const [saleTo, setSaleTo] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      let query = supabase
        .from("v_vehicle_financials")
        .select(
          "id, code, brand, model, model_year, status, entry_date, purchase_price, asking_price, total_costs, total_invested, sale_date, sale_price, sale_fees, profit"
        )
        .order("entry_date", { ascending: false })
        .limit(200);

      if (status !== "all") query = query.eq("status", status);

      if (entryFrom) query = query.gte("entry_date", entryFrom);
      if (entryTo) query = query.lte("entry_date", entryTo);

      if (saleFrom) query = query.gte("sale_date", saleFrom);
      if (saleTo) query = query.lte("sale_date", saleTo);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const fin = (data ?? []) as FinRow[];
      setRows(fin);

      // Buscar foto principal (ord menor) para os IDs retornados
      const ids = fin.map((r) => r.id);
      if (ids.length) {
        const { data: photos, error: pErr } = await supabase
          .from("vehicle_photos")
          .select("vehicle_id, path, ord")
          .in("vehicle_id", ids);

        if (pErr) throw new Error(pErr.message);

        const best: Record<string, PhotoRow> = {};

(photos ?? []).forEach((p: any) => {
  const row = p as PhotoRow;
  if (!row?.vehicle_id || !row?.path) return;

  const current = best[row.vehicle_id];
  const ord = row.ord ?? 999;
  const currentOrd = current?.ord ?? 999;

  if (!current || ord < currentOrd) best[row.vehicle_id] = row;
});

const map: Record<string, string> = {};

Object.keys(best).forEach((vid) => {
  const path = best[vid].path;

  const { data } = supabase
    .storage
    .from("vehicle-photos")
    .getPublicUrl(path);

  map[vid] = data.publicUrl;
});

setPhotoByVehicle(map);


      } else {
        setPhotoByVehicle({});
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, entryFrom, entryTo, saleFrom, saleTo]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const today = new Date();

    let list = (rows ?? []).filter((r) => {
      const hay = `${r.code} ${r.brand} ${r.model} ${r.model_year ?? ""}`.toLowerCase();
      if (term && !hay.includes(term)) return false;

      const d = daysBetween(today, new Date(r.entry_date));
      const active = r.status === "a_venda" || r.status === "em_preparacao" || r.status === "reservada";
      const stale = active && d >= 30;

      if (onlyStale30 && !stale) return false;

      return true;
    });

    // ordenar “mais paradas primeiro” quando marcado
    if (onlyStale30) {
      list = list.slice().sort((a, b) => {
        const da = daysBetween(today, new Date(a.entry_date));
        const db = daysBetween(today, new Date(b.entry_date));
        return db - da;
      });
    }

    return list;
  }, [rows, q, onlyStale30]);

  const stats = useMemo(() => {
    const invested = filtered.reduce((a, r) => a + Number(r.total_invested ?? 0), 0);
    const profit = filtered.reduce((a, r) => a + Number(r.profit ?? 0), 0);
    const soldCount = filtered.filter((r) => r.sale_price != null).length;

    const today = new Date();
    const stale30 = filtered.filter((r) => {
      const d = daysBetween(today, new Date(r.entry_date));
      const active = r.status === "a_venda" || r.status === "em_preparacao" || r.status === "reservada";
      return active && d >= 30;
    }).length;

    return { invested, profit, soldCount, stale30 };
  }, [filtered]);

  async function quickStatus(vehicleId: string, newStatus: string) {
    try {
      const { error } = await supabase.from("vehicles").update({ status: newStatus }).eq("id", vehicleId);
      if (error) throw new Error(error.message);
      await load();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    }
    async function softDeleteVehicle(vehicleId: string, code: string) {
  const ok = confirm(`Excluir o veículo ${code}?\n\nEle vai sumir do estoque, mas ficará registrado (soft delete).`);
  if (!ok) return;

  try {
    // 1) (opcional) apagar fotos do storage antes
    const { data: photos, error: pErr } = await supabase
      .from("vehicle_photos")
      .select("path")
      .eq("vehicle_id", vehicleId);

    if (pErr) throw new Error(pErr.message);

    const paths = (photos ?? []).map((p: any) => p.path).filter(Boolean);
    if (paths.length) {
      const { error: stErr } = await supabase.storage.from("vehicle-photos").remove(paths);
      if (stErr) throw new Error(stErr.message);
    }

    // 2) apagar registros das fotos (tabela)
    await supabase.from("vehicle_photos").delete().eq("vehicle_id", vehicleId);

    // 3) soft delete do veículo
    const { error } = await supabase
      .from("vehicles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (error) throw new Error(error.message);

    await load();
  } catch (e: any) {
    alert(`Erro ao excluir: ${e.message}`);
  }
}

  }

  return (
    <AuthGate>
  <div
    style={{
      padding: 16,
      maxWidth: 1280,
      margin: "0 auto",
      background: "#ffffff",
      color: "#000000",
      borderRadius: 12,
    }}
  >

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Estoque (Revenda)</h1>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/vehicles/new"
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}
            >
              + Novo veículo
            </Link>

            <button
              onClick={load}
              disabled={loading}
              style={btnStyle}
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              style={btnStyle}
            >
              Sair
            </button>
          </div>
        </div>

        {/* filtros */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1.8fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}>
              <input type="checkbox" checked={onlyStale30} onChange={(e) => setOnlyStale30(e.target.checked)} />
              Só paradas +30 dias (ordena por mais paradas)
            </label>
          </div>

          <div>
            <label style={lbl}>Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex: GV-000123, Honda, XRE..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={lbl}>Entrada (de / até)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="date" value={entryFrom} onChange={(e) => setEntryFrom(e.target.value)} style={inputStyle} />
              <input type="date" value={entryTo} onChange={(e) => setEntryTo(e.target.value)} style={inputStyle} />
            </div>
            <div style={hint}>Filtra pela data de entrada.</div>
          </div>

          <div>
            <label style={lbl}>Venda (de / até)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="date" value={saleFrom} onChange={(e) => setSaleFrom(e.target.value)} style={inputStyle} />
              <input type="date" value={saleTo} onChange={(e) => setSaleTo(e.target.value)} style={inputStyle} />
            </div>
            <div style={hint}>Funciona só para vendidos.</div>
          </div>
        </div>

        {err && <div style={{ marginTop: 12, color: "crimson" }}>Erro: {err}</div>}

        {/* stats */}
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 12,
            background: "#fff",
          }}
        >
          <Stat label="Veículos (filtrados)" value={`${filtered.length}`} />
          <Stat label="Paradas +30d (ativos)" value={`${stats.stale30}`} />
          <Stat label="Total investido" value={brl(stats.invested)} />
          <Stat label="Lucro somado (vendidos)" value={brl(stats.profit)} />
        </div>

        {/* tabela */}
        <div className="table-header">
        <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "90px 120px 1.6fr 120px 130px 140px 140px 140px 220px",
              padding: 12,
              gap: 10,
              background: "#fafafa",
              fontSize: 12,
              color: "#666",
              alignItems: "center",
            }}
          >
            <div>Foto</div>
            <div>Código</div>
            <div>Veículo</div>
            <div>Status</div>
            <div>Dias</div>
            <div>Investido</div>
            <div>Anunciado</div>
            <div>Lucro</div>
            <div>Ações</div>
          </div></div>

          {loading && <div style={{ padding: 16, color: "#666" }}>Carregando...</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 16, color: "#666" }}>Nada encontrado.</div>}

          {filtered.map((r) => {
  const today = new Date();
  const days = daysBetween(today, new Date(r.entry_date));
  const active = ["a_venda", "em_preparacao", "reservada"].includes(r.status);
  const badge = active ? badgeForDays(days) : null;

  const lucro = r.profit;
  const lucroColor = lucro == null ? "#333" : lucro >= 0 ? "green" : "crimson";

  const thumb = photoByVehicle[r.id];

 <style>
{`
  @media (max-width: 768px) {
    .vehicle-row {
      display: block !important;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      margin-bottom: 12px;
      background: #161616;
    }

    .vehicle-row > div {
      width: 100% !important;
      margin-bottom: 6px;
    }

    .table-header {
      display: none;
    }

    .filters {
      grid-template-columns: 1fr !important;
    }

    .top-actions {
      flex-direction: column;
    }
  }

  /* ===== AJUSTES PARA FUNDO ESCURO ===== */

  body {
    background: #0b0b0b;
    color: #f5f5f5;
  }

  h1, h2, h3 {
    color: #ffffff;
  }

  label,
  .hint,
  small {
    color: #cccccc !important;
  }

  input,
  select {
    background: #111 !important;
    color: #ffffff !important;
    border: 1px solid #333 !important;
  }

  input::placeholder {
    color: #888 !important;
  }

  .stats-grid > div,
  .vehicle-row {
    background: #161616 !important;
    border: 1px solid #2a2a2a !important;
    color: #f5f5f5;
  }

  button,
  a {
    background: #1f1f1f !important;
    color: #ffffff !important;
    border: 1px solid #333 !important;
  }

  button:hover,
  a:hover {
    background: #2a2a2a !important;
  /* ===== CONTRASTE FORÇADO (CORRIGE TUDO) ===== */

* {
  color: #f5f5f5 !important;
}

/* textos secundários */
span,
small,
.hint {
  color: #cccccc !important;
}

/* textos apagados */
[style*="color: #666"],
[style*="color:#666"],
[style*="color: #999"],
[style*="color:#999"] {
  color: #cccccc !important;
}

/* fundos claros forçados */
[style*="background: #fafafa"],
[style*="background:#fafafa"],
[style*="background: #fff"],
[style*="background:#fff"],
[style*="background: white"] {
  background: #161616 !important;
}

/* inputs */
input,
select {
  background: #111 !important;
  color: #ffffff !important;
  border: 1px solid #333 !important;
}

/* badges */
span {
  font-weight: 600;
}
}
`}

</style>


  return (
    
    
    <div
  key={r.id}
  className="vehicle-row"
  style={{
    display: "grid",
        gridTemplateColumns:
          "90px 120px 1.6fr 140px 120px 120px 110px 140px 140px 220px",
        padding: 12,
        gap: 10,
        borderTop: "1px solid #eee",
        background: active && days >= 30 ? "#fff7e6" : "white",
        alignItems: "center",
      }}
>
      {/* FOTO */}
      <div
        style={{
          width: 90,
          height: 60,
          borderRadius: 10,
          border: "1px solid #eee",
          overflow: "hidden",
          background: "#fafafa",
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt="Foto"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ fontSize: 12, color: "#999", padding: 8 }}>
            sem foto
          </div>
        )}
      </div>

      {/* CÓDIGO */}
      <div style={{ fontWeight: 900 }}>{r.code}</div>

      {/* MARCA / MODELO */}
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontWeight: 800, textTransform: "uppercase" }}>
          {r.brand}
        </div>
        <div style={{ fontWeight: 700 }}>{r.model}</div>
      </div>

      {/* COMPRA */}
      <div style={{ fontWeight: 800 }}>{brl(r.purchase_price)}</div>

      {/* CUSTOS */}
      <div>{brl(r.total_costs)}</div>

      {/* STATUS */}
      <div>{r.status}</div>

      {/* DIAS */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: active && days >= 30 ? 900 : 600 }}>
          {days} dias
        </span>
        {badge && <Badge label={badge.label} tone={badge.tone} />}
      </div>

      {/* ANUNCIADO */}
      <div style={{ fontWeight: 800 }}>
        {r.asking_price == null ? "—" : brl(r.asking_price)}
      </div>

      {/* LUCRO */}
      <div style={{ fontWeight: 900, color: lucroColor }}>
        {lucro == null ? "—" : brl(lucro)}
      </div>

      {/* AÇÕES */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <Link href={`/vehicles/${r.id}`} style={miniLink}>
          Abrir
        </Link>

        {r.status !== "vendida" && (
          <>
            <button
              onClick={() => quickStatus(r.id, "a_venda")}
              style={miniBtn}
            >
              À venda
            </button>
            <button
              onClick={() => quickStatus(r.id, "reservada")}
              style={miniBtn}
            >
              Reservar
            </button>
            <button
              onClick={() => quickStatus(r.id, "arquivada")}
              style={miniBtn}
            >
              Arquivar
            </button>
          </>
        )}
      </div>
    </div>
  );
})}

        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
          Dica: marque “Só paradas +30 dias” pra ver primeiro as que estão há mais tempo no pátio.
        </div>
      </div>
    </AuthGate>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 10, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "soft" | "warn" | "bad" }) {
  const styleMap: Record<typeof tone, React.CSSProperties> = {
    soft: { background: "#fff7e6", border: "1px solid #f0d9a8", color: "#7a4b00" },
    warn: { background: "#ffe3e3", border: "1px solid #f3b4b4", color: "#7a0000" },
    bad: { background: "#ffd1d1", border: "1px solid #ef9b9b", color: "#7a0000" },
  };

  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        fontWeight: 800,
        ...styleMap[tone],
      }}
    >
      {label}
    </span>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12, color: "#666", marginBottom: 6 };
const hint: React.CSSProperties = { fontSize: 12, color: "#888", marginTop: 6 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};

const miniBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: 12,
};

const miniLink: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  textDecoration: "none",
  color: "inherit",
  fontSize: 12,
};
