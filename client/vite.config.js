import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  // Оптимизация для production
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
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
        // НЕ переписываем путь - оставляем как есть
        // Запрос /api/v1/auth/signin должен идти на https://api.ozar.uz/api/v1/auth/signin
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log(`[Proxy] ${req.method} ${req.url} -> https://api.ozar.uz${req.url}`);
          });
          proxy.on("proxyRes", (proxyRes) => {
            // Нормализуем CORS: оставляем только один допустимый Origin
            proxyRes.headers["access-control-allow-origin"] = "http://localhost:5174";
            proxyRes.headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH";
            proxyRes.headers["access-control-allow-headers"] = "Content-Type, Authorization, X-Requested-With";
            proxyRes.headers["access-control-allow-credentials"] = "true";
          });
          proxy.on("error", (err, req, res) => {
            console.error("Proxy error:", err);
          });
        },
      },
    },
  },
  build: {
    minify: 'esbuild', // esbuild быстрее и уже встроен в Vite
    cssMinify: true,
    // esbuild автоматически удаляет комментарии и минифицирует код
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Разделяем vendor библиотеки
          if (id.includes('node_modules')) {
            // React и React DOM - самый большой chunk
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // Mapbox - большой, отдельный chunk
            if (id.includes('mapbox')) {
              return 'mapbox';
            }
            // Swiper
            if (id.includes('swiper')) {
              return 'swiper';
            }
            // Axios - маленький, можно в общий vendor
            if (id.includes('axios')) {
              return 'vendor';
            }
            // Остальные vendor библиотеки
            return 'vendor';
          }
          
          // Разделяем код приложения по функциональности
          if (id.includes('/src/admin/')) {
            return 'admin';
          }
          
          // Большие страницы - отдельные chunks
          if (id.includes('/src/pages/Product.tsx')) {
            return 'page-product';
          }
          if (id.includes('/src/pages/Profile.tsx')) {
            return 'page-profile';
          }
          if (id.includes('/src/pages/Orders.tsx')) {
            return 'page-orders';
          }
          if (id.includes('/src/pages/')) {
            return 'pages';
          }
          
          // Компоненты с Mapbox - отдельный chunk
          if (id.includes('/src/components/ModernMap')) {
            return 'mapbox-components';
          }
        },
        // Оптимизация имен файлов
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 500, // Предупреждение при размере chunk > 500 KB
    target: 'es2015', // Современный JS для лучшей минификации
  },
});
