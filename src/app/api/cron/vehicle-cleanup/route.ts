import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request:Request){const secret=process.env.CRON_SECRET;if(!secret)return false;return request.headers.get("authorization")===`Bearer ${secret}`||request.headers.get("x-cron-secret")===secret;}
function before(days:number){return new Date(Date.now()-days*86_400_000).toISOString();}

async function run(request:Request){
  if(!authorized(request))return NextResponse.json({error:"Não autorizado."},{status:401});
  const url=new URL(request.url);const execute=url.searchParams.get("execute")==="true";const dryRun=!execute;const admin=createAdminClient();
  const{data:inactive,error:inactiveError}=await admin.from("vehicles").select("id,code,status,updated_at").in("status",["em_preparacao","a_venda","reservada"]).is("deleted_at",null).lt("updated_at",before(90));
  if(inactiveError)return NextResponse.json({error:inactiveError.message},{status:500});
  const inactiveIds=(inactive??[]).map(v=>v.id);const{data:existingPhotos}=inactiveIds.length?await admin.from("vehicle_photos").select("vehicle_id").in("vehicle_id",inactiveIds):{data:[]};const withPhotos=new Set((existingPhotos??[]).map(p=>p.vehicle_id));const archive=(inactive??[]).filter(v=>!withPhotos.has(v.id));
  const{data:expired,error:expiredError}=await admin.from("vehicles").select("id,code,deleted_at").eq("status","arquivada").not("deleted_at","is",null).lt("deleted_at",before(120));
  if(expiredError)return NextResponse.json({error:expiredError.message},{status:500});
  const expiredIds=(expired??[]).map(v=>v.id);const{data:photos}=expiredIds.length?await admin.from("vehicle_photos").select("id,vehicle_id,path").in("vehicle_id",expiredIds):{data:[]};
  const logs=[...archive.map(v=>({action:"archive_inactive_without_photos",vehicle_id:v.id,dry_run:dryRun,details:{code:v.code,previous_status:v.status,inactive_since:v.updated_at}})),...(photos??[]).map(p=>({action:"remove_expired_photo",vehicle_id:p.vehicle_id,dry_run:dryRun,details:{path:p.path}}))];
  if(dryRun){if(logs.length)await admin.from("automation_logs").insert(logs);return NextResponse.json({mode:"simulation",wouldArchive:archive.length,wouldRemovePhotos:photos?.length??0,items:logs});}
  const errors:string[]=[];let archivedCount=0;let removedPhotoCount=0;
  for(const vehicle of archive){const{error}=await admin.from("vehicles").update({status:"arquivada"}).eq("id",vehicle.id);if(error){errors.push(`${vehicle.code}: ${error.message}`);await admin.from("automation_logs").insert({action:"archive_inactive_failed",vehicle_id:vehicle.id,dry_run:false,details:{code:vehicle.code,error:error.message}});}else{archivedCount++;await admin.from("automation_logs").insert({action:"archive_inactive_without_photos",vehicle_id:vehicle.id,dry_run:false,details:{code:vehicle.code,previous_status:vehicle.status}});}}
  for(const photo of photos??[]){const{error:storageError}=await admin.storage.from("vehicle-photos").remove([photo.path]);if(storageError){errors.push(`${photo.path}: ${storageError.message}`);await admin.from("automation_logs").insert({action:"remove_expired_photo_failed",vehicle_id:photo.vehicle_id,dry_run:false,details:{path:photo.path,error:storageError.message}});continue;}const{error:dbError}=await admin.from("vehicle_photos").delete().eq("id",photo.id);if(dbError){errors.push(`${photo.path}: registro não removido (${dbError.message})`);await admin.from("automation_logs").insert({action:"remove_expired_photo_record_failed",vehicle_id:photo.vehicle_id,dry_run:false,details:{path:photo.path,error:dbError.message}});continue;}removedPhotoCount++;await admin.from("automation_logs").insert({action:"remove_expired_photo",vehicle_id:photo.vehicle_id,dry_run:false,details:{path:photo.path}});}
  return NextResponse.json({mode:"execution",archived:archivedCount,removedPhotos:removedPhotoCount,errors},{status:errors.length?207:200});
}
export const GET=run;export const POST=run;