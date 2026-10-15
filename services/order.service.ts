import { createClient } from "@/lib/supabase/server";

export async function getOrdersForCurrentUser() {
  const supabase = await createClient();
  return supabase.from("orders").select("*").order("created_at", { ascending: false });
}
