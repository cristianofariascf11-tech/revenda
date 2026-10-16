export const VEHICLE_STATUSES = ["em_preparacao", "a_venda", "reservada", "vendida", "arquivada"] as const;
export type VehicleStatus = typeof VEHICLE_STATUSES[number];

export const VEHICLE_OWNERSHIP_TYPES = ["propria", "consignada"] as const;
export type VehicleOwnershipType = typeof VEHICLE_OWNERSHIP_TYPES[number];
export const OWNERSHIP_LABEL: Record<VehicleOwnershipType, string> = {
  propria: "Moto própria",
  consignada: "Consignada",
};

export const PAYMENT_FREQUENCIES = ["mensal", "semanal"] as const;
export type PaymentFrequency = typeof PAYMENT_FREQUENCIES[number];
export const PAYMENT_FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  mensal: "Mensal",
  semanal: "Semanal",
};

export const STATUS_LABEL: Record<VehicleStatus, string> = {
  em_preparacao: "Em preparação",
  a_venda: "À venda",
  reservada: "Reservada",
  vendida: "Vendida",
  arquivada: "Arquivada",
};

export const COST_CATEGORIES = [
  "pecas", "oficina", "lavagem_polimento", "despachante_cartorio",
  "ipva_licenciamento_multas", "transporte_guincho", "anuncios_marketing", "outros",
] as const;
export type CostCategory = typeof COST_CATEGORIES[number];
export const COST_LABEL: Record<CostCategory, string> = {
  pecas: "Peças",
  oficina: "Oficina",
  lavagem_polimento: "Lavagem/Polimento",
  despachante_cartorio: "Despachante/Cartório",
  ipva_licenciamento_multas: "IPVA/Licenciamento/Multas",
  transporte_guincho: "Transporte/Guincho",
  anuncios_marketing: "Anúncios/Marketing",
  outros: "Outros",
};

export type VehicleFinancial = {
  id: string; code: string; brand: string; model: string; model_year: number; plate: string | null;
  chassis: string | null; engine_number: string | null;
  status: VehicleStatus; ownership_type: VehicleOwnershipType; entry_date: string; purchase_price: number | null; asking_price: number | null;
  total_costs: number; total_invested: number; sale_id: string | null; sale_date: string | null;
  sale_price: number | null; sale_fees: number; commission_amount: number | null; financial_revenue: number | null; profit: number | null; days_in_stock: number;
  cover_path: string | null; deleted_at: string | null;
};

export type VehicleCost = { id: string; vehicle_id: string; cost_date: string; category: CostCategory; amount: number; description: string; };
export type VehiclePhoto = { id: string; vehicle_id: string; path: string; ord: number; signedUrl?: string; };

export type VehicleMarketplace = {
  catalog_description: string;
  marketplace_reviewed: boolean;
  marketplace_warranty: boolean;
  marketplace_trade: boolean;
  marketplace_financing: boolean;
  marketplace_card_24x: boolean;
};

export type EvaluationCosts = { tires: number; documents: number; workshop: number; detailing: number; transport: number; others: number; };

export type StoreFinancingStatus = "ativo" | "atrasado" | "quitado";

export type StoreFinancingSummary = {
  id: string;
  vehicle_id: string;
  customer_name: string;
  customer_cpf: string;
  customer_phone: string;
  sale_date: string;
  down_payment: number;
  installment_count: number;
  installment_amount: number;
  first_due_date: string;
  payment_frequency: PaymentFrequency;
  total_sale_amount: number;
  vehicle_code: string;
  brand: string;
  model: string;
  model_year: number;
  plate: string | null;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  installments_received: number;
  total_received: number;
  outstanding_amount: number;
  overdue_amount: number;
  due_soon_amount: number;
  next_due_date: string | null;
  financing_status: StoreFinancingStatus;
};

export type StoreFinancedSale = {
  id: string;
  vehicle_id: string;
  vehicle_sale_id: string;
  customer_name: string;
  customer_cpf: string;
  customer_phone: string;
  customer_address: string;
  sale_date: string;
  down_payment: number;
  installment_count: number;
  installment_amount: number;
  first_due_date: string;
  payment_frequency: PaymentFrequency;
  total_sale_amount: number;
  notes: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type StoreFinancedInstallment = {
  id: string;
  financed_sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialStatementEntry = {
  id: string;
  event_date: string;
  event_at: string;
  direction: "entrada" | "saida";
  category: string;
  description: string;
  vehicle_id: string;
  vehicle_code: string;
  vehicle_label: string;
  plate: string | null;
  amount: number;
  balance: number;
};