import type { SupabaseClient } from "@supabase/supabase-js";

export async function signedPhotoMap(supabase: SupabaseClient, paths: (string | null)[]) {
  const valid = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (!valid.length) return new Map<string, string>();
  const { data } = await supabase.storage.from("vehicle-photos").createSignedUrls(valid, 3600);
  return new Map((data ?? []).filter(item => item.signedUrl).map(item => [item.path!, item.signedUrl!]));
}