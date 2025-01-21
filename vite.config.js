import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        about: path.resolve(__dirname, 'src/html/game.html')
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'h': path.resolve(__dirname, './src/html'),
      'c': path.resolve(__dirname, './src/css'),
      'j': path.resolve(__dirname, './src/js'),
    },
  },
});