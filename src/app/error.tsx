"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell page"><section className="card card-pad empty">
    <h1>Algo não saiu como esperado</h1>
    <p>Não foi possível carregar esta área. Tente novamente.</p>
    <button className="btn btn-primary" onClick={reset}>Tentar novamente</button>
  </section></main>;
}