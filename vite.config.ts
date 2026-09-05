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
            urlPattern: /^https?:\/\/.*\/(auth|owner|tenant|join|push|webhooks)\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/localhost:8080\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'PG Cashflow Manager',
        short_name: 'PG Manager',
        description: 'Automated rent-due tracking and collection for PG/Hostel',
        theme_color: '#0f172a',
        background_color: '#0f172a',
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
    host: true,
    port: 5173,
    allowedHosts: true,
  },
});
