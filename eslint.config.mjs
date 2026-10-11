import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * O `eslint-config-next` 16 já exporta flat config. O `FlatCompat` que vinha
 * do setup inicial reprocessava essas configs como se fossem `.eslintrc` e
 * quebrava com "Converting circular structure to JSON" — o `pnpm lint` não
 * rodava.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    ".pnpm-store/**",
  ]),
]);
