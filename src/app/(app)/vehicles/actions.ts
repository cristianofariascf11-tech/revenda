"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { costSchema, saleSchema, statusSchema, vehicleSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: boolean; error?: string; id?: string; code?: string };

export async function createVehicleAction(input: unknown): Promise<ActionResult> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicles").insert({
    ...values, plate: values.plate || null, chassis: values.chassis ?? null, engine_number: values.engine_number ?? null,
  }).select("id,code").single();
  if (error?.code === "23505") return { ok: false, error: "Já existe um veículo ativo com esta placa." };
  if (error || !data?.id) return { ok: false, error: error?.message ?? "Não foi possível criar o veículo." };
  revalidatePath("/vehicles");
  return { ok: true, id: data.id, code: data.code };
}

export async function updateVehicleAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update({ ...parsed.data, plate: parsed.data.plate || null, chassis: parsed.data.chassis ?? null, engine_number: parsed.data.engine_number ?? null }).eq("id", id).is("deleted_at", null);
  if (error?.code === "23505") return { ok: false, error: "Já existe um veículo ativo com esta placa." };
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/vehicles/${id}`); revalidatePath("/vehicles");
  return { ok: true, id };
}

export async function updateStatusAction(id: string, status: string): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update({ status: parsed.data.status }).eq("id", id).is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/vehicles/${id}`); revalidatePath("/vehicles");
  return { ok: true };
}

export async function deleteVehicleAction(id: string, complete = false): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!complete) {
    const { error } = await supabase.from("vehicles").update({ deleted_at: new Date().toISOString(), status: "arquivada" }).eq("id", id).is("deleted_at", null);
    if (error) return { ok: false, error: error.message };
  } else {
    let admin;
    try { admin = createAdminClient(); } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Configuração administrativa ausente." }; }
    const { data: photos, error: photoError } = await admin.from("vehicle_photos").select("path").eq("vehicle_id", id);
    if (photoError) return { ok: false, error: photoError.message };
    const paths = (photos ?? []).map(photo => photo.path);
    if (paths.length) {
      const { error: storageError } = await admin.storage.from("vehicle-photos").remove(paths);
      if (storageError) return { ok: false, error: `As fotos não puderam ser removidas: ${storageError.message}` };
    }
    const { error } = await admin.from("vehicles").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/vehicles");
  return { ok: true };
}

export async function saveCostAction(vehicleId: string, costId: string | null, input: unknown): Promise<ActionResult> {
  const parsed=costSchema.safeParse(input);if(!parsed.success)return{ok:false,error:parsed.error.issues[0]?.message??"Custo inválido."};
  const supabase=await createClient(); const query=costId?supabase.from("vehicle_costs").update(parsed.data).eq("id",costId).eq("vehicle_id",vehicleId):supabase.from("vehicle_costs").insert({...parsed.data,vehicle_id:vehicleId});
  const {error}=await query;if(error)return{ok:false,error:error.message};revalidatePath(`/vehicles/${vehicleId}`);revalidatePath("/vehicles");return{ok:true};
}

export async function deleteCostAction(vehicleId:string,costId:string):Promise<ActionResult>{
  const {error}=await (await createClient()).from("vehicle_costs").delete().eq("id",costId).eq("vehicle_id",vehicleId);if(error)return{ok:false,error:error.message};revalidatePath(`/vehicles/${vehicleId}`);revalidatePath("/vehicles");return{ok:true};
}

export async function registerSaleAction(vehicleId:string,input:unknown):Promise<ActionResult>{
  const parsed=saleSchema.safeParse(input);if(!parsed.success)return{ok:false,error:parsed.error.issues[0]?.message??"Venda inválida."};const supabase=await createClient();
  const {error}=await supabase.rpc("register_vehicle_sale",{p_vehicle_id:vehicleId,p_sale_date:parsed.data.sale_date,p_sale_price:parsed.data.sale_price,p_sale_fees:parsed.data.sale_fees,p_commission_amount:parsed.data.commission_amount});
  if(error)return{ok:false,error:error.message};revalidatePath(`/vehicles/${vehicleId}`);revalidatePath("/vehicles");revalidatePath("/financial");return{ok:true};
}