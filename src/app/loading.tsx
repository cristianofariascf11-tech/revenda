export default function Loading() {
  return <main className="shell page stack" aria-label="Carregando">
    <div className="skeleton" style={{ height: 46, width: "38%" }} />
    <div className="metric-grid">{Array.from({ length: 4 }).map((_, i) => <div className="skeleton" style={{ height: 112 }} key={i} />)}</div>
    <div className="skeleton" style={{ height: 360 }} />
  </main>;
}