import { COST_CATEGORIES, type CostCategory, type FinancialStatementEntry, type VehicleCost, type VehicleFinancial } from "./types";

const safe=(value:number|null|undefined)=>Number.isFinite(Number(value))?Number(value):0;
const round=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;

export type FinancialSummary={
  revenue:number;
  purchases:number;
  preparationCosts:number;
  saleFees:number;
  totalOutflows:number;
  realizedProfit:number;
  averageProfitMargin:number;
  stockInvested:number;
  salesCount:number;
};

export type MonthlyFinancial={month:string;entries:number;outflows:number;profit:number;salesCount:number};

export function summarizeFinancials(vehicles:VehicleFinancial[]):FinancialSummary{
  const sold=vehicles.filter(vehicle=>vehicle.sale_id&&vehicle.sale_price!=null);
  const revenue=sold.reduce((sum,vehicle)=>sum+safe(vehicle.financial_revenue),0);
  const purchases=sold.filter(vehicle=>vehicle.ownership_type==="propria").reduce((sum,vehicle)=>sum+safe(vehicle.purchase_price),0);
  const preparationCosts=sold.reduce((sum,vehicle)=>sum+safe(vehicle.total_costs),0);
  const saleFees=sold.reduce((sum,vehicle)=>sum+safe(vehicle.sale_fees),0);
  const totalOutflows=purchases+preparationCosts+saleFees;
  const realizedProfit=sold.reduce((sum,vehicle)=>sum+safe(vehicle.profit),0);
  const margins=sold.filter(vehicle=>safe(vehicle.financial_revenue)>0).map(vehicle=>safe(vehicle.profit)/safe(vehicle.financial_revenue)*100);
  const averageProfitMargin=margins.length?margins.reduce((sum,value)=>sum+value,0)/margins.length:0;
  const stockInvested=vehicles.filter(vehicle=>!["vendida","arquivada"].includes(vehicle.status)).reduce((sum,vehicle)=>sum+safe(vehicle.total_invested),0);
  return{revenue:round(revenue),purchases:round(purchases),preparationCosts:round(preparationCosts),saleFees:round(saleFees),totalOutflows:round(totalOutflows),realizedProfit:round(realizedProfit),averageProfitMargin:round(averageProfitMargin),stockInvested:round(stockInvested),salesCount:sold.length};
}

export function groupCostsByCategory(costs:VehicleCost[]){
  return COST_CATEGORIES.map(category=>({category,total:round(costs.filter(cost=>cost.category===category).reduce((sum,cost)=>sum+safe(cost.amount),0))})).filter(item=>item.total>0) as {category:CostCategory;total:number}[];
}

export function normalizeMonthlyFinancials(rows:{month:string;sales_count:number;gross_sales:number;total_profit:number}[]):MonthlyFinancial[]{
  return rows.map(row=>{const entries=safe(row.gross_sales);const profit=safe(row.total_profit);return{month:row.month,entries:round(entries),outflows:round(entries-profit),profit:round(profit),salesCount:safe(row.sales_count)};}).sort((a,b)=>a.month.localeCompare(b.month));
}

export function summarizeStatement(entries: FinancialStatementEntry[], openingBalance = 0) {
  const totalEntries = entries.filter(entry => entry.direction === "entrada").reduce((sum, entry) => sum + safe(entry.amount), 0);
  const totalOutflows = entries.filter(entry => entry.direction === "saida").reduce((sum, entry) => sum + safe(entry.amount), 0);
  return {
    openingBalance: round(openingBalance),
    totalEntries: round(totalEntries),
    totalOutflows: round(totalOutflows),
    periodResult: round(totalEntries - totalOutflows),
    closingBalance: round(openingBalance + totalEntries - totalOutflows),
  };
}