import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Eliminamos 'minify: terser' para que Vite use esbuild (incluido por defecto).
    // Esto es mucho más rápido y soluciona el error de dependencia en Vercel.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts', 'xlsx'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});