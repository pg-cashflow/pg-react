import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/(api|auth|owner|tenant|join|push|webhooks|manager|notifications)\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/localhost:8080\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'PG Cashflow',
        short_name: 'PG Cashflow',
        description: 'Rent ledger and daily ops for Indian PGs and hostels',
        theme_color: '#FAFAF7',
        background_color: '#FAFAF7',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@pg/types': path.resolve(import.meta.dirname, './packages/types/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
