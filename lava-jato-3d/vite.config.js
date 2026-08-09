import { defineConfig } from 'vite';

// GitHub Pages de projeto serve em /<repo>/, então o caminho base precisa ser
// injetável. Netlify, Vercel e Cloudflare servem na raiz e usam o padrão.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: { outDir: 'dist', assetsInlineLimit: 0 }
});
