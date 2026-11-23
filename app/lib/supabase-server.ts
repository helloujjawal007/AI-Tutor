import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client (for SSR)
export const supabaseServer = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        const cookieStore = cookies() as unknown as { getAll: () => any };
        // Type assertion for compatibility
        return cookieStore.getAll().map((cookie: any) => ({ name: cookie.name, value: cookie.value }));
      },
      setAll(cookiesToSet) {
        try {
          const cookieStore = cookies() as unknown as { set: (name: string, value: string, options?: any) => void };
          cookiesToSet.forEach((item: any) => {
            cookieStore.set(item.name, item.value, item.options);
          });
        } catch (error) {
          // The `cookies()` function only works client-side.
        }
      },
    },
  }
);