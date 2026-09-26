import { defineConfig } from 'vite';
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite';

export default defineConfig({
  plugins: [wgslVitePlugin()],
  server: {
    host: '127.0.0.1',
  },
  build: {
    sourcemap: true,
  },
});
