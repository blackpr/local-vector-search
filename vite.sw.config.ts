import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: 'public',
    lib: {
      entry: resolve(__dirname, 'src/sw.ts'),
      name: 'sw',
      fileName: () => 'sw.js',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'sw.js',
        chunkFileNames: 'sw-chunks/[name]-[hash].js',
        assetFileNames: 'sw-assets/[name]-[hash][extname]'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
