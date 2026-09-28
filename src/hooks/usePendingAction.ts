"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@heroui/react";
import { UndoCountdown } from "@/components/ui/feedback/UndoCountdown";
import type { PendingKind, PendingMap } from "@/lib/pendingActions";

/**
 * Janela de desfazer para ações destrutivas.
 *
 * A API da agenda não tem como reverter concluir/cancelar/excluir: o
 * `AppointmentRequestDTO` não carrega `status` (logo o PUT não volta um
 * compromisso para "Agendado") e o delete é soft delete sem rota de restore —
 * depois dele todo endpoint responde 404 para aquele id. Um "Desfazer" que
 * chamasse a API depois do fato só poderia falhar.
 *
 * Então a ordem se inverte: a tela muda na hora, a requisição espera. Durante
 * a janela nada foi enviado — desfazer é só cancelar um `setTimeout`. É o
 * modelo do "Desfazer envio" do Gmail, e cobre o caso real (clique errado)
 * sem depender de backend.
 *
 * O preço, que é real: enquanto a janela corre a ação não está persistida.
 * Fechar a aba no meio perde. Por isso há flush no unmount e aviso no
 * `beforeunload` — ver `flush`.
 */

/** Tempo entre o clique e o disparo da requisição. */
export const UNDO_WINDOW_MS = 5000;

export type ScheduleInput = {
  /** Chave lógica — o id do compromisso. */
  key: string;
  /** Como a linha deve aparecer enquanto a janela corre. */
  kind: PendingKind;
  /** Texto do toast (ex.: "Compromisso concluído."). */
  message: string;
  /**
   * Variante visual do toast. Antes da janela de desfazer estas três ações
   * caíam no `successMessage` do interceptor, que chama `toast.success` — daí
   * o padrão ser `success`: sem isto o toast nasce na variante `default`, sem
   * cor e sem ícone, que foi exatamente o estilo que se perdeu na primeira
   * versão desta janela.
   */
  variant?: "default" | "accent" | "success" | "warning" | "danger";
  /** A requisição de fato. Só roda se a janela expirar sem desfazer. */
  commit: () => Promise<unknown>;
  /** Roda depois do commit, com sucesso ou falha — normalmente `refresh`. */
  onSettled?: () => void;
};

type Entry = ScheduleInput & { timer: ReturnType<typeof setTimeout>; toastKey: string };

export function usePendingAction() {
  const entriesRef = useRef<Map<string, Entry>>(new Map());
  /** Espelho em estado, só para a tela reagir. O ref é a fonte da verdade. */
  const [pending, setPending] = useState<PendingMap>(new Map());

  const sync = useCallback(() => {
    const next = new Map<string, PendingKind>();
    for (const [key, entry] of entriesRef.current) next.set(key, entry.kind);
    setPending(next);
  }, []);

  /** Tira a entrada do mapa e desarma timer e toast. Não dispara nada. */
  const detach = useCallback((key: string): Entry | undefined => {
    const entry = entriesRef.current.get(key);
    if (!entry) return undefined;
    clearTimeout(entry.timer);
    toast.close(entry.toastKey);
    entriesRef.current.delete(key);
    return entry;
  }, []);

  /** Efetiva agora, sem esperar a janela. */
  const commitNow = useCallback(
    (key: string) => {
      const entry = detach(key);
      sync();
      if (!entry) return;
      entry
        .commit()
        .catch((error) =>
          // O toast de erro já vem do interceptor do axiosService; aqui é só
          // rastro para depuração.
          console.error(`Falha ao efetivar ação "${entry.kind}":`, error),
        )
        .finally(() => entry.onSettled?.());
    },
    [detach, sync],
  );

  /** Descarta a ação: nada foi enviado, só o timer morre. */
  const undo = useCallback(
    (key: string) => {
      const entry = detach(key);
      sync();
      if (entry) toast.info("Ação desfeita.");
    },
    [detach, sync],
  );

  const schedule = useCallback(
    (input: ScheduleInput) => {
      // Já havia algo pendente para o mesmo compromisso: efetiva o anterior
      // antes de empilhar o novo, senão a segunda ação partiria de um estado
      // que o backend ainda não conhece.
      if (entriesRef.current.has(input.key)) commitNow(input.key);

      // Instante absoluto: o círculo do botão conta para ESTE ponto no tempo,
      // não uma duração própria — assim o que a tela mostra e o que o timer
      // faz não podem divergir.
      const deadline = Date.now() + UNDO_WINDOW_MS;
      const timer = setTimeout(() => commitNow(input.key), UNDO_WINDOW_MS);
      const toastKey = toast(input.message, {
        variant: input.variant ?? "success",
        timeout: UNDO_WINDOW_MS,
        actionProps: {
          // `createElement` em vez de JSX só para este arquivo seguir sendo
          // `.ts`: é um único elemento, não vale converter o hook em `.tsx`.
          children: createElement(UndoCountdown, {
            deadline,
            durationMs: UNDO_WINDOW_MS,
          }),
          "aria-label": `Desfazer (${Math.round(UNDO_WINDOW_MS / 1000)} segundos)`,
          onPress: () => undo(input.key),
        },
      });

      entriesRef.current.set(input.key, { ...input, timer, toastKey });
      sync();
    },
    [commitNow, undo, sync],
  );

  /** Efetiva tudo que está na janela. Usado ao sair da tela. */
  const flush = useCallback(() => {
    for (const key of Array.from(entriesRef.current.keys())) commitNow(key);
  }, [commitNow]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    // Sair da página com ação na janela perderia a ação: o `setTimeout` morre
    // junto com o documento. Disparamos o que dá e avisamos — o navegador só
    // mostra o aviso se `preventDefault` for chamado, e apenas quando há
    // pendência de verdade.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (entriesRef.current.size === 0) return;
      flushRef.current();
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Desmontar (navegação client-side) também fecha a janela: efetiva.
      flushRef.current();
    };
  }, []);

  return { pending, schedule, undo, flush, hasPending: pending.size > 0 };
}
