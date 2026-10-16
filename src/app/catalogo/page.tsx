import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bike, ImageOff, ShieldCheck } from "lucide-react";
import { getCatalogVehicles, type CatalogVehicle } from "@/lib/catalog";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Motos à venda",
  description: "Confira as motocicletas disponíveis para venda na GV Moto Center.",
};

export default async function CatalogPage() {
  let vehicles: CatalogVehicle[];
  let loadError = false;
  try {
    vehicles = await getCatalogVehicles();
  } catch (error) {
    console.error(error);
    vehicles = [];
    loadError = true;
  }

  return <main className="catalog-main catalog-shell">
    <section className="catalog-hero">
      <div className="catalog-hero-copy">
        <span className="catalog-kicker"><ShieldCheck size={15} />Estoque selecionado</span>
        <h1>Encontre a moto que combina com você.</h1>
        <p>Veja as motocicletas disponíveis, confira fotos e valores e fale diretamente com a GV Moto Center.</p>
      </div>
      <div className="catalog-count"><strong>{vehicles.length}</strong><span>moto{vehicles.length === 1 ? "" : "s"}<br />disponíve{vehicles.length === 1 ? "l" : "is"}</span></div>
    </section>

    <section className="catalog-section-head">
      <div><span className="eyebrow">Prontas para venda</span><h2>Nosso estoque</h2></div>
      <p>O catálogo mostra somente as motos disponíveis neste momento.</p>
    </section>

    {loadError && <section className="catalog-empty"><Bike /><h2>Catálogo temporariamente indisponível</h2><p>Tente novamente em alguns instantes.</p></section>}
    {!loadError && !vehicles.length && <section className="catalog-empty"><Bike /><h2>Novidades em breve</h2><p>No momento não há motocicletas prontas para venda.</p></section>}
    {!loadError && vehicles.length > 0 && <section className="catalog-grid" aria-label="Motocicletas disponíveis">
      {vehicles.map(vehicle => <article className="catalog-card" key={vehicle.id}>
        <Link className="catalog-card-photo" href={`/catalogo/${vehicle.id}`} aria-label={`Ver ${vehicle.brand} ${vehicle.model}`}>
          {vehicle.coverUrl
            ? <Image src={vehicle.coverUrl} alt={`${vehicle.brand} ${vehicle.model}`} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
            : <span className="catalog-photo-empty"><ImageOff size={34} />Foto em preparação</span>}
          <span className="catalog-available-badge">Disponível</span>
        </Link>
        <div className="catalog-card-body">
          <div><span className="catalog-year">Modelo {vehicle.modelYear}</span><h2>{vehicle.brand} {vehicle.model}</h2></div>
          <p>{vehicle.catalog_description || "Motocicleta disponível para venda na GV Moto Center."}</p>
          <div className="catalog-card-price"><span>Valor de venda</span><strong>{formatCurrency(vehicle.askingPrice)}</strong></div>
          <Link className="catalog-card-link" href={`/catalogo/${vehicle.id}`}>Ver detalhes <ArrowRight size={18} /></Link>
        </div>
      </article>)}
    </section>}
  </main>;
}