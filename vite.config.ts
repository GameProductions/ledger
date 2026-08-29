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
    watch: {
      ignored: [
        '**/package.json',
        '**/package-lock.json',
        '**/pnpm-lock.yaml',
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.log',
      ],
    },
  },

  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      'framer-motion',
      'lucide-react',
      '@simplewebauthn/browser',
      'date-fns',
    ],
    exclude: ['react-router', '@react-router/dev'],
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
    cloudflare({
      viteEnvironment: {
        name: "ssr",
      },
    }),
    tailwindcss(),
    reactRouter(),
  ],
});
