import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', '.kilo/**', 'dist/**', 'dist-electron/**'],
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, 'packages/domain'),
      '@database': path.resolve(__dirname, 'packages/database'),
      '@fiscal': path.resolve(__dirname, 'packages/fiscal'),
      '@certificates': path.resolve(__dirname, 'packages/certificates'),
      '@storage': path.resolve(__dirname, 'packages/storage'),
      '@downloads': path.resolve(__dirname, 'packages/downloads'),
    },
  },
});
