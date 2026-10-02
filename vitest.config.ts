import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    env: {
      VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || "mock-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-app.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || "mock-project",
      VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@pg/types": path.resolve(import.meta.dirname, "./packages/types/index.ts"),
    },
  },
});
