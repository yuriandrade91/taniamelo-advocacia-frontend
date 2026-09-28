/**
 * Tipos do domínio CNIS.
 *
 * O CNIS (Cadastro Nacional de Informações Sociais) é o extrato que o INSS
 * mantém do segurado: cada vínculo de trabalho e, quando existe, a
 * remuneração mês a mês. É o documento a partir do qual todo cálculo
 * previdenciário começa.
 *
 * ## Uma decisão que atravessa o arquivo inteiro
 *
 * Nada aqui usa `Date`. Competência é `"MM/yyyy"` e data é `"yyyy-MM-dd"`,
 * ambas como texto. `new Date("2010-03-01")` é meia-noite **UTC**; em UTC-3
 * isso é 29/02 ou 28/02 do mês anterior, e um vínculo que começa no dia 1º
 * passa a começar no mês anterior. Num cálculo de tempo de contribuição esse
 * deslize não dá erro: dá um resultado plausível e errado, que é o pior tipo.
 *
 * As contas de calendário ficam em `periods.ts`, com aritmética de dia
 * juliano — inteiros, sem fuso.
 */

/** `yyyy-MM-dd`. */
export type IsoDate = string;

/** `MM/yyyy` — a competência, unidade de tempo do CNIS. */
export type Competencia = string;

/**
 * Um vínculo (ou "relação previdenciária"): emprego, contribuição individual,
 * benefício, período de RPPS.
 */
export interface Vinculo {
  /** Nº de sequência no extrato — é como o usuário se refere à linha. */
  seq: number;
  /** CNPJ, CEI ou NIT do empregador, como veio no extrato. */
  codigoEmpregador?: string;
  /** Nome/origem do vínculo. */
  origem: string;
  dataInicio?: IsoDate;
  /** Ausente quando o vínculo está em aberto. */
  dataFim?: IsoDate;
  /** "Empregado", "Contribuinte Individual", "Empregado Doméstico"... */
  tipoFiliado?: string;
  /** Códigos como `PREC-MENOR-MIN`, `IREC-INDPEND`, `PEXT`. */
  indicadores: string[];
  /** Remunerações declaradas dentro deste vínculo. */
  remuneracoes: Remuneracao[];
}

export interface Remuneracao {
  competencia: Competencia;
  /** Em reais. O CNIS traz valores em moeda da época — ver `rmi.ts`. */
  valor: number;
  /** Indicadores da própria competência, quando houver. */
  indicadores: string[];
}

/**
 * Algo que o leitor viu e não soube tratar.
 *
 * Existe porque um parser de documento oficial **vai** encontrar linha fora do
 * padrão, e engolir em silêncio é como um cálculo perde três anos de vínculo
 * sem ninguém notar. Toda anomalia vira um item desta lista e aparece na tela.
 */
export interface ParseIssue {
  severity: "warning" | "error";
  message: string;
  /** Trecho do texto original, para a pessoa localizar no PDF. */
  excerpt?: string;
}

export interface CnisDocument {
  /** Nome do segurado, quando identificável no cabeçalho. */
  nome?: string;
  nit?: string;
  /** Data de nascimento — entra no cálculo de idade. */
  dataNascimento?: IsoDate;
  vinculos: Vinculo[];
  /**
   * Remunerações que o leitor não conseguiu prender a nenhum vínculo.
   * Não são descartadas: contam como aviso e ficam visíveis.
   */
  remuneracoesOrfas: Remuneracao[];
  issues: ParseIssue[];
}

export type Sexo = "M" | "F";
