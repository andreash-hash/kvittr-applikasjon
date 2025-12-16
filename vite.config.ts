import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), isDev && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        // Capacitor packages must be bundled for native builds.
        // We keep them external only in dev (Lovable preview) to avoid web sandbox issues.
        external: isDev
          ? [
              "@capacitor/core",
              "@capacitor/camera",
              "@capacitor/filesystem",
              "@capacitor/push-notifications",
            ]
          : [],
      },
    },
  };
});
