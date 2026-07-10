import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  base: '/suno-prompt-maker/',
  plugins: [wasm(), topLevelAwait()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'esnext',
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['@ternlight/base'],
  },
});
