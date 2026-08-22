import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  assetsInclude: ['**/*.md'],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('drizzle-orm') || id.includes('/db/')) {
            return 'drizzle-core';
          }
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    cloudflare(),
    reactRouter(),
  ],
});
