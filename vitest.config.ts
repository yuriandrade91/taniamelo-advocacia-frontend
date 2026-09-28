import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Configuração dos testes de unidade.
 *
 * Escopo deliberado: apenas **funções puras** (validação, conversão de
 * payload, paginação). Não há `environment: "jsdom"` porque não testamos
 * componentes aqui — testar árvore React exigiria @testing-library e um setup
 * bem maior, e o retorno está nas regras de negócio, não na renderização.
 *
 * O alias `@` precisa ser repetido aqui: o Vitest não lê `paths` do
 * `tsconfig.json`.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    /**
     * O `exports` do @heroui/react declara só a condição `import`. Em ambiente
     * node o Vitest resolve pelas condições de servidor, não acha nenhuma e
     * falha com *No "exports" main defined* — derrubando o arquivo inteiro,
     * mesmo quando o teste é de função pura e só esbarra na biblioteca por
     * causa de um import em cadeia (payloads → sections → @heroui/react).
     *
     * Declarar `import` explicitamente resolve. É o que o Next já faz no build.
     */
    conditions: ["import", "module", "browser", "default"],
  },
  ssr: {
    // O Vitest transforma os módulos pelo pipeline SSR do Vite, que tem a sua
    // PRÓPRIA lista de condições — `resolve.conditions` acima não a alcança.
    resolve: {
      conditions: ["import", "module", "browser", "default"],
    },
  },
});
