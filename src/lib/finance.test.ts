import { describe, expect, it } from "vitest";
import { calculateFinancials, calculateSuggestedOffer, daysInStock, evaluationCostTotal } from "./finance";

describe("cálculos financeiros",()=>{
  it("calcula investimento e lucro real",()=>expect(calculateFinancials(10000,1250,15000,500)).toEqual({totalInvested:11250,profit:3250}));
  it("nunca devolve NaN com entradas ausentes",()=>{const result=calculateFinancials(Number.NaN,Number.NaN,Number.NaN,Number.NaN);expect(result.totalInvested).toBe(0);expect(result.profit).toBe(0);});
  it("mantém lucro pendente antes da venda",()=>expect(calculateFinancials(10000,500).profit).toBeNull());
  it("calcula oferta FIPE e limita o mínimo a zero",()=>{expect(calculateSuggestedOffer(20000,20,1000)).toBe(15000);expect(calculateSuggestedOffer(1000,25,2000)).toBe(0);});
  it("soma custos previstos",()=>expect(evaluationCostTotal({tires:400,documents:200,workshop:300,detailing:100,transport:50,others:25})).toBe(1075));
  it("calcula dias em estoque",()=>expect(daysInStock("2026-01-01",null,new Date("2026-02-01T12:00:00"))).toBe(31));
});