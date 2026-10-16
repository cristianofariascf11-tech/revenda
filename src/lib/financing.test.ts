import { describe, expect, it } from "vitest";
import { formatCpf, formatPhone, getInstallmentAlert } from "./financing";

describe("alertas das parcelas", () => {
  const today = "2026-07-13";

  it("dá prioridade máxima a parcelas vencidas", () => {
    expect(getInstallmentAlert("2026-07-10", null, today)).toMatchObject({ status: "overdue", days: -3, priority: 4 });
  });

  it("destaca vencimento no dia e nos próximos cinco dias", () => {
    expect(getInstallmentAlert(today, null, today).status).toBe("today");
    expect(getInstallmentAlert("2026-07-18", null, today)).toMatchObject({ status: "upcoming", days: 5 });
  });

  it("mantém vencimentos distantes como programados", () => {
    expect(getInstallmentAlert("2026-07-19", null, today).status).toBe("future");
  });

  it("uma baixa sempre prevalece sobre a data", () => {
    expect(getInstallmentAlert("2026-06-01", "2026-06-01T12:00:00Z", today).status).toBe("paid");
  });

  it("formata CPF e telefone para exibição", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });
});