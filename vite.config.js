import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/suno-prompt-maker/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: ['@ternlight/base'],
  },
});
