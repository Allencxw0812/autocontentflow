import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const BASE = process.env.BASE_PATH || '/autocontentflow/';
const SITE = BASE === '/'
  ? 'http://localhost:4321'
  : 'https://allencxw0812.github.io';

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
