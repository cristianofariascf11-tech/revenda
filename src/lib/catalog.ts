import "server-only";

import { cache } from "react";
import { signedPhotoMap } from "@/lib/photo-urls";
import { createAdminClient } from "@/lib/supabase/admin";
import { marketplaceBenefits } from "@/lib/marketplace-caption";
import type { VehicleMarketplace } from "@/lib/types";

export type CatalogVehicle = {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
  askingPrice: number;
  coverUrl?: string;
} & VehicleMarketplace;

export type CatalogVehicleDetails = CatalogVehicle & {
  photos: { id: string; url: string; order: number }[];
};

type VehicleRow = {
  id: string;
  brand: string;
  model: string;
  model_year: number;
  asking_price: number | string;
} & VehicleMarketplace;

export { marketplaceBenefits };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicVehicle(row: VehicleRow, coverUrl?: string): CatalogVehicle {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    modelYear: Number(row.model_year),
    askingPrice: Number(row.asking_price),
    catalog_description: row.catalog_description,
    marketplace_reviewed: row.marketplace_reviewed,
    marketplace_warranty: row.marketplace_warranty,
    marketplace_trade: row.marketplace_trade,
    marketplace_financing: row.marketplace_financing,
    marketplace_card_24x: row.marketplace_card_24x,
    coverUrl,
  };
}

export async function getCatalogVehicles(): Promise<CatalogVehicle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select("id,brand,model,model_year,asking_price,catalog_description,marketplace_reviewed,marketplace_warranty,marketplace_trade,marketplace_financing,marketplace_card_24x")
    .eq("status", "a_venda")
    .is("deleted_at", null)
    .gt("asking_price", 0)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
  const rows = (data ?? []) as VehicleRow[];
  if (!rows.length) return [];

  const vehicleIds = rows.map(vehicle => vehicle.id);
  const { data: photos, error: photoError } = await admin
    .from("vehicle_photos")
    .select("vehicle_id,path,ord")
    .in("vehicle_id", vehicleIds)
    .order("ord", { ascending: true });

  if (photoError) throw new Error(`Não foi possível carregar as fotos: ${photoError.message}`);
  const coverPathByVehicle = new Map<string, string>();
  for (const photo of photos ?? []) {
    if (!coverPathByVehicle.has(photo.vehicle_id)) coverPathByVehicle.set(photo.vehicle_id, photo.path);
  }
  const signedUrls = await signedPhotoMap(admin, [...coverPathByVehicle.values()]);

  return rows.map(row => {
    const coverPath = coverPathByVehicle.get(row.id);
    return publicVehicle(row, coverPath ? signedUrls.get(coverPath) : undefined);
  });
}

export const getCatalogVehicle = cache(async (id: string): Promise<CatalogVehicleDetails | null> => {
  if (!UUID_PATTERN.test(id)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select("id,brand,model,model_year,asking_price,catalog_description,marketplace_reviewed,marketplace_warranty,marketplace_trade,marketplace_financing,marketplace_card_24x")
    .eq("id", id)
    .eq("status", "a_venda")
    .is("deleted_at", null)
    .gt("asking_price", 0)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível carregar a motocicleta: ${error.message}`);
  if (!data) return null;

  const { data: photoRows, error: photoError } = await admin
    .from("vehicle_photos")
    .select("id,path,ord")
    .eq("vehicle_id", id)
    .order("ord", { ascending: true });

  if (photoError) throw new Error(`Não foi possível carregar as fotos: ${photoError.message}`);
  const signedUrls = await signedPhotoMap(admin, (photoRows ?? []).map(photo => photo.path));
  const photos = (photoRows ?? []).flatMap(photo => {
    const url = signedUrls.get(photo.path);
    return url ? [{ id: photo.id, url, order: photo.ord }] : [];
  });

  return { ...publicVehicle(data as VehicleRow, photos[0]?.url), photos };
});