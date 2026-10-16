import { describe,expect,it } from "vitest";
import type { FinancialStatementEntry, VehicleCost, VehicleFinancial } from "./types";
import { groupCostsByCategory, normalizeMonthlyFinancials, summarizeFinancials, summarizeStatement } from "./financial-dashboard";

const vehicle=(overrides:Partial<VehicleFinancial>):VehicleFinancial=>({id:"1",code:"GV-000001",brand:"Honda",model:"CG",model_year:2025,plate:null,chassis:null,engine_number:null,status:"vendida",ownership_type:"propria",entry_date:"2026-01-01",purchase_price:10000,asking_price:15000,total_costs:1000,total_invested:11000,sale_id:"s1",sale_date:"2026-02-01",sale_price:15000,sale_fees:500,commission_amount:null,financial_revenue:15000,profit:3500,days_in_stock:31,cover_path:null,deleted_at:null,...overrides});

describe("painel financeiro",()=>{
  it("separa entradas, saídas e calcula a margem média",()=>{const summary=summarizeFinancials([vehicle({}),vehicle({id:"2",purchase_price:8000,total_costs:500,total_invested:8500,sale_price:10000,financial_revenue:10000,sale_fees:0,profit:1500})]);expect(summary).toMatchObject({revenue:25000,purchases:18000,preparationCosts:1500,saleFees:500,totalOutflows:20000,realizedProfit:5000,salesCount:2});expect(summary.averageProfitMargin).toBe(19.17);});
  it("considera somente a comissão como entrada da moto consignada",()=>{const summary=summarizeFinancials([vehicle({ownership_type:"consignada",purchase_price:null,total_costs:100,total_invested:100,sale_price:15000,commission_amount:1500,financial_revenue:1500,sale_fees:100,profit:1300})]);expect(summary).toMatchObject({revenue:1500,purchases:0,preparationCosts:100,saleFees:100,totalOutflows:200,realizedProfit:1300});expect(summary.averageProfitMargin).toBe(86.67);});
  it("separa capital ainda investido no estoque",()=>expect(summarizeFinancials([vehicle({status:"a_venda",sale_id:null,sale_price:null,profit:null,total_invested:12000})]).stockInvested).toBe(12000));
  it("agrupa custos por categoria",()=>{const costs=[{category:"oficina",amount:500},{category:"oficina",amount:250},{category:"pecas",amount:1000}] as VehicleCost[];expect(groupCostsByCategory(costs)).toEqual([{category:"pecas",total:1000},{category:"oficina",total:750}]);});
  it("transforma o resumo mensal em entradas e saídas",()=>expect(normalizeMonthlyFinancials([{month:"2026-02-01",sales_count:2,gross_sales:25000,total_profit:5000}])[0]).toEqual({month:"2026-02-01",entries:25000,outflows:20000,profit:5000,salesCount:2}));
  it("resume o extrato e preserva o saldo anterior",()=>{
    const base={event_date:"2026-02-01",event_at:"2026-02-01T12:00:00Z",category:"teste",description:"Teste",vehicle_id:"v1",vehicle_code:"GV-1",vehicle_label:"Honda CG",plate:null,balance:0};
    const entries=[{...base,id:"1",direction:"entrada",amount:5000},{...base,id:"2",direction:"saida",amount:1200}] as FinancialStatementEntry[];
    expect(summarizeStatement(entries,1000)).toEqual({openingBalance:1000,totalEntries:5000,totalOutflows:1200,periodResult:3800,closingBalance:4800});
  });
});