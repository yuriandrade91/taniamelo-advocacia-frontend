/**
 * Tabela de atualização monetária dos salários de contribuição.
 *
 * ## Por que este arquivo nasce vazio — de propósito
 *
 * A RMI é a média dos salários **corrigidos**. O fator de correção de cada
 * competência vem da tabela que o INSS publica por portaria, mês a mês, e ela
 * não está disponível em lugar nenhum de forma aberta e confiável: as
 * concorrentes tratam essa tabela como ativo e a mantêm atrás de login.
 *
 * Eu poderia derivá-la acumulando INPC. Seria errado. Entre 07/1994 e hoje a
 * correção passou por IPC-r, INPC e IGP-DI conforme o período, e cada troca
 * tem data e regra própria. Uma aproximação por INPC puro erraria os anos 90 e
 * o intervalo do IGP-DI — e erraria **pouco**, o suficiente para o número
 * parecer certo e ir parar numa petição.
 *
 * Então a escolha é: a tabela é **dado de entrada**, não invenção minha. Você
 * cola a tabela oficial uma vez (a mesma que já usa hoje), ela fica guardada, e
 * o cálculo passa a valer. Enquanto faltar fator para alguma competência, o
 * módulo **recusa** dar um número e diz exatamente quais meses faltam.
 *
 * Um valor "aproximado" de RMI não é meio serviço: é um número errado com
 * aparência de certo, e ninguém tem como desconfiar dele olhando a tela.
 *
 * ## Quando vier do backend
 *
 * O lugar certo desta tabela é o servidor, atualizado uma vez por mês para
 * todo o escritório. Enquanto isso, `loadFatores`/`saveFatores` guardam no
 * navegador de quem usa.
 */

import { competenciaToIndex } from "./periods";
import type { Competencia } from "./types";

/** `MM/aaaa` → fator multiplicativo. */
export type FatorTable = Record<Competencia, number>;

/** Competência a partir da qual a EC 103 manda considerar todos os salários. */
export const COMPETENCIA_INICIAL = "07/1994";
export const INDICE_INICIAL = competenciaToIndex(COMPETENCIA_INICIAL) as number;

/** Teto e piso previdenciários vigentes. Atualize junto com a portaria anual. */
export const TETO_INSS_2026 = 8475.55;
export const SALARIO_MINIMO_2026 = 1621.0;

export interface FatorTableMeta {
  /** Competência de referência da tabela — a data para a qual ela corrige. */
  referencia?: Competencia;
  /** De onde veio, escrito pela pessoa que colou. */
  fonte?: string;
  /** Quando foi colada. */
  importadaEm?: string;
}

export interface StoredFatores {
  meta: FatorTableMeta;
  fatores: FatorTable;
}

/**
 * Lê a tabela colada.
 *
 * Aceita as formas em que ela costuma sair de um PDF ou de uma planilha:
 * `07/1994 9,276961`, `07/1994;9,276961`, `07/1994<TAB>9.276961`. Ponto e
 * vírgula decimais são tratados como no resto do sistema — vírgula é decimal
 * em pt-BR, e um fator lido como 9276961 em vez de 9,276961 seria visível na
 * hora, mas 9.276 em vez de 9,276961 não seria.
 */
export function parseFatorTable(text: string): {
  fatores: FatorTable;
  ignoradas: string[];
} {
  const fatores: FatorTable = {};
  const ignoradas: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = /^(\d{2}\/\d{4})[\s;,|\t]+([\d.,]+)$/.exec(
      line.replace(/\s{2,}/g, " "),
    );
    if (!match) {
      ignoradas.push(line);
      continue;
    }

    const competencia = match[1];
    if (competenciaToIndex(competencia) === null) {
      ignoradas.push(line);
      continue;
    }

    const fator = parseFator(match[2]);
    if (fator === null || fator <= 0) {
      ignoradas.push(line);
      continue;
    }

    fatores[competencia] = fator;
  }

  return { fatores, ignoradas };
}

/**
 * `9,276961` → 9.276961; `9.276961` → 9.276961.
 *
 * O fator tem uma parte inteira pequena (1 a ~30) e muitas decimais, então a
 * regra é diferente da de dinheiro: se há vírgula, ela é o decimal e os pontos
 * são separador de milhar; sem vírgula, o ponto é o decimal. Aplicar aqui a
 * regra de `parseAmountBRL` transformaria `9.276961` em 9276961.
 */
export function parseFator(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const STORAGE_KEY = "cnis:fatores-atualizacao";

/**
 * Guarda no navegador de quem usa.
 *
 * É armazenamento por pessoa e por máquina — a colega ao lado não herda a
 * tabela. Não é o desenho certo a longo prazo (o certo é o servidor), mas é o
 * que existe hoje, e a tela diz isso em vez de deixar parecer que a tabela é
 * do escritório.
 */
export function saveFatores(stored: StoredFatores): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

export function loadFatores(): StoredFatores | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFatores;
    if (!parsed || typeof parsed.fatores !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFatores(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Navegador com armazenamento bloqueado — nada a fazer.
  }
}
