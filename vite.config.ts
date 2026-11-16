/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { APP_NAME, MANIFEST_DESCRIPTION, THEME_COLOR } from "./src/config";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    {
      name: "app-html",
      transformIndexHtml: {
        order: "pre",
        handler: (html) => html.replaceAll("%APP_NAME%", APP_NAME).replaceAll("%THEME_COLOR%", THEME_COLOR),
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Registrierung in main.tsx, damit neue Versionen sofort geladen werden
      injectRegister: false,
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: MANIFEST_DESCRIPTION,
        lang: "de",
        display: "standalone",
        orientation: "any",
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg}"],
        runtimeCaching: [
          {
            // Bildpfade enthalten einen Zufallsteil, ändern sich also bei jedem Austausch
            urlPattern: ({ url }) => url.pathname.startsWith("/storage/v1/object/public/lineups/"),
            handler: "CacheFirst",
            options: { cacheName: "lineup-bilder", expiration: { maxEntries: 200 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts?(x)"],
    setupFiles: ["tests/setup.ts"],
  },
});
