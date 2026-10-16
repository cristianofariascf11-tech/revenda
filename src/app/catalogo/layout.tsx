import Image from "next/image";
import Link from "next/link";
import { Bike, ExternalLink, Facebook, Instagram, MapPin, Music2, Navigation, Youtube } from "lucide-react";

const STORE_ADDRESS = "Av. Dorival Cândido Luz de Oliveira, 7204 - Gravataí/RS";
const MAP_QUERY = encodeURIComponent(STORE_ADDRESS);
const SOCIAL_LINKS = [
  { label: "TikTok", href: "https://www.tiktok.com/@gvmotocenter", icon: Music2 },
  { label: "Instagram", href: "https://www.instagram.com/gvmotocenter/", icon: Instagram },
  { label: "YouTube", href: "https://www.youtube.com/@gvmotocenter", icon: Youtube },
  { label: "Facebook", href: "https://www.facebook.com/gvmotocenter", icon: Facebook },
] as const;

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <div className="catalog-site">
    <header className="catalog-header">
      <div className="catalog-shell catalog-header-inner">
        <Link className="catalog-brand" href="/catalogo" aria-label="GV Revenda — catálogo de motocicletas">
          <Image src="/logo-gv.png" alt="GV Moto Center" width={1613} height={772} priority />
          <span><strong>GV Revenda</strong><small>Catálogo de motocicletas</small></span>
        </Link>
        <span className="catalog-header-status"><Bike size={17} />Estoque disponível</span>
      </div>
    </header>
    {children}
    <footer className="catalog-footer">
      <div className="catalog-shell catalog-footer-inner">
        <div className="catalog-footer-info">
          <div className="catalog-footer-brand">
            <Image src="/logo-gv.png" alt="GV Moto Center" width={1613} height={772} />
            <div><strong>GV Moto Center</strong><p>Escolha sua próxima motocicleta com quem entende.</p></div>
          </div>
          <div>
            <span className="catalog-footer-label">Acompanhe a GV</span>
            <div className="catalog-social-links">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => <a className="catalog-social-link" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} da GV Moto Center`} key={label}><Icon size={18}/><span>{label}</span></a>)}
            </div>
            <p className="catalog-social-handle">@gvmotocenter em todas as redes</p>
          </div>
        </div>
        <section className="catalog-footer-location" aria-labelledby="catalog-location-title">
          <iframe className="catalog-footer-map-frame" title="Localização da GV Moto Center" src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="catalog-footer-address">
            <span className="catalog-footer-map-icon"><MapPin size={21}/></span>
            <div><span className="catalog-footer-label">Nossa loja</span><h2 id="catalog-location-title">Venha nos visitar</h2><address>{STORE_ADDRESS}</address></div>
            <a className="catalog-map-link" href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`} target="_blank" rel="noopener noreferrer"><Navigation size={17}/>Abrir rota<ExternalLink size={14}/></a>
          </div>
        </section>
      </div>
      <div className="catalog-shell catalog-footer-bottom"><span>© {new Date().getFullYear()} GV Moto Center</span><span>Gravataí • Rio Grande do Sul</span></div>
    </footer>
  </div>;
}