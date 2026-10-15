import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Only the public URL and publishable key are exposed; SUPABASE_SECRET_KEY must never reach the bundle.
  const env = loadEnv(mode, "supabase", "SUPABASE_");
  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.SUPABASE_URL ?? ""),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.SUPABASE_PUBLISHABLE_KEY ?? "",
      ),
    },
  };
});
