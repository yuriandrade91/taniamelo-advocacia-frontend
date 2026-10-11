import type { ReactNode } from "react";

/**
 * Uma aba do cadastro de cliente.
 *
 * A página monta a lista de seções — título, selo e conteúdo — e as abas só
 * desenham. Nenhuma peça daqui conhece cliente, service nem validação.
 */
/** Estado de uma seção — o selo do cabeçalho e o ponto na aba. */
type FormSectionStatus =
  /** Ainda não existe cliente: a seção depende de `/clients/{id}`. */
  | "locked"
  /** Há campos obrigatórios por preencher. */
  | "pending"
  /** Preenchida e válida, ainda não enviada. */
  | "ready"
  /** Já gravada no servidor. */
  | "saved";

export const STATUS_STYLES: Record<FormSectionStatus, string> = {
  locked: "bg-light-gray/70 text-gray-100",
  pending: "bg-light-secondary text-secondary",
  ready: "bg-light-green text-success",
  saved: "bg-light-green text-success",
};

export type ClientFormSection = {
  id: string;
  title: string;
  /** Uma frase sob o título: o que a seção pede e por quê. */
  description?: string;
  icon?: ReactNode;
  status: FormSectionStatus;
  statusLabel: string;
  /** Obrigatórios vazios nesta seção — o número que aparece na aba. */
  missing?: number;
  /**
   * Confere os obrigatórios da seção e mostra os erros; `false` segura a
   * pessoa nesta aba (as abas não deixam avançar). Sem ele, a seção não trava.
   */
  validate?: () => boolean;
  content: ReactNode;
};

/**
 * Pedido de foco numa aba — "mostre esta". `seq` existe para que pedir a
 * mesma aba duas vezes seguidas (dois erros de validação no mesmo lugar)
 * ainda troque para ela, mesmo que a pessoa tenha saído dali no meio tempo.
 */
export type SectionFocus = { keys: readonly string[]; seq: number };
