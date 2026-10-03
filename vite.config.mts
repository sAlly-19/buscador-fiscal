import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@renderer': path.resolve(rootDir, 'src'),
      '@domain': path.resolve(rootDir, 'packages/domain'),
      '@database': path.resolve(rootDir, 'packages/database'),
      '@fiscal': path.resolve(rootDir, 'packages/fiscal'),
      '@certificates': path.resolve(rootDir, 'packages/certificates'),
      '@storage': path.resolve(rootDir, 'packages/storage'),
      '@downloads': path.resolve(rootDir, 'packages/downloads'),
    },
  },
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
