import { todayISO } from "./format";

export type InstallmentAlertStatus = "paid" | "overdue" | "today" | "upcoming" | "future";

export type InstallmentAlert = {
  status: InstallmentAlertStatus;
  label: string;
  days: number;
  priority: number;
};

const DAY_IN_MS = 86_400_000;

function dateOnlyToUtc(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getInstallmentAlert(dueDate: string, paidAt: string | null, referenceDate = todayISO()): InstallmentAlert {
  if (paidAt) return { status: "paid", label: "Paga", days: 0, priority: 0 };

  const days = Math.round((dateOnlyToUtc(dueDate) - dateOnlyToUtc(referenceDate)) / DAY_IN_MS);
  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      status: "overdue",
      label: `${overdueDays} dia${overdueDays === 1 ? "" : "s"} em atraso`,
      days,
      priority: 4,
    };
  }
  if (days === 0) return { status: "today", label: "Vence hoje", days, priority: 3 };
  if (days <= 5) return { status: "upcoming", label: `Vence em ${days} dia${days === 1 ? "" : "s"}`, days, priority: 2 };
  return { status: "future", label: `Vence em ${days} dias`, days, priority: 1 };
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}