/**
 * Quais documentos pertencem a cada categoria do INSS.
 *
 * ## O que isto é, e o que não é
 *
 * É **referência**, não dado. O que o backend guarda de um arquivo é a
 * categoria (`DocumentType`, `@NotBlank`) e as observações — não existe campo
 * para "qual documento dentro da categoria". Então esta lista não vira um
 * segundo `select` que finge gravar algo: ela aparece como orientação, ao lado
 * do campo, dizendo o que aquela categoria espera.
 *
 * Enfiar o nome do documento dentro de `notes` seria a saída fácil e a errada:
 * viraria convenção não escrita, tomaria o campo que existe para observação de
 * verdade, e nenhuma consulta conseguiria filtrar por ele depois. Se um dia
 * valer a pena guardar, é campo novo no backend — não gambiarra no que já tem.
 *
 * ## Por que fica perto do upload
 *
 * A pergunta que esta lista responde — "o que eu preciso pedir para o cliente
 * nesta categoria?" — aparece na hora de anexar. Uma página separada de
 * consulta seria consultada uma vez e esquecida.
 *
 * As anotações de `requisitos` são o que costuma fazer o INSS indeferir: PPP
 * sem agente nocivo, laudo médico sem prazo. Ficam junto do item porque é ali
 * que a pessoa está olhando.
 */

import type { DocumentTypeKey } from "@/enums/documentType/DocumentType";

export interface DocumentCatalogEntry {
  /** Subtítulo, quando a categoria cobre mais de uma situação. */
  grupo?: string;
  itens: string[];
}

export interface DocumentCatalogSection {
  /** Para que serve a categoria, quando não é óbvio pelo nome. */
  finalidade?: string;
  grupos: DocumentCatalogEntry[];
  /** O que os documentos precisam demonstrar para servirem de prova. */
  requisitos?: string[];
}

export const DOCUMENT_CATALOG: Partial<
  Record<DocumentTypeKey, DocumentCatalogSection>
> = {
  IDENTIFICACAO_SEGURADO: {
    grupos: [
      {
        itens: [
          "RG ou documento oficial com foto",
          "CNH",
          "Passaporte",
          "Carteira de Trabalho (física, quando aplicável)",
          "Documento de órgão de classe",
          "DNI ou outro documento com fé pública",
        ],
      },
    ],
  },

  CADASTRAIS_DADOS_PESSOAIS: {
    finalidade: "Regularização e atualização do CNIS.",
    grupos: [
      {
        itens: [
          "CPF",
          "Certidão de nascimento, casamento ou óbito",
          "Título de eleitor",
          "CTPS",
          "Comprovante de inscrição (NIT / PIS / PASEP / NIS)",
          "Declaração de endereço (autodeclaratória)",
        ],
      },
    ],
  },

  VINCULO_TEMPO_CONTRIBUICAO: {
    grupos: [
      {
        grupo: "Empregado / vínculo CLT",
        itens: [
          "CTPS",
          "Ficha ou livro de registro de empregados",
          "Contrato de trabalho",
          "Holerites e recibos",
          "Extrato do FGTS",
          "Declarações do empregador",
          "Recibos do eSocial",
        ],
      },
    ],
  },

  CONTRIBUINTE_INDIVIDUAL_FACULTATIVO: {
    grupos: [
      {
        itens: [
          "Carnês (GPS)",
          "Comprovantes de pagamento",
          "Declarações de atividade",
          "Documentos que comprovem o exercício profissional",
        ],
      },
    ],
  },

  SEGURADO_ESPECIAL: {
    grupos: [
      {
        grupo: "Rural",
        itens: [
          "Autodeclaração rural",
          "Documentos do grupo familiar",
          "Bloco de produtor rural",
          "Notas fiscais",
          "Contratos de arrendamento ou parceria",
          "Certidões públicas",
          "Cadastro em órgãos oficiais",
        ],
      },
    ],
  },

  ATIVIDADE_ESPECIAL: {
    finalidade: "Insalubridade e periculosidade.",
    grupos: [
      {
        itens: [
          "PPP (Perfil Profissiográfico Previdenciário)",
          "LTCAT",
          "Formulários antigos (SB-40, DSS-8030 e equivalentes)",
          "CTPS e documentos complementares",
          "Laudos técnicos",
        ],
      },
    ],
    requisitos: [
      "agente nocivo",
      "intensidade ou concentração",
      "habitualidade e permanência da exposição",
    ],
  },

  DOCUMENTOS_MEDICOS: {
    finalidade: "Benefícios por incapacidade.",
    grupos: [
      {
        itens: [
          "Atestados médicos",
          "Laudos",
          "Exames",
          "Relatórios médicos",
          "Prontuários",
        ],
      },
    ],
    requisitos: ["a incapacidade", "a duração", "o nexo com a atividade"],
  },

  DEPENDENTES_RELACAO_FAMILIAR: {
    finalidade: "Pensão por morte, salário-família.",
    grupos: [
      {
        itens: [
          "Certidão de casamento",
          "Certidão de nascimento",
          "Declaração de união estável",
          "Documentos que comprovem dependência econômica",
        ],
      },
    ],
  },

  JUDICIAIS_ADMINISTRATIVOS: {
    grupos: [
      {
        itens: [
          "Sentenças trabalhistas",
          "Certidão de tempo de contribuição (CTC)",
          "Justificação administrativa",
          "Processos administrativos anteriores",
        ],
      },
    ],
  },

  DECLARACOES_AUTODECLARACOES: {
    grupos: [
      {
        itens: [
          "Declaração de exercício de atividade",
          "Declaração de não exercício (facultativo)",
          "Autodeclaração rural",
          "Declaração de endereço",
        ],
      },
    ],
  },
};

/** Todos os itens de uma categoria, achatados — para contagem e busca. */
export const itensDaCategoria = (key: DocumentTypeKey): string[] =>
  (DOCUMENT_CATALOG[key]?.grupos ?? []).flatMap((grupo) => grupo.itens);

/** Quantos documentos a categoria lista. `OUTROS` não lista nenhum. */
export const totalDeItens = (key: DocumentTypeKey): number =>
  itensDaCategoria(key).length;
