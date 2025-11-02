import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    cors: false,
    allowedHosts: ['ozar.uz', 'www.ozar.uz', 'localhost'],
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Разделяем vendor библиотеки
          if (id.includes('node_modules')) {
            // React и React DOM
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // Axios
            if (id.includes('axios')) {
              return 'axios';
            }
            // Mapbox
            if (id.includes('mapbox')) {
              return 'mapbox';
            }
            // Swiper
            if (id.includes('swiper')) {
              return 'swiper';
            }
            // Остальные vendor библиотеки
            return 'vendor';
          }
          
          // Разделяем код приложения по функциональности
          if (id.includes('/src/admin/')) {
            return 'admin';
          }
          
          if (id.includes('/src/pages/')) {
            // Можно разбить по страницам, но пока оставим вместе
            return 'pages';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Увеличиваем лимит предупреждений до 600 KB
  },
});
