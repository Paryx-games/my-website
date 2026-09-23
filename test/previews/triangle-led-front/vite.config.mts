import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import wgsl from '@vgpu/wgsl/loader-vite';
import { defineConfig } from 'vite';

const previewRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: previewRoot,
  plugins: [react(), wgsl()],
  build: { outDir: 'dist' },
});
