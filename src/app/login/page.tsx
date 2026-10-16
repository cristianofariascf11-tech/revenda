import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ config?: string; next?: string }> }) {
  const params = await searchParams;
  return <main className="login-page">
    <section className="login-visual">
      <Image className="login-logo" src="/logo-gv.png" alt="GV Moto Center" width={1613} height={772} priority />
      <div className="login-display">
        <span className="eyebrow">Controle • Agilidade • Resultado</span>
        <h1>Seu estoque<br/><span className="orange">sob controle.</span></h1>
        <p className="muted">Da entrada à venda, acompanhe cada motocicleta, custo e resultado em um só lugar.</p>
      </div>
      <small className="muted">Sistema interno GV Moto Center</small>
    </section>
    <section className="login-panel">
      <div className="login-card card">
        <div className="card-pad stack">
          <Image className="login-logo" src="/logo-gv.png" alt="GV Moto Center" width={1613} height={772} priority />
          <div><span className="eyebrow">Bem-vindo</span><h1 className="page-title" style={{fontSize: 31}}>Gestor de Estoque — Revenda</h1></div>
          {params.config === "missing" && <div className="alert alert-info">O sistema está instalado. Configure o Supabase no arquivo <strong>.env.local</strong> para liberar o acesso.</div>}
          <LoginForm nextPath={params.next} configured={params.config !== "missing"} />
          <small className="muted">O acesso é restrito. Contas são criadas pelo administrador.</small>
        </div>
      </div>
    </section>
  </main>;
}