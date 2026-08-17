import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
