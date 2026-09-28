// Espelha com.lawfirm.law.firm.model.DocumentType (backend) — 11 valores.
import { createEnum } from "@/lib/enumFactory";

const DOCUMENT_TYPE_ENTRIES = [
  ["IDENTIFICACAO_SEGURADO", "Documentos de identificação do segurado"],
  ["CADASTRAIS_DADOS_PESSOAIS", "Documentos cadastrais / dados pessoais"],
  ["VINCULO_TEMPO_CONTRIBUICAO", "Documentos de vínculo e tempo de contribuição"],
  ["CONTRIBUINTE_INDIVIDUAL_FACULTATIVO", "Contribuinte individual / facultativo"],
  ["SEGURADO_ESPECIAL", "Segurado especial"],
  ["ATIVIDADE_ESPECIAL", "Atividade especial"],
  ["DOCUMENTOS_MEDICOS", "Documentos médicos"],
  ["DEPENDENTES_RELACAO_FAMILIAR", "Dependentes e relação familiar"],
  ["JUDICIAIS_ADMINISTRATIVOS", "Documentos judiciais e administrativos"],
  ["DECLARACOES_AUTODECLARACOES", "Declarações e autodeclarações"],
  ["OUTROS", "Outros"],
] as const;

const documentType = createEnum(DOCUMENT_TYPE_ENTRIES);

export type DocumentTypeKey = (typeof DOCUMENT_TYPE_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type DocumentTypeLabel = (typeof DOCUMENT_TYPE_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type DocumentTypeInput = DocumentTypeKey | DocumentTypeLabel;

export const DocumentTypeOptions = documentType.optionsWithId;
export const DocumentTypeLabelByKey = documentType.labelByKey;
export const getDocumentTypeKeyByLabel = documentType.getKeyByLabel;
export const getDocumentTypeLabelByKey = documentType.getLabelByKey;

export { DOCUMENT_TYPE_ENTRIES };
