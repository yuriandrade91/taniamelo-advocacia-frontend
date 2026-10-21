import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Configuração dos testes de unidade.
 *
 * Dois projetos, pelo que o teste precisa:
 * - `unit` (`*.test.ts`): função pura — validação, conversão de payload,
 *   paginação. Ambiente `node`, sem DOM: é rápido e não finge um navegador
 *   que o teste não usa.
 * - `dom` (`*.test.tsx`): componente e hook, desenhados com a Testing Library
 *   num `jsdom`. O que se afirma é o que a pessoa vê e faz (texto, papel,
 *   clique), não a árvore interna.
 *
 * O alias `@` precisa ser repetido aqui: o Vitest não lê `paths` do
 * `tsconfig.json`.
 */
const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

/**
 * O `exports` do @heroui/react declara só a condição `import`. Em ambiente
 * node o Vitest resolve pelas condições de servidor, não acha nenhuma e
 * falha com *No "exports" main defined* — derrubando o arquivo inteiro,
 * mesmo quando o teste é de função pura e só esbarra na biblioteca por
 * causa de um import em cadeia (payloads → sections → @heroui/react).
 *
 * Declarar `import` explicitamente resolve. É o que o Next já faz no build.
 */
const conditions = ["import", "module", "browser", "default"];

export default defineConfig({
  resolve: { alias, conditions },
  // O Vitest transforma os módulos pelo pipeline SSR do Vite, que tem a sua
  // PRÓPRIA lista de condições — `resolve.conditions` acima não a alcança.
  ssr: { resolve: { conditions } },
  test: {
    // Telas inteiras no jsdom pesam: com um worker por núcleo, disputam a CPU
    // e os testes de tela estouram o tempo. Metade dos núcleos rende mais.
    maxWorkers: "50%",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["tests/unit/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/unit/setup/dom.ts"],
          // Telas inteiras montam no jsdom: com a suíte toda em paralelo (e a
          // cobertura instrumentando), um teste de tela passa dos 5 s padrão.
          testTimeout: 60_000,
        },
      },
    ],
    /**
     * Relatório `lcov`, que é o formato que o SonarQube lê (apontado em
     * `sonar-project.properties`). Sem ele o painel mostra 0% de cobertura —
     * não por ausência de teste, mas por ausência de relatório.
     *
     * `include` cobre `src/` inteiro: arquivo que nenhum teste toca entra com
     * 0%, como o Sonar o conta. Medir só o que os testes carregam daria um
     * número bonito que o painel desmente.
     */
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts"],
    },
  },
});
