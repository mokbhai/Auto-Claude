/**
 * Vite Configuration for Web Build
 * =================================
 *
 * This configuration builds the frontend as a pure web application
 * without Electron dependencies. The output is served by the FastAPI backend.
 *
 * Usage:
 *   npm run build:web     # Build for production
 *   npm run dev:web       # Development with HMR (proxies to FastAPI backend)
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';

// Load .env file for build-time constants
dotenvConfig({ path: resolve(__dirname, '.env') });

/**
 * Sentry configuration embedded at build time.
 */
const sentryDefines = {
  '__SENTRY_DSN__': JSON.stringify(process.env.SENTRY_DSN || ''),
  '__SENTRY_TRACES_SAMPLE_RATE__': JSON.stringify(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  '__SENTRY_PROFILES_SAMPLE_RATE__': JSON.stringify(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  // Web-specific: no Electron APIs
  '__IS_ELECTRON__': JSON.stringify(false),
};

// Backend URL for development proxy
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  define: sentryDefines,

  root: resolve(__dirname, 'src/renderer'),

  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@features': resolve(__dirname, 'src/renderer/features'),
      '@components': resolve(__dirname, 'src/renderer/shared/components'),
      '@hooks': resolve(__dirname, 'src/renderer/shared/hooks'),
      '@lib': resolve(__dirname, 'src/renderer/shared/lib'),
    },
  },

  build: {
    outDir: resolve(__dirname, '../backend/web/static'),
    emptyDirBeforeWrite: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to FastAPI backend
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      // Proxy WebSocket connections
      '/ws': {
        target: BACKEND_URL.replace('http', 'ws'),
        ws: true,
      },
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.worktrees/**',
        '**/.auto-claude/**',
        '**/out/**',
      ],
    },
  },

  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/ws': {
        target: BACKEND_URL.replace('http', 'ws'),
        ws: true,
      },
    },
  },
});
