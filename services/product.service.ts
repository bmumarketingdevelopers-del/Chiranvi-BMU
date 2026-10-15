import { createClient } from "@/lib/supabase/server";

export async function getProducts() {
  const supabase = await createClient();
  return supabase.from("products").select("*").eq("is_active", true);
}
