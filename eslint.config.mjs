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
  // O erro do axios leva o corpo enviado (senha do INSS, CPF): no console, vaza.
  // Falha de requisição quem conta é o interceptor, com o toast.
  { rules: { "no-console": "error" } },
  // Promessa esquecida: a falha some sem ninguém ver. Só em `src`, porque ler
  // os tipos custa tempo; `void` diz que o esquecimento é de propósito.
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    ".pnpm-store/**",
    "coverage/**",
  ]),
]);
