import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bike, CalendarDays, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getCatalogVehicle, marketplaceBenefits } from "@/lib/catalog";
import { formatCurrency } from "@/lib/format";
import { CatalogGallery } from "@/components/catalog-gallery";
import { CatalogInterest } from "@/components/catalog-interest";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const vehicle = await getCatalogVehicle(id);
    if (!vehicle) return { title: "Moto indisponível" };
    return {
      title: `${vehicle.brand} ${vehicle.model}`,
      description: vehicle.catalog_description || `${vehicle.brand} ${vehicle.model}, modelo ${vehicle.modelYear}, disponível na GV Moto Center.`,
    };
  } catch {
    return { title: "Catálogo de motocicletas" };
  }
}

export default async function CatalogVehiclePage({ params }: Props) {
  const { id } = await params;
  const vehicle = await getCatalogVehicle(id);
  if (!vehicle) notFound();
  const benefits = marketplaceBenefits(vehicle);

  return <main className="catalog-main catalog-shell catalog-detail-page">
    <Link className="catalog-back-link" href="/catalogo"><ArrowLeft size={18} />Voltar ao catálogo</Link>

    <section className="catalog-detail-grid">
      <CatalogGallery photos={vehicle.photos} vehicleName={`${vehicle.brand} ${vehicle.model}`} />

      <aside className="catalog-detail-panel">
        <span className="catalog-kicker"><CheckCircle2 size={15} />Disponível para venda</span>
        <h1>{vehicle.brand} {vehicle.model}</h1>
        <div className="catalog-detail-fact"><CalendarDays size={19} /><span>Ano do modelo</span><strong>{vehicle.modelYear}</strong></div>
        <div className="catalog-detail-price"><span>Valor de venda</span><strong>{formatCurrency(vehicle.askingPrice)}</strong></div>
        {vehicle.catalog_description && <p className="catalog-vehicle-description">{vehicle.catalog_description}</p>}
        {benefits.length > 0 && <ul className="catalog-benefit-list">{benefits.map(benefit => <li key={benefit}><CheckCircle2 size={17}/><span>{benefit}</span></li>)}</ul>}
        <p>Gostou desta motocicleta? Fale com nossa equipe para consultar condições e disponibilidade.</p>
        <CatalogInterest vehicle={{ id: vehicle.id, brand: vehicle.brand, model: vehicle.model }}/>
      </aside>
    </section>

    <section className="catalog-assurance">
      <Bike size={25} />
      <div><strong>Atendimento direto com a GV Moto Center</strong><p>Confirme os detalhes da motocicleta e tire suas dúvidas pelo WhatsApp.</p></div>
    </section>
  </main>;
}