"use client";

import { Check, Copy, ExternalLink, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CATALOG_BASE_URL, catalogShareWhatsAppUrl } from "@/lib/catalog-whatsapp";

export function CatalogShare() {
  const [copied, setCopied] = useState(false);

  async function copyCatalogLink() {
    try {
      await navigator.clipboard.writeText(CATALOG_BASE_URL);
    } catch {
      const field = document.createElement("textarea");
      field.value = CATALOG_BASE_URL;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return <section className="catalog-share-card" aria-labelledby="catalog-share-title">
    <div className="catalog-share-icon"><Store size={28}/></div>
    <div className="catalog-share-copy">
      <span className="eyebrow">Catálogo dos clientes</span>
      <h2 id="catalog-share-title">Compartilhe seu estoque em segundos</h2>
      <p>Envie este catálogo para o cliente escolher entre as motos disponíveis.</p>
      <a className="catalog-share-url" href={CATALOG_BASE_URL} target="_blank" rel="noreferrer">{CATALOG_BASE_URL}</a>
    </div>
    <div className="catalog-share-actions">
      <Link className="btn" href={CATALOG_BASE_URL} target="_blank" rel="noreferrer"><ExternalLink size={18}/>Abrir catálogo</Link>
      <button className="btn" type="button" onClick={copyCatalogLink} aria-live="polite">
        {copied ? <Check size={18}/> : <Copy size={18}/>}{copied ? "Link copiado!" : "Copiar link"}
      </button>
      <a className="btn catalog-share-whatsapp" href={catalogShareWhatsAppUrl()} target="_blank" rel="noreferrer"><MessageCircle size={19}/>Enviar por WhatsApp</a>
    </div>
  </section>;
}