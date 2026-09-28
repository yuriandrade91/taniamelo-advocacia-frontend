"use client";

import { Skeleton } from "@heroui/react";

import {
  getSituationLabelByKey,
  type SituationKey,
} from "@/enums/situation/Situation";
import type { ClientSituationHistory } from "@/interfaces/client/Client.interface";

/**
 * Histórico de situações do cliente.
 *
 * ## Só leitura, e é assim mesmo
 *
 * O histórico é gravado pelo backend a cada mudança de situação — não há rota
 * para criar, editar ou apagar um registro, e não deveria haver. Um histórico
 * que se pode editar não é histórico: é mais um campo.
 *
 * ## O que o registro traz
 *
 * `currentSituation` é a situação **depois** da mudança e `previousSituation` a
 * de antes — as duas vêm do backend, então a linha diz "de X para Y" sem
 * inferir nada. Inferir a anterior a partir do registro seguinte funcionaria na
 * lista completa e mentiria na primeira página de uma lista paginada; por isso
 * só passou a existir quando o DTO passou a trazer o campo.
 *
 * `retrocesso` vem calculado: o funil tem ordem, e o backend compara a posição
 * das duas situações. Recalcular aqui colocaria a mesma regra em dois lugares,
 * e um dos dois ficaria para trás.
 *
 * `changedByUserId` é um UUID. Com `GET /users` existindo, quem monta esta
 * seção passa um índice `id -> nome` em `autores`; sem índice — atendente não
 * tem acesso à rota — a linha fica sem autoria, como sempre foi. O que não
 * acontece em nenhum caso é mostrar o UUID cru.
 */

export type SituationHistorySectionProps = {
  items: ClientSituationHistory[];
  isLoading?: boolean;
  /** Quando a rota falhou — diferente de "nunca mudou de situação". */
  hasError?: boolean;
  /**
   * Índice `id do usuário -> nome`, de `useAutoresDoEscritorio`. Vazio é
   * estado normal (atendente não lista usuários), não erro.
   */
  autores?: Record<string, string>;
};

/**
 * `new Date` é correto aqui: `changedAt` é `Instant`, tem fuso, e o certo é
 * mostrar no horário de quem olha. É o oposto do que fazemos com `LocalDate`,
 * onde converter é justamente o erro.
 */
/** A API pode devolver a chave ou o rótulo; a tela mostra sempre o rótulo. */
const situationLabel = (value?: string): string => {
  if (!value) return "—";
  return getSituationLabelByKey(value as SituationKey) ?? value;
};

/**
 * Cor da bolinha: segue a **etapa**, não a posição na lista.
 *
 * Verde para as etapas concluídas, dourado da marca para as em andamento,
 * cinza para o começo do fluxo. É a mesma cor toda vez que aquela etapa
 * aparece, em qualquer cliente — colorir por "primeira da lista" faria a mesma
 * etapa mudar de cor conforme o que veio depois.
 */
const DOT_COLOR: Record<SituationKey, string> = {
  FORMULARIO_PREENCHIDO: "bg-gray-100/50",
  ANALISE_DOCUMENTAL: "bg-secondary",
  PLANEJAMENTO_EM_EXECUCAO: "bg-secondary",
  PLANEJAMENTO_CONCLUIDO: "bg-success",
  BENEFICIO_FUTURO: "bg-secondary",
  BENEFICIO_CONCLUIDO: "bg-success",
};

const dotColor = (value?: string): string =>
  DOT_COLOR[value as SituationKey] ?? "bg-gray-100/50";

function CalendarGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
    >
      <rect x="2" y="3.5" width="12" height="10.5" rx="2" />
      <path d="M2 6.5h12M5.5 2v3M10.5 2v3" strokeLinecap="round" />
    </svg>
  );
}

/** `Instant` → `dd/MM/yyyy`, no formato curto que a coluna comporta. */
const formatShortDate = (iso?: string): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export function SituationHistorySection({
  items,
  isLoading = false,
  hasError = false,
  autores = {},
}: SituationHistorySectionProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-6 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <p className="text-sm text-gray-100">
        Não foi possível carregar o histórico. As demais informações da ficha
        continuam válidas.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-100">
        Nenhuma mudança registrada — o cliente segue na situação em que foi
        cadastrado.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((entry, index) => {
        const autor = autores[entry.changedByUserId ?? ""];
        return (
          <li key={entry.id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${dotColor(entry.currentSituation)}`}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-primary">
                {situationLabel(entry.currentSituation)}
              </span>
              {entry.retrocesso && (
                <span
                  title="Esta mudança voltou uma etapa no funil."
                  className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning"
                >
                  voltou
                </span>
              )}
              {index === 0 && (
                <span className="shrink-0 rounded-full bg-light-secondary px-1.5 py-0.5 text-[10px] text-secondary">
                  atual
                </span>
              )}
              <span className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-gray-100">
                <CalendarGlyph />
                {formatShortDate(entry.changedAt)}
              </span>
            </div>
            {/*
              Segunda linha só quando há o que dizer. Uma linha fixa com "—"
              em toda entrada dobraria a altura da coluna para não informar
              nada — e a primeira mudança de um cliente nunca tem anterior.
            */}
            {(entry.previousSituation || autor) && (
              <p className="pl-[18px] text-xs text-gray-100">
                {entry.previousSituation
                  ? `de ${situationLabel(entry.previousSituation)}`
                  : null}
                {entry.previousSituation && autor ? " · " : null}
                {autor ? `por ${autor}` : null}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
