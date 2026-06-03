import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://allencxw0812.github.io',
  base: '/autocontentflow/',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
