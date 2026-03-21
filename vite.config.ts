import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // Pre-bundle Tether WDK stack so the dev server does not stall on first import (Lovable preview).
    optimizeDeps: {
      include: [
        "@tetherto/wdk",
        "@tetherto/wdk-wallet-evm",
        "@tetherto/wdk-wallet-solana",
        "@tetherto/wdk-wallet-ton",
        "@tetherto/wdk-wallet-tron",
      ],
    },
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
        // @solana/kit@4 package.json exports omit "." — Vite/Rollup cannot resolve bare imports otherwise.
        "@solana/kit": path.resolve(__dirname, "./node_modules/@solana/kit/dist/index.browser.cjs"),
      },
    },
  };
});
