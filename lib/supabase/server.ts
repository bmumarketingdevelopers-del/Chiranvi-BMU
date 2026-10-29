import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
  Supabase connection used on the server (API routes, server components). It reads the visitor's login from
  their cookies, so it acts as that customer or staff member and the security rules still apply.
*/
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot always write cookies.
          }
        },
      },
    },
  );
}
