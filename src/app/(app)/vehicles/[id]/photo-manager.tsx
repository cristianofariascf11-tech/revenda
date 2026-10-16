"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VehiclePhoto } from "@/lib/types";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

async function compressImage(file: File) {
  if (!ACCEPTED.includes(file.type)) throw new Error(`${file.name}: formato não aceito.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .82));
  if (!blob) throw new Error(`${file.name}: não foi possível compactar.`);
  return blob;
}

export function PhotoManager({ vehicleId, photos: initial }: { vehicleId: string; photos: VehiclePhoto[] }) {
  const router=useRouter(); const input=useRef<HTMLInputElement>(null); const [photos,setPhotos]=useState(initial); const [busy,setBusy]=useState(false); const [progress,setProgress]=useState(0); const [error,setError]=useState("");
  async function upload(files: FileList | null) {
    if (!files?.length) return; if (photos.length+files.length>12) return setError("O veículo pode ter no máximo 12 fotos.");
    setBusy(true);setError("");const supabase=createClient();let completed=0;
    try {
      for (const file of Array.from(files)) {
        const blob=await compressImage(file); const path=`${vehicleId}/${crypto.randomUUID()}.jpg`;
        const {error:uploadError}=await supabase.storage.from("vehicle-photos").upload(path,blob,{contentType:"image/jpeg",upsert:false});
        if(uploadError)throw uploadError;
        const {data,error:dbError}=await supabase.from("vehicle_photos").insert({vehicle_id:vehicleId,path,ord:photos.length+completed}).select("*").single();
        if(dbError){await supabase.storage.from("vehicle-photos").remove([path]);throw dbError;}
        const {data:url}=await supabase.storage.from("vehicle-photos").createSignedUrl(path,3600);
        setPhotos(current=>[...current,{...data,signedUrl:url?.signedUrl}]); completed++;setProgress(Math.round(completed/files.length*100));
      }
      router.refresh();
    } catch(e){setError(e instanceof Error?e.message:"Falha ao enviar foto.");} finally {setBusy(false);if(input.current)input.current.value="";}
  }
  async function remove(photo:VehiclePhoto) {
    if(!confirm("Excluir esta foto?"))return;setError("");setBusy(true);const supabase=createClient();
    const {error:dbError}=await supabase.from("vehicle_photos").delete().eq("id",photo.id);if(dbError){setBusy(false);return setError(dbError.message);}
    const {error:storageError}=await supabase.storage.from("vehicle-photos").remove([photo.path]);
    if(storageError){await supabase.from("vehicle_photos").insert({id:photo.id,vehicle_id:photo.vehicle_id,path:photo.path,ord:photo.ord});setBusy(false);return setError("A foto não foi removida; o registro foi restaurado.");}
    const next=photos.filter(p=>p.id!==photo.id).map((p,i)=>({...p,ord:i}));setPhotos(next);await supabase.rpc("reorder_vehicle_photos",{p_vehicle_id:vehicleId,p_photo_ids:next.map(p=>p.id)});setBusy(false);router.refresh();
  }
  async function move(index:number,direction:number){const target=index+direction;if(target<0||target>=photos.length)return;const next=[...photos];[next[index],next[target]]=[next[target],next[index]];setPhotos(next.map((p,i)=>({...p,ord:i})));const {error}=await createClient().rpc("reorder_vehicle_photos",{p_vehicle_id:vehicleId,p_photo_ids:next.map(p=>p.id)});if(error){setPhotos(photos);setError(error.message);}else router.refresh();}
  return <div className="stack">
    {error&&<div className="alert alert-error">{error}</div>}
    {photos.length?<div className="photo-grid">{photos.map((photo,index)=><div className="photo-item" key={photo.id}>{photo.signedUrl?<Image src={photo.signedUrl} alt={`Foto ${index+1}`} fill sizes="(max-width: 700px) 50vw, 25vw"/>:<div className="empty">Sem prévia</div>}{index===0&&<span className="badge badge-sale" style={{position:"absolute",left:5,top:5}}>Capa</span>}<div className="photo-tools"><button className="btn btn-sm icon-btn" disabled={busy||index===0} onClick={()=>move(index,-1)} title="Mover para esquerda"><ArrowLeft size={15}/></button><button className="btn btn-sm icon-btn" disabled={busy||index===photos.length-1} onClick={()=>move(index,1)} title="Mover para direita"><ArrowRight size={15}/></button><button className="btn btn-danger btn-sm icon-btn" disabled={busy} onClick={()=>remove(photo)} title="Excluir foto"><Trash2 size={15}/></button></div></div>)}</div>:<div className="empty" style={{padding:24}}>Nenhuma foto enviada. São necessárias 4 para colocar à venda.</div>}
    <div className="cluster"><input ref={input} hidden id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>upload(e.target.files)} disabled={busy||photos.length>=12}/><label className="btn btn-primary" htmlFor="photos"><ImagePlus size={17}/>{busy?`Enviando ${progress}%`:"Adicionar fotos"}</label><span className="muted">JPG, PNG ou WEBP • compactação automática</span></div>
  </div>;
}