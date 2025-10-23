import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5174,
    cors: false,
    proxy: {
      "/api": {
        target: "https://api.ozar.uz",
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            // Нормализуем CORS: оставляем только один допустимый Origin
            proxyRes.headers["access-control-allow-origin"] = "http://localhost:5174";
          });
        },
      },
    },
  },
});
