import { describe, expect, it } from "vitest";
import { costSchema, financedSaleSchema, saleSchema, vehicleSchema } from "./schemas";

describe("validação de veículos",()=>{
  const valid={brand:"Honda",model:"CG 160",model_year:2025,plate:"ABC1D23",chassis:"9c2kc123",engine_number:"kc16e456",entry_date:"2026-07-12",purchase_price:10000,asking_price:13000};
  it("aceita cadastro válido e normaliza placa",()=>expect(vehicleSchema.parse({...valid,plate:"abc-1d23"}).plate).toBe("ABC1D23"));
  it("rejeita placa e valores inválidos",()=>{expect(vehicleSchema.safeParse({...valid,plate:"123"}).success).toBe(false);expect(vehicleSchema.safeParse({...valid,purchase_price:0}).success).toBe(false);});
  it("aceita placa e preço anunciado opcionais",()=>{const result=vehicleSchema.parse({...valid,plate:"",asking_price:""});expect(result.plate).toBe("");expect(result.asking_price).toBeNull();});
  it("mantém o valor FIPE como referência opcional",()=>{const result=vehicleSchema.parse({...valid,fipe_reference_value:14500});expect(result.fipe_reference_value).toBe(14500);expect(vehicleSchema.parse(valid).fipe_reference_value).toBeNull();});
  it("normaliza e permite identificadores opcionais",()=>{const result=vehicleSchema.parse({...valid,chassis:" 9c2kc123 ",engine_number:""});expect(result.chassis).toBe("9C2KC123");expect(result.engine_number).toBeNull();});
  it("aceita moto consignada sem custo de compra",()=>{const result=vehicleSchema.parse({...valid,ownership_type:"consignada",purchase_price:""});expect(result.ownership_type).toBe("consignada");expect(result.purchase_price).toBeNull();});
  it("continua exigindo custo de compra para moto própria",()=>expect(vehicleSchema.safeParse({...valid,ownership_type:"propria",purchase_price:""}).success).toBe(false));
});

describe("financiamento mensal e semanal",()=>{
  const valid={vehicle_id:"00000000-0000-4000-8000-000000000001",customer_name:"Cliente Teste",customer_cpf:"12345678901",customer_phone:"51999999999",customer_address:"Rua Exemplo, 100",sale_date:"2026-09-09",down_payment:1000,installment_count:30,installment_amount:500,first_due_date:"2026-09-16",notes:""};
  it("aceita pagamento semanal",()=>expect(financedSaleSchema.parse({...valid,payment_frequency:"semanal"}).payment_frequency).toBe("semanal"));
  it("mantém o limite mensal em 72 parcelas",()=>expect(financedSaleSchema.safeParse({...valid,payment_frequency:"mensal",installment_count:73}).success).toBe(false));
  it("permite até 312 parcelas semanais",()=>expect(financedSaleSchema.safeParse({...valid,payment_frequency:"semanal",installment_count:312}).success).toBe(true));
});
describe("custos e vendas",()=>{
  it("rejeita custo vazio e venda sem preço",()=>{expect(costSchema.safeParse({cost_date:"2026-01-01",category:"oficina",amount:0,description:""}).success).toBe(false);expect(saleSchema.safeParse({sale_date:"2026-01-01",sale_price:"",sale_fees:0}).success).toBe(false);});
  it("impede taxas negativas",()=>expect(saleSchema.safeParse({sale_date:"2026-01-01",sale_price:10000,sale_fees:-1}).success).toBe(false));
  it("aceita comissão positiva na venda consignada",()=>expect(saleSchema.parse({sale_date:"2026-01-01",sale_price:10000,sale_fees:0,commission_amount:1200}).commission_amount).toBe(1200));
});