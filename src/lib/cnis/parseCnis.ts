/**
 * Leitor do extrato CNIS.
 *
 * ## Por que é orientado a padrão, e não a coluna
 *
 * O CNIS é uma tabela num PDF, e extrair texto de PDF não devolve tabela:
 * devolve linhas cuja ordem e espaçamento dependem do gerador, da versão do
 * extrato e da biblioteca que leu. Um parser que conte colunas ou posições de
 * caractere funciona com o primeiro arquivo testado e quebra no segundo.
 *
 * Este aqui procura **formas reconhecíveis** — data `dd/MM/aaaa`, competência
 * `MM/aaaa`, dinheiro `1.234,56`, CNPJ, código de indicador — e monta os
 * registros a partir delas. Não é infalível; é diagnosticável.
 *
 * ## O princípio que governa o arquivo
 *
 * **Nada é descartado em silêncio.** Toda linha que parecia significar algo e
 * não coube em lugar nenhum vira um `ParseIssue` que a tela mostra. Um leitor
 * que perde três anos de vínculo sem avisar produz um cálculo confiante e
 * errado, e não há como a pessoa desconfiar olhando o resultado.
 *
 * Por isso a tela também exige conferência: o extrato lido fica ao lado do
 * total, para bater contra o PDF. O leitor adianta a digitação; não substitui
 * a leitura do documento.
 */

import type {
  CnisDocument,
  ParseIssue,
  Remuneracao,
  Vinculo,
} from "./types";
import { isValidIsoDate } from "./periods";

/** `dd/MM/aaaa` em qualquer lugar da linha. */
const DATE_RE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
/** `MM/aaaa` que não faça parte de uma data completa. */
const COMPETENCIA_RE = /(?<!\d\/)\b(\d{2})\/(\d{4})\b(?!\/)/g;
/** `1.234,56` ou `800,00` — dinheiro em pt-BR, sempre com centavos no CNIS. */
const MONEY_RE = /\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g;
/**
 * Indicador do CNIS.
 *
 * Exige o hífen — `PREC-MENOR-MIN`, `IREC-INDPEND`, `PADM-EMPR`. A primeira
 * versão aceitava qualquer palavra maiúscula de 4+ letras, e o resultado foi
 * que "METALURGICA EXEMPLO LTDA" virou dois indicadores inventados e um nome
 * de empresa reduzido a "LTDA". Razão social é maiúscula inteira no CNIS: não
 * há forma que a distinga de um código, só a lista de códigos.
 */
const INDICADOR_RE = /\b[A-Z]{1,}(?:-[A-Z0-9]{2,})+\b/g;

/** Os poucos indicadores reais sem hífen. Tudo mais é razão social. */
const INDICADORES_SIMPLES = new Set([
  "PEXT",
  "PRPPS",
  "PMEI",
  "PADM",
  "PANOT",
  "PVINC",
  "PRUR",
  "IEXT",
  "IREC",
  "IGNORADO",
]);

/** Palavras que parecem indicador mas são cabeçalho ou legenda. */
const NAO_INDICADOR = new Set([
  "CNIS",
  "INSS",
  "NIT",
  "CPF",
  "CNPJ",
  "SEQ",
  "EMP",
  "LTDA",
  "MEI",
  "EPP",
  "EIRELI",
  "ME",
  "SA",
  "RGPS",
  "RPPS",
  "DATA",
  "TIPO",
  "ORIGEM",
  "FILIADO",
  "INDICADORES",
  "REMUNERACOES",
  "REMUNERAÇÕES",
  "COMPETENCIA",
  "COMPETÊNCIA",
  "REMUNERACAO",
  "REMUNERAÇÃO",
  "VINCULO",
  "VÍNCULO",
  "RELACOES",
  "RELAÇÕES",
  "PREVIDENCIARIAS",
  "PREVIDENCIÁRIAS",
  "LEGENDA",
  "EXTRATO",
  "CADASTRO",
  "NACIONAL",
  "INFORMACOES",
  "INFORMAÇÕES",
  "SOCIAIS",
]);

const dmyToIso = (day: string, month: string, year: string): string | null => {
  const iso = `${year}-${month}-${day}`;
  return isValidIsoDate(iso) ? iso : null;
};

const parseMoney = (raw: string): number =>
  Number(raw.replace(/\./g, "").replace(",", "."));

/**
 * Normaliza a linha sem destruir informação: colapsa espaço múltiplo (o PDF
 * usa espaço como separador de coluna, em quantidade variável) e tira o
 * caractere de tabulação.
 */
const normalize = (line: string): string =>
  line.replace(/\t/g, " ").replace(/\s{2,}/g, "  ").trim();

const extractIndicadores = (text: string): string[] => {
  const comHifen = text.match(INDICADOR_RE) ?? [];
  const simples = (text.match(/\b[A-Z]{4,}\b/g) ?? []).filter((token) =>
    INDICADORES_SIMPLES.has(token),
  );
  return [...new Set([...comHifen, ...simples])].filter(
    (token) => !NAO_INDICADOR.has(token),
  );
};

/** Cabeçalhos que marcam o começo de uma seção de remunerações. */
const isRemuneracoesHeader = (line: string): boolean =>
  /remunera[çc][õo]es/i.test(line) && !MONEY_RE.test(line);

const isLegendaHeader = (line: string): boolean =>
  /legenda|indicadores\s*:/i.test(line);

/**
 * Uma linha de vínculo: começa com o número de sequência e traz pelo menos uma
 * data. O `Seq.` é o que amarra remuneração a vínculo quando o extrato lista
 * as remunerações em bloco separado.
 */
const VINCULO_RE = /^(\d{1,3})[\s.\-)]+(.*)$/;

export function parseCnis(text: string): CnisDocument {
  const issues: ParseIssue[] = [];
  const vinculos: Vinculo[] = [];
  const remuneracoesOrfas: Remuneracao[] = [];

  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map(normalize).filter((line) => line.length > 0);

  if (lines.length === 0) {
    issues.push({
      severity: "error",
      message:
        "O texto está vazio. Se o PDF veio de digitalização, ele não tem camada de texto e precisa ser o arquivo baixado do Meu INSS, não uma foto ou cópia escaneada.",
    });
    return { vinculos, remuneracoesOrfas, issues };
  }

  const header = parseHeader(lines);
  let current: Vinculo | null = null;
  let dentroDaLegenda = false;

  for (const line of lines) {
    // A legenda de indicadores fica no fim e é cheia de códigos e datas de
    // exemplo — ler como dado inventaria vínculos que não existem.
    if (isLegendaHeader(line)) {
      dentroDaLegenda = true;
      continue;
    }
    if (dentroDaLegenda) continue;

    if (isRemuneracoesHeader(line)) {
      const seq = /(?:seq\.?|v[íi]nculo)\s*:?\s*(\d{1,3})/i.exec(line)?.[1];
      if (seq) {
        const found = vinculos.find((v) => v.seq === Number(seq));
        if (found) current = found;
      }
      continue;
    }

    const remuneracao = tryParseRemuneracao(line);
    if (remuneracao) {
      if (current) current.remuneracoes.push(remuneracao);
      else remuneracoesOrfas.push(remuneracao);
      continue;
    }

    const vinculo = tryParseVinculo(line);
    if (vinculo) {
      vinculos.push(vinculo);
      current = vinculo;
      continue;
    }
  }

  if (vinculos.length === 0) {
    issues.push({
      severity: "error",
      message:
        "Nenhum vínculo reconhecido. Confira se o extrato é a versão com Relações Previdenciárias e Remunerações — o extrato previdenciário simples não traz as datas dos vínculos.",
      excerpt: lines.slice(0, 3).join(" / "),
    });
  }

  if (remuneracoesOrfas.length > 0) {
    issues.push({
      severity: "warning",
      message: `${remuneracoesOrfas.length} remunerações não puderam ser ligadas a um vínculo. Elas contam na carência, mas confira a que vínculo pertencem.`,
    });
  }

  for (const vinculo of vinculos) {
    if (!vinculo.dataInicio) {
      issues.push({
        severity: "warning",
        message: `O vínculo ${vinculo.seq} (${vinculo.origem}) ficou sem data de início e não entra na contagem de tempo.`,
      });
    }
    if (vinculo.dataInicio && vinculo.dataFim && vinculo.dataFim < vinculo.dataInicio) {
      issues.push({
        severity: "error",
        message: `O vínculo ${vinculo.seq} tem fim anterior ao início (${vinculo.dataInicio} → ${vinculo.dataFim}). Provável troca de coluna na leitura.`,
      });
    }
  }

  return { ...header, vinculos, remuneracoesOrfas, issues };
}

/**
 * Cabeçalho: nome, NIT e nascimento.
 *
 * A data de nascimento é a que mais importa — sem ela não há idade, e sem
 * idade quatro das cinco regras não podem ser avaliadas. Quando não vem, a
 * tela pede à mão em vez de chutar.
 */
function parseHeader(lines: string[]): Pick<
  CnisDocument,
  "nome" | "nit" | "dataNascimento"
> {
  const head = lines.slice(0, 25);
  const result: Pick<CnisDocument, "nome" | "nit" | "dataNascimento"> = {};

  for (const line of head) {
    const nit = /\b(\d{3}\.\d{5}\.\d{2}-\d)\b/.exec(line);
    if (nit && !result.nit) result.nit = nit[1];

    const nascimento =
      /(?:data\s+de\s+)?nascimento\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(line);
    if (nascimento && !result.dataNascimento) {
      const iso = dmyToIso(nascimento[1], nascimento[2], nascimento[3]);
      if (iso) result.dataNascimento = iso;
    }

    const nome = /nome\s*:?\s*([A-ZÀ-Ÿ][A-ZÀ-Ÿ\s.']{5,})$/i.exec(line);
    if (nome && !result.nome) result.nome = nome[1].trim();
  }

  return result;
}

/**
 * Linha de remuneração: competência + valor, e nada de data completa.
 *
 * A exigência de "nenhuma data `dd/MM/aaaa`" é o que separa esta linha de uma
 * linha de vínculo que por acaso tenha um valor — sem ela, um vínculo com
 * salário na mesma linha viraria remuneração e sumiria da contagem de tempo.
 */
export function tryParseRemuneracao(line: string): Remuneracao | null {
  DATE_RE.lastIndex = 0;
  if (DATE_RE.test(line)) return null;

  COMPETENCIA_RE.lastIndex = 0;
  const competenciaMatch = COMPETENCIA_RE.exec(line);
  if (!competenciaMatch) return null;

  const month = Number(competenciaMatch[1]);
  const year = Number(competenciaMatch[2]);
  if (month < 1 || month > 12) return null;
  if (year < 1930 || year > 2100) return null;

  MONEY_RE.lastIndex = 0;
  const money = line.match(MONEY_RE);
  if (!money || money.length === 0) return null;

  return {
    competencia: `${competenciaMatch[1]}/${competenciaMatch[2]}`,
    // O primeiro valor é a remuneração; os seguintes, quando existem, são
    // décimo terceiro ou valores de outra coluna do mesmo bloco.
    valor: parseMoney(money[0]),
    indicadores: extractIndicadores(line),
  };
}

/**
 * Linha de vínculo: número de sequência no começo e pelo menos uma data.
 *
 * Duas datas → início e fim. Uma só → vínculo em aberto, e o fim fica
 * indefinido de propósito: `tempoContribuicao` fecha na data-base e marca o
 * período como "até hoje", em vez de o parser inventar uma data.
 */
export function tryParseVinculo(line: string): Vinculo | null {
  const match = VINCULO_RE.exec(line);
  if (!match) return null;

  const seq = Number(match[1]);
  const rest = match[2];

  DATE_RE.lastIndex = 0;
  const dates: string[] = [];
  let dateMatch: RegExpExecArray | null;
  while ((dateMatch = DATE_RE.exec(rest)) !== null) {
    const iso = dmyToIso(dateMatch[1], dateMatch[2], dateMatch[3]);
    if (iso) dates.push(iso);
  }
  if (dates.length === 0) return null;

  const codigo = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{5}\.\d{2}-\d)\b/.exec(
    rest,
  )?.[1];

  /**
   * A origem é o que sobra depois de tirar datas, código e indicadores. Um
   * nome de empresa não tem forma previsível — identificá-lo por exclusão é
   * mais robusto do que tentar reconhecê-lo.
   */
  const tipoFiliado =
    /(Empregado Dom[ée]stico|Empregado|Contribuinte Individual|Trabalhador Avulso|Segurado Especial|Facultativo)/i.exec(
      rest,
    )?.[1];

  const indicadores = extractIndicadores(rest);

  let origem = rest
    .replace(DATE_RE, " ")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, " ")
    .replace(/\b\d{3}\.\d{5}\.\d{2}-\d\b/g, " ");
  for (const indicador of indicadores) {
    origem = origem.split(indicador).join(" ");
  }
  if (tipoFiliado) origem = origem.split(tipoFiliado).join(" ");
  origem = origem.replace(/\s{2,}/g, " ").trim();

  return {
    seq,
    codigoEmpregador: codigo,
    origem: origem || `Vínculo ${seq}`,
    dataInicio: dates[0],
    dataFim: dates.length > 1 ? dates[1] : undefined,
    tipoFiliado,
    indicadores,
    remuneracoes: [],
  };
}
