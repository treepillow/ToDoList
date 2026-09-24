/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls so the browser sees one origin (no permissive CORS needed).
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT ?? 3001}`,
        // Keep the browser's Host header: the API's CSRF check compares it with Origin.
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
