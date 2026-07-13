"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/lib/supabaseClient";
import styles from "./vehicles.module.css";

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
  vehicle_id: string;
  path: string;
  ord: number | null;
};

type DayBadge = {
  label: string;
  tone: "soft" | "warn" | "bad";
};

type StockViewProps = {
  rows: FinRow[];
  photos: Record<string, string>;
  onStatus: (vehicleId: string, newStatus: string) => Promise<void>;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "em_preparacao", label: "Em preparação" },
  { value: "a_venda", label: "À venda" },
  { value: "reservada", label: "Reservada" },
  { value: "vendida", label: "Vendida" },
  { value: "arquivada", label: "Arquivada" },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.filter((item) => item.value !== "all").map((item) => [
    item.value,
    item.label,
  ])
);

const ACTIVE_STATUSES = ["a_venda", "em_preparacao", "reservada"];

function daysBetween(today: Date, past: Date) {
  return Math.max(
    0,
    Math.floor((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function daysInStock(row: FinRow) {
  return daysBetween(new Date(), new Date(row.entry_date));
}

function brl(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function badgeForDays(days: number): DayBadge | null {
  if (days >= 60) return { label: "60+ dias", tone: "bad" };
  if (days >= 45) return { label: "45+ dias", tone: "warn" };
  if (days >= 30) return { label: "30+ dias", tone: "soft" };
  return null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}

function VehiclePhoto({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return <div className={styles.noPhoto}>Sem foto</div>;
  }

  return (
    <Image
      src={src}
      alt={name}
      fill
      sizes="(max-width: 760px) 100vw, 86px"
      className={styles.photo}
      unoptimized
    />
  );
}

function DaysDisplay({ row }: { row: FinRow }) {
  const days = daysInStock(row);
  const badge = ACTIVE_STATUSES.includes(row.status)
    ? badgeForDays(days)
    : null;

  return (
    <div className={styles.daysCell}>
      <span>{days} dias</span>
      {badge && (
        <span className={`${styles.badge} ${styles[badge.tone]}`}>
          {badge.label}
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`${styles.statusPill} ${styles[`status_${status}`] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function RowActions({
  row,
  onStatus,
}: {
  row: FinRow;
  onStatus: StockViewProps["onStatus"];
}) {
  return (
    <div className={styles.rowActions}>
      <Link href={`/vehicles/${row.id}`} className={styles.openLink}>
        Abrir
      </Link>

      {row.status !== "vendida" && (
        <>
          <button
            type="button"
            onClick={() => onStatus(row.id, "a_venda")}
            className={styles.smallButton}
          >
            À venda
          </button>
          <button
            type="button"
            onClick={() => onStatus(row.id, "reservada")}
            className={styles.smallButton}
          >
            Reservar
          </button>
          <button
            type="button"
            onClick={() => onStatus(row.id, "arquivada")}
            className={styles.smallButton}
          >
            Arquivar
          </button>
        </>
      )}
    </div>
  );
}

function DesktopTable({ rows, photos, onStatus }: StockViewProps) {
  return (
    <div className={styles.desktopTable}>
      <div className={styles.tableScroller}>
        <div className={`${styles.tableGrid} ${styles.tableHead}`}>
          <span>Foto</span>
          <span>Código</span>
          <span>Veículo</span>
          <span>Compra</span>
          <span>Custos</span>
          <span>Status</span>
          <span>Dias</span>
          <span>Anunciado</span>
          <span>Lucro</span>
          <span>Ações</span>
        </div>

        {rows.map((row) => {
          const profitClass =
            row.profit == null
              ? styles.neutral
              : row.profit >= 0
                ? styles.positive
                : styles.negative;

          return (
            <div className={`${styles.tableGrid} ${styles.tableRow}`} key={row.id}>
              <div className={styles.tablePhoto}>
                <VehiclePhoto
                  src={photos[row.id]}
                  name={`${row.brand} ${row.model}`}
                />
              </div>
              <strong className={styles.code}>{row.code}</strong>
              <div className={styles.vehicleName}>
                <strong>{row.brand}</strong>
                <span>
                  {row.model}
                  {row.model_year ? ` · ${row.model_year}` : ""}
                </span>
              </div>
              <strong>{brl(row.purchase_price)}</strong>
              <span>{brl(row.total_costs)}</span>
              <StatusPill status={row.status} />
              <DaysDisplay row={row} />
              <strong>{row.asking_price == null ? "—" : brl(row.asking_price)}</strong>
              <strong className={profitClass}>
                {row.profit == null ? "—" : brl(row.profit)}
              </strong>
              <RowActions row={row} onStatus={onStatus} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MobileCards({ rows, photos, onStatus }: StockViewProps) {
  return (
    <div className={styles.mobileCards}>
      {rows.map((row) => {
        const profitClass =
          row.profit == null
            ? styles.neutral
            : row.profit >= 0
              ? styles.positive
              : styles.negative;

        return (
          <article className={styles.mobileCard} key={row.id}>
            <div className={styles.mobilePhoto}>
              <VehiclePhoto
                src={photos[row.id]}
                name={`${row.brand} ${row.model}`}
              />
              <div className={styles.mobileStatus}>
                <StatusPill status={row.status} />
              </div>
            </div>

            <div className={styles.mobileBody}>
              <div className={styles.mobileTitleRow}>
                <div>
                  <span className={styles.mobileCode}>{row.code}</span>
                  <h2>
                    {row.brand} {row.model}
                  </h2>
                  {row.model_year && <p>Ano {row.model_year}</p>}
                </div>
                <DaysDisplay row={row} />
              </div>

              <div className={styles.mobileValues}>
                <div>
                  <span>Compra</span>
                  <strong>{brl(row.purchase_price)}</strong>
                </div>
                <div>
                  <span>Custos</span>
                  <strong>{brl(row.total_costs)}</strong>
                </div>
                <div>
                  <span>Anunciado</span>
                  <strong>
                    {row.asking_price == null ? "—" : brl(row.asking_price)}
                  </strong>
                </div>
                <div>
                  <span>Lucro</span>
                  <strong className={profitClass}>
                    {row.profit == null ? "—" : brl(row.profit)}
                  </strong>
                </div>
              </div>

              <RowActions row={row} onStatus={onStatus} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function VehiclesPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<FinRow[]>([]);
  const [photoByVehicle, setPhotoByVehicle] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [onlyStale30, setOnlyStale30] = useState(false);
  const [entryFrom, setEntryFrom] = useState("");
  const [entryTo, setEntryTo] = useState("");
  const [saleFrom, setSaleFrom] = useState("");
  const [saleTo, setSaleTo] = useState("");

  const load = useCallback(async () => {
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
      if (error) throw error;

      const financialRows = (data ?? []) as FinRow[];
      setRows(financialRows);

      const ids = financialRows.map((row) => row.id);
      if (!ids.length) {
        setPhotoByVehicle({});
        return;
      }

      const { data: photoData, error: photoError } = await supabase
        .from("vehicle_photos")
        .select("vehicle_id, path, ord")
        .in("vehicle_id", ids);

      if (photoError) throw photoError;

      const primaryPhotos: Record<string, PhotoRow> = {};

      ((photoData ?? []) as PhotoRow[]).forEach((photo) => {
        if (!photo.vehicle_id || !photo.path) return;

        const current = primaryPhotos[photo.vehicle_id];
        const order = photo.ord ?? 999;
        const currentOrder = current?.ord ?? 999;

        if (!current || order < currentOrder) {
          primaryPhotos[photo.vehicle_id] = photo;
        }
      });

      const photoMap: Record<string, string> = {};

      Object.entries(primaryPhotos).forEach(([vehicleId, photo]) => {
        const { data: publicData } = supabase.storage
          .from("vehicle-photos")
          .getPublicUrl(photo.path);

        photoMap[vehicleId] = publicData.publicUrl;
      });

      setPhotoByVehicle(photoMap);
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [entryFrom, entryTo, saleFrom, saleTo, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    let list = rows.filter((row) => {
      const searchable = `${row.code} ${row.brand} ${row.model} ${row.model_year ?? ""}`.toLowerCase();
      if (term && !searchable.includes(term)) return false;

      const isStale =
        ACTIVE_STATUSES.includes(row.status) && daysInStock(row) >= 30;

      return !onlyStale30 || isStale;
    });

    if (onlyStale30) {
      list = [...list].sort((a, b) => daysInStock(b) - daysInStock(a));
    }

    return list;
  }, [onlyStale30, q, rows]);

  const stats = useMemo(() => {
    const invested = filtered.reduce(
      (total, row) => total + Number(row.total_invested ?? 0),
      0
    );
    const profit = filtered.reduce(
      (total, row) => total + Number(row.profit ?? 0),
      0
    );
    const stale30 = filtered.filter(
      (row) => ACTIVE_STATUSES.includes(row.status) && daysInStock(row) >= 30
    ).length;

    return { invested, profit, stale30 };
  }, [filtered]);

  async function quickStatus(vehicleId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ status: newStatus })
        .eq("id", vehicleId);

      if (error) throw error;
      await load();
    } catch (error) {
      window.alert(`Erro ao mudar status: ${errorMessage(error)}`);
    }
  }

  function clearFilters() {
    setStatus("all");
    setQ("");
    setOnlyStale30(false);
    setEntryFrom("");
    setEntryTo("");
    setSaleFrom("");
    setSaleTo("");
  }

  return (
    <AuthGate>
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.topbar}>
            <div className={styles.brandBlock}>
              <Image
                src="/logo.png"
                alt="GV Moto Center"
                width={178}
                height={70}
                className={styles.logo}
                priority
              />
              <div>
                <span className={styles.eyebrow}>Gestor de estoque</span>
                <h1>Revenda</h1>
              </div>
            </div>

            <div className={styles.topActions}>
              <Link href="/vehicles/new" className={styles.primaryButton}>
                + Novo veículo
              </Link>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className={styles.secondaryButton}
              >
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
                className={styles.ghostButton}
              >
                Sair
              </button>
            </div>
          </header>

          <section className={styles.filters} aria-label="Filtros do estoque">
            <div className={styles.filterField}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.filterField} ${styles.searchField}`}>
              <label htmlFor="search">Buscar</label>
              <input
                id="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Código, marca, modelo ou ano"
              />
            </div>

            <div className={styles.filterField}>
              <label>Entrada</label>
              <div className={styles.datePair}>
                <input
                  aria-label="Entrada de"
                  type="date"
                  value={entryFrom}
                  onChange={(event) => setEntryFrom(event.target.value)}
                />
                <input
                  aria-label="Entrada até"
                  type="date"
                  value={entryTo}
                  onChange={(event) => setEntryTo(event.target.value)}
                />
              </div>
            </div>

            <div className={styles.filterField}>
              <label>Venda</label>
              <div className={styles.datePair}>
                <input
                  aria-label="Venda de"
                  type="date"
                  value={saleFrom}
                  onChange={(event) => setSaleFrom(event.target.value)}
                />
                <input
                  aria-label="Venda até"
                  type="date"
                  value={saleTo}
                  onChange={(event) => setSaleTo(event.target.value)}
                />
              </div>
            </div>

            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={onlyStale30}
                onChange={(event) => setOnlyStale30(event.target.checked)}
              />
              <span>Somente paradas há mais de 30 dias</span>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className={styles.clearButton}
            >
              Limpar filtros
            </button>
          </section>

          {err && <div className={styles.errorBox}>Erro ao carregar: {err}</div>}

          <section className={styles.stats} aria-label="Resumo do estoque">
            <Stat label="Veículos filtrados" value={String(filtered.length)} />
            <Stat label="Paradas +30 dias" value={String(stats.stale30)} />
            <Stat label="Total investido" value={brl(stats.invested)} />
            <Stat label="Lucro dos vendidos" value={brl(stats.profit)} />
          </section>

          <section className={styles.stockSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>Visão geral</span>
                <h2>Motos no estoque</h2>
              </div>
              <span className={styles.resultCount}>
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>

            {loading && rows.length === 0 ? (
              <div className={styles.stateBox}>Carregando estoque...</div>
            ) : filtered.length === 0 ? (
              <div className={styles.stateBox}>Nenhum veículo encontrado.</div>
            ) : (
              <>
                <DesktopTable
                  rows={filtered}
                  photos={photoByVehicle}
                  onStatus={quickStatus}
                />
                <MobileCards
                  rows={filtered}
                  photos={photoByVehicle}
                  onStatus={quickStatus}
                />
              </>
            )}
          </section>
        </section>
      </main>
    </AuthGate>
  );
}
