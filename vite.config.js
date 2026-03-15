import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const reportingPackagesRoot = path.resolve(projectRoot, '../reporting/packages');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: '@reporting/react-ui/style.css',
        replacement: path.resolve(reportingPackagesRoot, 'react-ui/src/style.css'),
      },
      {
        find: '@reporting/react-ui',
        replacement: path.resolve(reportingPackagesRoot, 'react-ui/dist/index.js'),
      },
      {
        find: '@reporting/core',
        replacement: path.resolve(reportingPackagesRoot, 'core/dist/index.js'),
      },
      {
        find: '@reporting/agent-kit',
        replacement: path.resolve(reportingPackagesRoot, 'agent-kit/dist/index.js'),
      },
      {
        find: '@reporting/mcp-server',
        replacement: path.resolve(reportingPackagesRoot, 'mcp-server/dist/index.js'),
      },
    ],
  },
  build: {
    outDir: 'dist',
  },
  server: {
    fs: {
      allow: [path.resolve(projectRoot, '..')],
    },
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
