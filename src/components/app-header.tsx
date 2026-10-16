"use client";

import { Calculator, HandCoins, LogOut, Plus, RefreshCw, Store, UsersRound, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATALOG_BASE_URL } from "@/lib/catalog-whatsapp";

export function AppHeader() {
  const router = useRouter();
  async function signOut() {
    try { await createClient().auth.signOut(); } finally { router.replace("/login"); router.refresh(); }
  }
  return <header className="app-header">
    <div className="shell header-inner">
      <Link className="brand" href="/vehicles" aria-label="GV Revenda — estoque">
        <Image src="/logo-gv.png" alt="GV Moto Center" width={1613} height={772} priority />
        <span className="brand-title">Revenda</span>
      </Link>
      <nav className="header-actions" aria-label="Navegação principal">
        <Link className="btn btn-primary" href="/vehicles/new"><Plus size={18}/><span>Novo veículo</span></Link>
        <Link className="btn" href="/evaluation"><Calculator size={18}/><span>Avaliação</span></Link>
        <Link className="btn" href="/financial"><WalletCards size={18}/><span>Financeiro</span></Link>
        <Link className="btn" href="/financing"><HandCoins size={18}/><span>Financiamentos</span></Link>
        <Link className="btn" href="/leads"><UsersRound size={18}/><span>Leads</span></Link>
        <Link className="btn catalog-nav-button" href={CATALOG_BASE_URL} target="_blank" rel="noreferrer" title="Catálogo público"><Store size={18}/><span>Catálogo</span></Link>
        <button className="btn desktop-only" onClick={() => router.refresh()} title="Atualizar"><RefreshCw size={18}/><span>Atualizar</span></button>
        <button className="btn btn-ghost" onClick={signOut} title="Sair"><LogOut size={18}/><span>Sair</span></button>
      </nav>
    </div>
  </header>;
}