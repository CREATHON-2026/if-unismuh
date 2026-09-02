import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      // Dipakai komponen yang disalin dari registri shadcn (beUI), yang
      // sumbernya selalu mengimpor '@/lib/utils'. Wajib ada di SINI dan di
      // tsconfig.json sekaligus — kalau hanya salah satu, `tsc` lolos tapi
      // Vite pecah, atau sebaliknya, dan galatnya baru muncul saat dibuka.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Browser memanggil /api relatif; dev server meneruskan ke backend lokal.
  // Wajib di Codespaces: localhost:3000 codespace tidak terlihat dari browser.
  server: {
    host: true, // bind 0.0.0.0 supaya port forwarding Codespaces bekerja
    allowedHosts: ['.app.github.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
