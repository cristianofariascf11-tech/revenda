import Link from "next/link";

export default function NotFound() {
  return <main className="shell page"><section className="card card-pad empty">
    <h1>Página não encontrada</h1><p>O conteúdo procurado não existe ou foi removido.</p>
    <Link className="btn btn-primary" href="/vehicles">Voltar ao estoque</Link>
  </section></main>;
}