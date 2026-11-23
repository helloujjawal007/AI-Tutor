import { createBrowserClient } from "@supabase/ssr";

// Browser client - use a generic type parameter
export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);