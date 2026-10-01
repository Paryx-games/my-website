import { defineConfig } from 'vite';

// Vite serves the generated pages locally; production is plain static HTML.
export default defineConfig({
  root: 'dist',
  appType: 'mpa',
  server: { host: '127.0.0.1' },
});
