"use client";

import { Skeleton } from "@heroui/react";

import {
  getSituationKeyByLabel,
  getSituationLabelByKey,
  type SituationKey,
} from "@/enums/situation/Situation";
import type { ClientSituationHistory } from "@/interfaces/client/Client.interface";
import { formatInstantDateBR } from "@/lib/format";
import { Pill } from "@/components/ui/feedback/Badges";
import { Timeline, TimelineItem, TimelineMeta } from "@/components/ui/list/Timeline";

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
 *
 * ## O desenho
 *
 * Uma linha do tempo: cada mudança é um nó num trilho vertical, da mais
 * recente para a mais antiga. A atual ganha destaque (cartão creme e nó
 * maior); as outras são linhas leves — etapa, de onde veio, quando e por quem.
 */

export type SituationHistorySectionProps = {
  items: ClientSituationHistory[];
  isLoading?: boolean;
  /** Quando a rota falhou — diferente de "nunca mudou de situação". */
  hasError?: boolean;
  /**
   * Índice `id do usuário -> nome`, de `useOfficeAuthors`. Vazio é
   * estado normal (atendente não lista usuários), não erro.
   */
  authors?: Record<string, string>;
};

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
  FORMULARIO_PREENCHIDO: "bg-gray-100/50 ring-gray-100/15",
  ANALISE_DOCUMENTAL: "bg-secondary ring-secondary/20",
  PLANEJAMENTO_EM_EXECUCAO: "bg-secondary ring-secondary/20",
  PLANEJAMENTO_CONCLUIDO: "bg-success ring-success/20",
  BENEFICIO_FUTURO: "bg-secondary ring-secondary/20",
  BENEFICIO_CONCLUIDO: "bg-success ring-success/20",
};

/** A API manda o rótulo ("Benefício concluído"); a cor é pela chave. */
const dotColor = (value?: string): string => {
  const key = (value && getSituationKeyByLabel(value)) || (value as SituationKey);
  return DOT_COLOR[key] ?? "bg-gray-100/50 ring-gray-100/15";
};

/** `Instant` → `dd/MM/yyyy`, no formato curto que a coluna comporta. */

export function SituationHistorySection({
  items,
  isLoading = false,
  hasError = false,
  authors = {},
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
    <Timeline label="Mudanças de situação">
      {items.map((entry, index) => {
        const isCurrent = index === 0;
        return (
          <TimelineItem
            key={entry.id}
            dotClassName={dotColor(entry.currentSituation)}
            isCurrent={isCurrent}
            isLast={index === items.length - 1}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`min-w-0 text-sm text-primary ${isCurrent ? "font-semibold" : "font-medium"}`}
              >
                {situationLabel(entry.currentSituation)}
              </span>
              {isCurrent && (
                <Pill tone="solid" weight="semibold">
                  atual
                </Pill>
              )}
              {entry.retrocesso && (
                <span title="Esta mudança voltou uma etapa no funil.">
                  <Pill tone="warning" weight="semibold">voltou</Pill>
                </span>
              )}
            </div>
            {/*
              "de …" só quando há anterior: a primeira mudança de um cliente
              nunca tem, e uma linha fixa com "—" não informaria nada.
            */}
            {entry.previousSituation && (
              <p className="text-xs text-gray-100">
                de {situationLabel(entry.previousSituation)}
              </p>
            )}
            <TimelineMeta
              date={formatInstantDateBR(entry.changedAt)}
              author={authors[entry.changedByUserId ?? ""]}
            />
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
