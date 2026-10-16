"use client";

import { ArrowLeft, BadgeDollarSign, CheckCircle2, MessageCircle, ShieldCheck, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { LeadInterestType } from "@/lib/catalog-leads";

type Vehicle = { id: string; brand: string; model: string };
type LeadResponse = { ok: boolean; error?: string; whatsappUrl?: string };

function adultDateLimit(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export function CatalogInterest({ vehicle }: { vehicle: Vehicle }) {
  const [open, setOpen] = useState(false);
  const [interest, setInterest] = useState<LeadInterestType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function start() {
    setInterest(null);
    setError("");
    setOpen(true);
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setInterest(null);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!interest) return;
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const booleanValue = (name: string) => {
      const value = form.get(name);
      return value === "sim" ? true : value === "nao" ? false : null;
    };

    const payload = {
      vehicleId: vehicle.id,
      interestType: interest,
      fullName: form.get("fullName"),
      age: form.get("age"),
      phone: form.get("phone"),
      city: form.get("city"),
      birthDate: interest === "financiamento" ? form.get("birthDate") : null,
      cpf: interest === "financiamento" ? form.get("cpf") : null,
      hasProvenIncome: interest === "financiamento" ? booleanValue("hasProvenIncome") : null,
      hasCnhA: interest === "financiamento" ? booleanValue("hasCnhA") : null,
      privacyAcknowledged: form.get("privacyAcknowledged") === "on",
      marketingConsent: form.get("marketingConsent") === "on",
      website: form.get("website"),
    };

    try {
      const response = await fetch("/api/catalog/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as LeadResponse;
      if (!response.ok || !result.ok || !result.whatsappUrl) throw new Error(result.error ?? "Não foi possível registrar seu interesse.");
      window.location.assign(result.whatsappUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível registrar seu interesse.");
      setBusy(false);
    }
  }

  return <>
    <button className="catalog-whatsapp-button" type="button" onClick={start}><MessageCircle size={22}/>Tenho interesse!</button>
    <small>Escolha entre atendimento e simulação de financiamento.</small>

    {open && <div className="lead-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <section className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
        <header className="lead-modal-header">
          <div><span className="catalog-kicker">Atendimento GV</span><h2 id="lead-modal-title">Tenho interesse na {vehicle.brand} {vehicle.model}</h2></div>
          <button className="lead-modal-close" type="button" onClick={close} aria-label="Fechar"><X size={20}/></button>
        </header>

        {!interest ? <div className="lead-choice-grid">
          <button type="button" className="lead-choice" onClick={() => setInterest("atendimento")}>
            <span><UserRound size={24}/></span><strong>Falar com um atendente</strong><small>Deixe seus dados e continue o atendimento pelo WhatsApp.</small>
          </button>
          <button type="button" className="lead-choice lead-choice-featured" onClick={() => setInterest("financiamento")}>
            <span><BadgeDollarSign size={24}/></span><strong>Simular financiamento</strong><small>Informe os dados necessários para iniciarmos uma simulação.</small>
          </button>
        </div> : <form className="lead-form" onSubmit={submit}>
          <button className="lead-back" type="button" onClick={() => { setInterest(null); setError(""); }} disabled={busy}><ArrowLeft size={16}/>Trocar opção</button>
          <div className="lead-selected"><CheckCircle2 size={18}/><span>{interest === "financiamento" ? "Simulação de financiamento" : "Atendimento pelo WhatsApp"}</span></div>

          <div className="lead-form-grid">
            <div className="field lead-field-wide"><label htmlFor="lead-name">Nome completo</label><input className="input" id="lead-name" name="fullName" minLength={3} maxLength={160} autoComplete="name" required/></div>
            <div className="field"><label htmlFor="lead-age">Idade</label><input className="input" id="lead-age" name="age" type="number" min="18" max="100" inputMode="numeric" required/></div>
            <div className="field"><label htmlFor="lead-phone">Telefone com DDD</label><input className="input" id="lead-phone" name="phone" type="tel" minLength={10} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="(51) 99999-9999" required/></div>
            <div className="field lead-field-wide"><label htmlFor="lead-city">Cidade</label><input className="input" id="lead-city" name="city" minLength={2} maxLength={120} autoComplete="address-level2" required/></div>
          </div>

          {interest === "financiamento" && <fieldset className="lead-financing-fields">
            <legend>Dados para a simulação</legend>
            <div className="lead-form-grid">
              <div className="field"><label htmlFor="lead-birth-date">Data de nascimento</label><input className="input" id="lead-birth-date" name="birthDate" type="date" min={adultDateLimit(100)} max={adultDateLimit(18)} required/></div>
              <div className="field"><label htmlFor="lead-cpf">CPF</label><input className="input" id="lead-cpf" name="cpf" inputMode="numeric" autoComplete="off" minLength={11} maxLength={14} placeholder="000.000.000-00" required/></div>
              <Choice name="hasProvenIncome" legend="Possui renda comprovada?" />
              <Choice name="hasCnhA" legend="Possui CNH categoria A?" />
            </div>
          </fieldset>}

          <input className="lead-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
          <div className="lead-consents">
            <label><input type="checkbox" name="privacyAcknowledged" required/><span>Autorizo o uso destes dados para atender esta solicitação e entendo que eles serão armazenados pela GV Moto Center.</span></label>
            <label><input type="checkbox" name="marketingConsent"/><span>Quero receber novidades, oportunidades e ofertas da GV Moto Center pelo WhatsApp.</span></label>
          </div>
          <p className="lead-privacy-note"><ShieldCheck size={16}/>Você pode solicitar correção ou exclusão dos seus dados pelo WhatsApp da GV Moto Center.</p>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="catalog-whatsapp-button" type="submit" disabled={busy}><MessageCircle size={21}/>{busy ? "Salvando..." : "Salvar e abrir WhatsApp"}</button>
        </form>}
      </section>
    </div>}
  </>;
}

function Choice({ name, legend }: { name: string; legend: string }) {
  return <fieldset className="lead-radio-group"><legend>{legend}</legend><label><input type="radio" name={name} value="sim" required/>Sim</label><label><input type="radio" name={name} value="nao" required/>Não</label></fieldset>;
}