"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { buildMarketplaceCaption } from "@/lib/marketplace-caption";
import type { VehicleMarketplace } from "@/lib/types";

type Props = VehicleMarketplace & {
  brand: string;
  model: string;
  modelYear: number;
  askingPrice: number | null;
};

export function MarketplaceCaption(props: Props) {
  const [copied, setCopied] = useState(false);
  const caption = useMemo(() => buildMarketplaceCaption(props), [props]);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return <section className="card card-pad stack marketplace-caption-card">
    <div className="spread"><div><span className="eyebrow">Marketplace</span><h2 className="section-title">Legenda pronta para anúncio</h2><p className="muted">Copie e cole no Facebook Marketplace ou em outras plataformas.</p></div><button className="btn btn-primary" type="button" onClick={copyCaption}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? "Legenda copiada" : "Copiar legenda"}</button></div>
    <pre className="marketplace-caption-preview">{caption}</pre>
  </section>;
}