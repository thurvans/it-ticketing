import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const backendEnvDir = fileURLToPath(new URL("./backend", import.meta.url));

function normalizeAppEnv(value, fallback = "development") {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "production" ? "production" : fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimTrailingSlash(value = "") {
  return String(value).replace(/\/+$/, "");
}

function readRuntimeConfig() {
  const baseEnv = loadEnv("base", backendEnvDir, "");
  const appEnv = normalizeAppEnv(baseEnv.APP_ENV, "development");
  const mergedEnv = {
    ...loadEnv(appEnv, backendEnvDir, ""),
    ...process.env,
  };
  const frontendOrigin = trimTrailingSlash(mergedEnv.FRONTEND_ORIGIN || "http://localhost:5173");
  const frontendUrl = new URL(frontendOrigin);
  const backendPort = toNumber(mergedEnv.PORT, 3001);
  const apiPublicUrl = trimTrailingSlash(mergedEnv.API_PUBLIC_URL || `http://localhost:${backendPort}`);

  return {
    appEnv,
    appName: mergedEnv.APP_NAME || "IT Ticketing System",
    frontendOrigin,
    frontendHost: frontendUrl.hostname,
    frontendPort: toNumber(frontendUrl.port, 5173),
    apiBaseUrl: `${apiPublicUrl}/api`,
  };
}

export default defineConfig(() => {
  const runtimeConfig = readRuntimeConfig();
  const previewPort = runtimeConfig.frontendPort === 5173 ? 4173 : runtimeConfig.frontendPort + 100;

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(runtimeConfig.apiBaseUrl),
      "import.meta.env.VITE_APP_BASE_URL": JSON.stringify(runtimeConfig.frontendOrigin),
      "import.meta.env.VITE_APP_NAME": JSON.stringify(runtimeConfig.appName),
      "import.meta.env.VITE_APP_ENV": JSON.stringify(runtimeConfig.appEnv),
    },
    server: {
      host: "0.0.0.0",
      port: runtimeConfig.frontendPort,
      strictPort: true,
      allowedHosts: runtimeConfig.frontendHost ? [runtimeConfig.frontendHost] : true,
      proxy: {
        "/api": {
          target: runtimeConfig.apiBaseUrl.replace(/\/api$/, ""),
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: previewPort,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      },
    },
    envDir: backendEnvDir,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("@fortawesome")) {
              return "fontawesome";
            }

            if (
              id.includes("recharts") ||
              id.includes("\\d3-") ||
              id.includes("/d3-") ||
              id.includes("\\internmap\\") ||
              id.includes("/internmap/")
            ) {
              return "charts";
            }

            return "vendor";
          },
        },
      },
    },
  };
});
