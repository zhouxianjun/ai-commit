import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'es2020',
  platform: 'node',
  outDir: 'dist',
  sourcemap: 'hidden',
  clean: true,
  shims: true,
  deps: {
    neverBundle: ['vscode'],
  },
  copy: ['prompt'],
  outExtensions: () => ({ js: '.js', map: '.map' }),
});
