import { createBrowserClient } from "@supabase/ssr";

/*
  Supabase connection used in the browser (client components). It acts as the logged-in customer or staff
  member, so the database's security rules decide what it may read or change. Uses the publishable key,
  which is safe to show in the browser.
*/
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
