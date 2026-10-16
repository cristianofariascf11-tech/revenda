import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera, ChevronLeft, FileDown, RefreshCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { signedPhotoMap } from "@/lib/photo-urls";

export const metadata: Metadata = { title: "Histórico de avaliações" };

function EvaluationPhoto({ url, alt }: { url?: string; alt: string }) {
  if (!url) return <div className="evaluation-history-photo evaluation-history-photo-empty"><Camera size={22} /><span>Sem foto</span></div>;
  return <a className="evaluation-history-photo" href={url} target="_blank" rel="noreferrer" aria-label={`Abrir ${alt}`}>
    <Image src={url} alt={alt} fill sizes="96px" />
  </a>;
}

function identifier(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "Não informado";
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_evaluations").select("*").order("created_at", { ascending: false });
  const photoUrls = await signedPhotoMap(supabase, (data ?? []).map((row) => row.photo_path as string | null));

  return <main className="shell page stack">
    <div><Link className="btn btn-ghost btn-sm" href="/evaluation"><ChevronLeft size={17} />Nova avaliação</Link></div>
    <div><span className="eyebrow">Consultas salvas</span><h1 className="page-title">Histórico de avaliações</h1></div>
    {error && <div className="alert alert-error">{error.message}</div>}
    <section className="card">
      {data?.length ? <>
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth: 1220 }}>
            <thead><tr><th>Foto</th><th>Data</th><th>Placa</th><th>Veículo</th><th>Chassi / Motor</th><th>FIPE</th><th>Desconto</th><th>Custos</th><th>Oferta</th><th>Fonte</th><th></th></tr></thead>
            <tbody>{data.map((row) => {
              const photoUrl = row.photo_path ? photoUrls.get(row.photo_path) : undefined;
              return <tr key={row.id}>
                <td><EvaluationPhoto url={photoUrl} alt={`${row.brand} ${row.model}`} /></td>
                <td>{new Date(row.created_at).toLocaleString("pt-BR")}</td>
                <td><span className="code">{row.plate}</span></td>
                <td><strong>{row.brand} {row.model}</strong><br /><small className="muted">{row.model_year}</small></td>
                <td><small className="muted">Chassi</small><br /><span className="code">{identifier(row.chassis)}</span><br /><small className="muted">Motor</small><br /><span className="code">{identifier(row.engine_number)}</span></td>
                <td>{formatCurrency(row.fipe_value)}</td>
                <td>{row.discount_percent}%</td>
                <td>{formatCurrency(row.additional_costs_total)}</td>
                <td className="orange"><strong>{formatCurrency(row.suggested_offer)}</strong></td>
                <td>{row.source}</td>
                <td><div className="cluster"><Link className="btn btn-sm" href={`/evaluation?repeat=${row.id}`}><RefreshCcw size={15} />Repetir</Link><a className="btn btn-sm" href={`/api/evaluation/${row.id}/pdf`}><FileDown size={15} />PDF</a></div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>

        <div className="mobile-cards evaluation-history-cards">
          {data.map((row) => {
            const photoUrl = row.photo_path ? photoUrls.get(row.photo_path) : undefined;
            return <article className="evaluation-history-card" key={row.id}>
              <div className="evaluation-history-card-head">
                <EvaluationPhoto url={photoUrl} alt={`${row.brand} ${row.model}`} />
                <div><span className="code">{row.plate}</span><h2>{row.brand} {row.model}</h2><small className="muted">{row.model_year} • {new Date(row.created_at).toLocaleDateString("pt-BR")}</small></div>
              </div>
              <div className="evaluation-history-values">
                <div><small>FIPE</small><strong>{formatCurrency(row.fipe_value)}</strong></div>
                <div><small>Oferta</small><strong className="orange">{formatCurrency(row.suggested_offer)}</strong></div>
                <div><small>Desconto</small><strong>{row.discount_percent}%</strong></div>
                <div><small>Custos</small><strong>{formatCurrency(row.additional_costs_total)}</strong></div>
              </div>
              <p className="muted"><strong>Chassi:</strong> <span className="code">{identifier(row.chassis)}</span><br /><strong>Motor:</strong> <span className="code">{identifier(row.engine_number)}</span></p>
              <div className="cluster"><Link className="btn btn-sm" href={`/evaluation?repeat=${row.id}`}><RefreshCcw size={15} />Repetir</Link><a className="btn btn-sm" href={`/api/evaluation/${row.id}/pdf`}><FileDown size={15} />Baixar PDF</a></div>
            </article>;
          })}
        </div>
      </> : <div className="empty"><h2>Nenhuma avaliação salva</h2><p>As consultas concluídas aparecerão aqui.</p></div>}
    </section>
  </main>;
}