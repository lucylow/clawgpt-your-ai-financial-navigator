import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";

function normalizeViteBase(raw: string | undefined): string {
  const b = raw?.trim();
  if (!b || b === "/") return "/";
  if (b === "./" || b === ".") return "./";
  const withLeading = b.startsWith("/") ? b : `/${b}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeViteBase(env.VITE_BASE_PATH);

  return {
    base,
    server: {
      host: true,
      port: 8080,
      strictPort: false,
      // Lovable / tunnel previews often hit the dev server via a non-local hostname.
      allowedHosts: true,
      hmr: {
        overlay: false,
      },
    },
    preview: {
      host: true,
      port: 8080,
      allowedHosts: true,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
