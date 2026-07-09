import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works both locally and on GitHub Pages
  // (served from https://fytsai-yolo.github.io/ziwei-3d/, a subpath).
  base: './',
});
