"use client";

import { HandCoins, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { formatCurrency, todayISO } from "@/lib/format";
import { createFinancedSaleAction } from "./actions";
import type { PaymentFrequency } from "@/lib/types";

export type FinancingVehicleOption = {
  id: string;
  code: string;
  brand: string;
  model: string;
  model_year: number;
  plate: string | null;
  asking_price: number | null;
};

function nextMonthDate() {
  const date = new Date(`${todayISO()}T12:00:00`);
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDay));
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function nextWeekDate() {
  const date = new Date(`${todayISO()}T12:00:00`);
  date.setDate(date.getDate() + 7);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function FinancingForm({ vehicles }: { vehicles: FinancingVehicleOption[] }) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [saleDate, setSaleDate] = useState(todayISO());
  const [downPayment, setDownPayment] = useState("5000");
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>("mensal");
  const [installmentCount, setInstallmentCount] = useState("30");
  const [installmentAmount, setInstallmentAmount] = useState("500");
  const [firstDueDate, setFirstDueDate] = useState(nextMonthDate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(
    () => Number(downPayment || 0) + Number(installmentCount || 0) * Number(installmentAmount || 0),
    [downPayment, installmentAmount, installmentCount],
  );
  const selectedVehicle = vehicles.find(vehicle => vehicle.id === vehicleId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!confirm(`Confirmar a venda financiada no total de ${formatCurrency(total)}?`)) return;
    setBusy(true);
    const result = await createFinancedSaleAction({
      vehicle_id: vehicleId,
      customer_name: customerName,
      customer_cpf: customerCpf,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      sale_date: saleDate,
      down_payment: downPayment,
      payment_frequency: paymentFrequency,
      installment_count: installmentCount,
      installment_amount: installmentAmount,
      first_due_date: firstDueDate,
      notes,
    });
    setBusy(false);
    if (!result.ok || !result.id) return setError(result.error ?? "Não foi possível salvar o financiamento.");
    router.replace(`/financing/${result.id}?created=1`);
  }

  return <form className="stack" onSubmit={submit} noValidate>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <div className="form-grid">
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label htmlFor="vehicle_id">Motocicleta</label>
        <select className="select" id="vehicle_id" value={vehicleId} onChange={event => setVehicleId(event.target.value)} required>
          {vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.code} — {vehicle.brand} {vehicle.model} {vehicle.model_year}{vehicle.plate ? ` • ${vehicle.plate}` : ""}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="customer_name">Nome completo do cliente</label><input className="input" id="customer_name" value={customerName} onChange={event => setCustomerName(event.target.value)} autoComplete="name" required /></div>
      <div className="field"><label htmlFor="customer_cpf">CPF</label><input className="input" id="customer_cpf" value={customerCpf} onChange={event => setCustomerCpf(event.target.value)} inputMode="numeric" placeholder="000.000.000-00" required /></div>
      <div className="field"><label htmlFor="customer_phone">Telefone com DDD</label><input className="input" id="customer_phone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} inputMode="tel" placeholder="(11) 99999-9999" required /></div>
      <div className="field"><label htmlFor="sale_date">Data da venda</label><input className="input" id="sale_date" type="date" value={saleDate} onChange={event => setSaleDate(event.target.value)} required /></div>
      <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="customer_address">Endereço completo</label><input className="input" id="customer_address" value={customerAddress} onChange={event => setCustomerAddress(event.target.value)} autoComplete="street-address" required /></div>
    </div>

    <div><span className="eyebrow">Condições</span><h2 className="section-title">Plano de pagamento</h2></div>
    <div className="form-grid-3">
      <div className="field"><label htmlFor="down_payment">Entrada</label><input className="input" id="down_payment" type="number" min="0" step="0.01" value={downPayment} onChange={event => setDownPayment(event.target.value)} required /></div>
      <div className="field"><label htmlFor="payment_frequency">Periodicidade</label><select className="select" id="payment_frequency" value={paymentFrequency} onChange={event => { const frequency = event.target.value as PaymentFrequency; setPaymentFrequency(frequency); setFirstDueDate(frequency === "semanal" ? nextWeekDate() : nextMonthDate()); }}><option value="mensal">Mensal</option><option value="semanal">Semanal</option></select></div>
      <div className="field"><label htmlFor="installment_count">Quantidade de parcelas</label><input className="input" id="installment_count" type="number" min="1" max={paymentFrequency === "semanal" ? 312 : 72} value={installmentCount} onChange={event => setInstallmentCount(event.target.value)} required /><small className="muted">Vencimentos a cada {paymentFrequency === "semanal" ? "7 dias" : "mês"}.</small></div>
      <div className="field"><label htmlFor="installment_amount">Valor de cada parcela</label><input className="input" id="installment_amount" type="number" min="0.01" step="0.01" value={installmentAmount} onChange={event => setInstallmentAmount(event.target.value)} required /></div>
      <div className="field"><label htmlFor="first_due_date">Primeiro vencimento</label><input className="input" id="first_due_date" type="date" min={saleDate} value={firstDueDate} onChange={event => setFirstDueDate(event.target.value)} required /></div>
      <div className="field" style={{ gridColumn: "span 2" }}><label htmlFor="notes">Observações (opcional)</label><input className="input" id="notes" value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} /></div>
    </div>

    <div className="financing-total-preview">
      <span className="metric-icon"><HandCoins /></span>
      <div><small>Total da venda</small><strong>{formatCurrency(total)}</strong><p>{formatCurrency(Number(downPayment || 0))} de entrada + {Number(installmentCount || 0)} parcelas {paymentFrequency === "semanal" ? "semanais" : "mensais"} de {formatCurrency(Number(installmentAmount || 0))}</p></div>
      {selectedVehicle?.asking_price != null && <small className="muted">Anunciada por {formatCurrency(Number(selectedVehicle.asking_price))}</small>}
    </div>
    <div className="cluster"><button className="btn btn-primary" type="submit" disabled={busy || !vehicleId}><Save size={18}/>{busy ? "Gerando parcelas..." : "Registrar financiamento"}</button></div>
  </form>;
}