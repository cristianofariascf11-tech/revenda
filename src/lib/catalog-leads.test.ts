import { describe, expect, it } from "vitest";
import { ageFromBirthDate, catalogLeadSchema, catalogLeadWhatsAppMessage, isValidCpf } from "./catalog-leads";

const base = {
  vehicleId: "7734c07f-7ed1-40a9-8184-b198698c247c",
  fullName: "João da Silva",
  age: 36,
  phone: "51999999999",
  city: "Porto Alegre",
  privacyAcknowledged: true as const,
  marketingConsent: true,
  website: "",
};

describe("captação de leads do catálogo", () => {
  it("valida CPF pelos dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("calcula idade sem depender do fuso horário local", () => {
    expect(ageFromBirthDate("1990-08-02", new Date("2026-08-01T12:00:00Z"))).toBe(35);
    expect(ageFromBirthDate("1990-08-01", new Date("2026-08-01T12:00:00Z"))).toBe(36);
  });

  it("aceita atendimento apenas com os dados básicos", () => {
    expect(catalogLeadSchema.parse({ ...base, interestType: "atendimento" })).toMatchObject({
      interestType: "atendimento",
      phone: "51999999999",
      birthDate: null,
      cpf: null,
    });
  });

  it("exige os dados adicionais na simulação de financiamento", () => {
    expect(catalogLeadSchema.safeParse({ ...base, interestType: "financiamento" }).success).toBe(false);
    expect(catalogLeadSchema.safeParse({
      ...base,
      interestType: "financiamento",
      birthDate: "1990-08-01",
      cpf: "52998224725",
      hasProvenIncome: true,
      hasCnhA: false,
    }).success).toBe(true);
  });

  it("monta a mensagem com a moto e os dados informados", () => {
    const lead = catalogLeadSchema.parse({
      ...base,
      interestType: "financiamento",
      birthDate: "1990-08-01",
      cpf: "52998224725",
      hasProvenIncome: true,
      hasCnhA: false,
    });
    const message = catalogLeadWhatsAppMessage({ id: base.vehicleId, brand: "SUZUKI", model: "GSX 1250 F" }, lead);
    expect(message).toContain("SUZUKI GSX 1250 F");
    expect(message).toContain("Nome: João da Silva");
    expect(message).toContain("Renda comprovada: Sim");
    expect(message).toContain(`/catalogo/${base.vehicleId}`);
  });
});