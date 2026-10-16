import { afterEach, describe, expect, it, vi } from "vitest";
import { PlacaFipeAdapter } from "./evaluation-adapters";

afterEach(()=>vi.unstubAllGlobals());

describe("PlacaFipeAdapter",()=>{
  it("envia placa e token no servidor e ordena a melhor correspondência",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({
      codigo:1,msg:"total de 2 modelos",informacoes_veiculo:{marca:"HONDA",modelo:"CG 160",ano_modelo:"2024",chassi:"******1234",motor:"KC16E2******"},
      fipe:[
        {marca:"HONDA",modelo:"CG 160 FAN",ano_modelo:2023,codigo_fipe:"811111-1",mes_referencia:"julho de 2026",combustivel:"GASOLINA",valor:"16000.00",similaridade:"99",correspondencia:"99"},
        {marca:"HONDA",modelo:"CG 160 TITAN",ano_modelo:2024,codigo_fipe:"822222-2",mes_referencia:"julho de 2026",combustivel:"GASOLINA",valor:"18500.50",similaridade:"80",correspondencia:"80"},
      ],
    }),{status:200,headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);
    const result=await new PlacaFipeAdapter("https://api.placafipe.com.br/","token-secreto").lookup("ABC1D23");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.placafipe.com.br/getplacafipe");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({placa:"ABC1D23",token:"token-secreto"});
    expect(result.vehicle.model).toBe("CG 160 TITAN");
    expect(result.vehicle.chassis).toBe("******1234");
    expect(result.vehicle.engineNumber).toBe("KC16E2******");
    expect(result.fipe.value).toBe(18500.5);
    expect(result.alternatives).toHaveLength(2);
  });

  it("transforma códigos de erro do fornecedor em mensagem clara",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({codigo:4862,msg:"Limite diário atingido"}),{status:200,headers:{"Content-Type":"application/json"}})));
    await expect(new PlacaFipeAdapter("https://api.placafipe.com.br","token").lookup("ABC1D23")).rejects.toThrow("Limite diário atingido");
  });
});