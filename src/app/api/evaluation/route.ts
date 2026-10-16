import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ConfiguredFipeAdapter, ConfiguredPlateAdapter, PlacaFipeAdapter } from "@/lib/evaluation-adapters";

const schema=z.object({plate:z.string().transform(v=>v.toUpperCase().replace(/[^A-Z0-9]/g,"")).refine(v=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v),"Placa inválida.")});
export async function POST(request:Request){
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>({})));if(!parsed.success)return NextResponse.json({error:"Placa inválida."},{status:400});
  const consultedAt=new Date().toISOString();const plateUrl=process.env.PLATE_API_URL;const fipeUrl=process.env.FIPE_API_URL;
  if(process.env.PLATE_API_PROVIDER==="placafipe"){
    const token=process.env.PLATE_API_TOKEN||process.env.FIPE_API_TOKEN;
    if(!token)return NextResponse.json({ok:false,error:"O token da Placa FIPE ainda não foi configurado no servidor.",consultedAt});
    try{const result=await new PlacaFipeAdapter(plateUrl||"https://api.placafipe.com.br",token).lookup(parsed.data.plate);return NextResponse.json({ok:true,vehicle:result.vehicle,fipeValue:result.fipe.value,source:result.fipe.source,alternatives:result.alternatives,warning:result.warning,consultedAt});}
    catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Falha na consulta Placa FIPE.",consultedAt,source:"Placa FIPE"});}
  }
  if(!plateUrl)return NextResponse.json({ok:false,error:"A API de placa ainda não foi configurada. Preencha os dados manualmente.",consultedAt},{status:200});
  try{
    const vehicle=await new ConfiguredPlateAdapter(plateUrl,process.env.PLATE_API_TOKEN).lookup(parsed.data.plate);
    if(!fipeUrl)return NextResponse.json({ok:false,vehicle,error:"A consulta do veículo funcionou, mas o fornecedor FIPE não está configurado. Informe a FIPE manualmente.",consultedAt,source:vehicle.source});
    try{const fipe=await new ConfiguredFipeAdapter(fipeUrl,process.env.FIPE_API_TOKEN).lookup(vehicle,parsed.data.plate);return NextResponse.json({ok:true,vehicle,fipeValue:fipe.value,source:`${vehicle.source} / ${fipe.source}`,consultedAt});}
    catch(error){return NextResponse.json({ok:false,vehicle,error:error instanceof Error?error.message:"Falha na FIPE.",consultedAt,source:vehicle.source});}
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Falha na consulta de placa.",consultedAt});}
}