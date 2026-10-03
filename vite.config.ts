import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src'),
      '@domain': path.resolve(__dirname, 'packages/domain'),
      '@database': path.resolve(__dirname, 'packages/database'),
      '@fiscal': path.resolve(__dirname, 'packages/fiscal'),
      '@certificates': path.resolve(__dirname, 'packages/certificates'),
      '@storage': path.resolve(__dirname, 'packages/storage'),
      '@downloads': path.resolve(__dirname, 'packages/downloads'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
