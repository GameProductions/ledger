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
    rolldownOptions: {
      external: [/^@modelcontextprotocol\/.*/],
    },
  },
  plugins: [
    tailwindcss(),
    cloudflare(),
    reactRouter(),
  ],
});
