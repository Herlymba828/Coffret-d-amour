import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Le code source est en NodeNext : les imports portent l'extension `.js`
    // alors que les fichiers sont des `.ts`. On rétablit la correspondance.
    extensions: ['.ts', '.js', '.mjs', '.json'],
  },
  plugins: [
    {
      name: 'resolve-nodenext-js-to-ts',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (!importer || !source.startsWith('.') || !source.endsWith('.js')) return null;
        const resolved = await this.resolve(source.replace(/\.js$/, '.ts'), importer, {
          skipSelf: true,
        });
        return resolved?.id ?? null;
      },
    },
  ],
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
