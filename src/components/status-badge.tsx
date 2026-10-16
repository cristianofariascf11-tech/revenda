import { STATUS_LABEL, type VehicleStatus } from "@/lib/types";

const classes: Record<VehicleStatus, string> = {
  em_preparacao: "badge-prep", a_venda: "badge-sale", reservada: "badge-reserved",
  vendida: "badge-sold", arquivada: "badge-archived",
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return <span className={`badge ${classes[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function AgeBadge({ days }: { days: number }) {
  if (days < 30) return <span>{days} dias</span>;
  const threshold = days >= 60 ? 60 : days >= 45 ? 45 : 30;
  return <span className={`badge badge-age ${threshold >= 60 ? "warn" : ""}`}>{threshold}+ dias</span>;
}