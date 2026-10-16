import type { EvaluationCosts } from "./types";

const safe = (value: number | null | undefined) => Number.isFinite(value) ? Number(value) : 0;
const rounded = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateFinancials(purchasePrice: number, costs: number, salePrice?: number | null, saleFees?: number | null) {
  const totalInvested = rounded(safe(purchasePrice) + safe(costs));
  const profit = salePrice == null ? null : rounded(safe(salePrice) - safe(saleFees) - totalInvested);
  return { totalInvested, profit };
}

export function evaluationCostTotal(costs: EvaluationCosts) {
  return rounded(Object.values(costs).reduce((sum, value) => sum + safe(value), 0));
}

export function calculateSuggestedOffer(fipeValue: number, discountPercent: number, additionalCosts: number) {
  return Math.max(0, rounded(safe(fipeValue) * (1 - safe(discountPercent) / 100) - safe(additionalCosts)));
}

export function daysInStock(entryDate: string, soldDate?: string | null, now = new Date()) {
  const start = new Date(`${entryDate}T00:00:00`);
  const end = soldDate ? new Date(`${soldDate}T00:00:00`) : now;
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}