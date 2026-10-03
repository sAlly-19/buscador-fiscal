import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', '.kilo/**', 'dist/**', 'dist-electron/**'],
  },
  resolve: {
    alias: {
      '@domain': path.resolve(rootDir, 'packages/domain'),
      '@database': path.resolve(rootDir, 'packages/database'),
      '@fiscal': path.resolve(rootDir, 'packages/fiscal'),
      '@certificates': path.resolve(rootDir, 'packages/certificates'),
      '@storage': path.resolve(rootDir, 'packages/storage'),
      '@downloads': path.resolve(rootDir, 'packages/downloads'),
    },
  },
});
