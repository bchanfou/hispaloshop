import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    // CRA codebase uses JSX in .js files. Vite 8 oxc won't parse them.
    // This plugin intercepts .js files before vite:oxc and transforms them as .jsx.
    {
      name: 'jsx-in-js',
      enforce: 'pre',
      async transform(code, id) {
        if (/\.js$/.test(id) && !id.includes('node_modules')) {
          if (code.includes('</') || code.includes('/>') || /<[A-Z]/.test(code)) {
            const result = await transformWithOxc(code, id + '.jsx');
            return { code: result.code, map: result.map };
          }
        }
      },
    },
    react(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/components/ui/**', 'src/test/**', '**/*.d.ts'],
    },
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
