/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Cognito only redirects to allowlisted origins, so keep the port fixed (strictPort); PORT picks one your app client allows.
export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; the workflow sets BASE_PATH. The sign-in redirect follows it (src/sdk.ts).
  base: process.env.BASE_PATH ?? '/',
  server: { port: Number(process.env.PORT ?? 4206), strictPort: true },
  resolve: { conditions: ['browser'] },
  // The SDK imports ts-results (CommonJS) by name; inlining lets Vite handle that interop in tests.
  test: { server: { deps: { inline: ['@bizzdesign/sdk-bundle'] } } },
});
