"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import { localTimeOf } from "@/components/agenda/agendaGrouping";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

/**
 * Decisão sobre conflito de horário, no momento de salvar.
 *
 * ## Por que interceptar o salvar
 *
 * O aviso no formulário informa; ele não obriga a decidir. Quem está agendando
 * pode simplesmente não ter olhado. Interceptar o clique é o único momento em
 * que dá para exigir uma escolha consciente sem impedir nada — e sobrepor
 * horário às vezes é o certo (perícia e audiência acontecem em paralelo).
 *
 * ## As duas saídas são explícitas
 *
 * Não existe botão "OK". As opções são **manter os dois** e **substituir**, com
 * esses nomes, porque "confirmar" num diálogo de conflito não diz o que vai
 * acontecer com o compromisso que já estava lá.
 *
 * ## Substituir = cancelar, não excluir
 *
 * O compromisso substituído é **cancelado** (`PATCH /{id}/cancel`), não
 * excluído. Fica no histórico com a justificativa dizendo o que tomou o lugar
 * dele — que é o que alguém vai querer saber daqui a três meses ao perguntar
 * por que aquela audiência sumiu da agenda.
 */

export type ConflictDecisionModalProps = {
  isOpen: boolean;
  conflicts: AppointmentResponse[];
  /** Título do compromisso sendo agendado — entra na justificativa. */
  newTitle: string;
  onClose: () => void;
  /** `idsToCancel` vazio significa "manter os dois". */
  onConfirm: (idsToCancel: string[]) => void;
  isSubmitting?: boolean;
};

export function ConflictDecisionModal({
  isOpen,
  conflicts,
  newTitle,
  onClose,
  onConfirm,
  isSubmitting = false,
}: ConflictDecisionModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  /**
   * Zera a cada abertura. Sem isto, marcar um compromisso, desistir e abrir de
   * novo traria a marcação anterior — e a segunda confirmação cancelaria algo
   * que a pessoa não escolheu desta vez.
   */
  useEffect(() => {
    if (isOpen) setSelected([]);
  }, [isOpen, conflicts]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const isSingle = conflicts.length === 1;

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isSingle ? "Já há um compromisso nesse horário" : "Há compromissos nesse horário"}
      description="Escolha o que fazer antes de agendar. Sobrepor é permitido — só precisa ser intencional."
      hideFooter
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {conflicts.map((conflict) => {
            const isChecked = selected.includes(conflict.id);
            return (
              <li
                key={conflict.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  isChecked
                    ? "border-danger/40 bg-danger/5"
                    : "border-black/5 bg-white"
                }`}
              >
                <Checkbox
                  isSelected={isChecked}
                  onChange={() => toggle(conflict.id)}
                  isDisabled={isSubmitting}
                  aria-label={`Cancelar ${conflict.title}`}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">
                    {conflict.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-100">
                    {localTimeOf(conflict.startAt)}–{localTimeOf(conflict.endAt)}
                    {conflict.clientName ? ` · ${conflict.clientName}` : ""}
                  </p>
                  {isChecked && (
                    <p className="mt-1 text-xs text-danger">
                      Será cancelado, com “{newTitle || "o novo compromisso"}”
                      registrado como motivo.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/*
          Marcar é opcional: o caminho de baixo funciona sem marcar nada. A
          caixa existe para escolher QUAL substituir quando há mais de um.
        */}
        <p className="text-xs text-gray-100">
          Marque o que deve sair da agenda. Sem marcar nada, os compromissos
          convivem no mesmo horário.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onPress={onClose}
            isDisabled={isSubmitting}
          >
            Voltar e ajustar
          </Button>

          <Button
            type="button"
            variant="secondary"
            onPress={() => onConfirm([])}
            isDisabled={isSubmitting || selected.length > 0}
          >
            Agendar assim mesmo
          </Button>

          <Button
            type="button"
            variant="primary"
            className="bg-danger hover:bg-danger/90"
            onPress={() => onConfirm(selected)}
            isDisabled={isSubmitting || selected.length === 0}
          >
            {isSubmitting
              ? "Aplicando..."
              : selected.length <= 1
                ? "Cancelar o marcado e agendar"
                : `Cancelar os ${selected.length} e agendar`}
          </Button>
        </div>
      </div>
    </FormModal>
  );
}
