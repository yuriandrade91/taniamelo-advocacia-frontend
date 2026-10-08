"use client";

import { Modal } from "@heroui/react";
import ModalShell from "@/components/ui/modals/ModalShell";
import { ChipButton } from "@/components/ui/actions/ActionGroup";
import { GENDER_PROMPT_OPTIONS, initialGenderChoice } from "./genderPrompt";

/**
 * Pergunta rápida de sexo ao escolher a aposentadoria da pessoa com
 * deficiência — ver `genderPrompt.ts` para o porquê.
 *
 * Um clique responde: cada opção é um botão que grava e fecha. "Agora não"
 * deixa o campo como está; a seção de períodos avisa enquanto ele faltar.
 */
export function GenderPromptModal({
  isOpen,
  currentGender,
  onChoose,
  onClose,
}: {
  isOpen: boolean;
  /** Chave atual do campo "Gênero" — a opção correspondente vem marcada. */
  currentGender: string;
  onChoose: (gender: (typeof GENDER_PROMPT_OPTIONS)[number]["value"]) => void;
  onClose: () => void;
}) {
  const current = initialGenderChoice(currentGender);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      className="sm:max-w-[440px]"
    >
      <Modal.Header>
        <Modal.Heading>Qual o sexo do cliente?</Modal.Heading>
      </Modal.Header>

      <Modal.Body>
        <p className="text-sm text-gray-100">
          Na aposentadoria por deficiência, o sexo define a tabela de
          conversão do tempo (LC 142/2013). A resposta já fica marcada em
          Dados pessoais.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {GENDER_PROMPT_OPTIONS.map((option) => {
            const isCurrent = option.value === current;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChoose(option.value);
                  onClose();
                }}
                aria-pressed={isCurrent}
                className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 text-base font-medium transition-colors ${
                  isCurrent
                    ? "border-primary bg-primary text-white"
                    : "border-light-gray text-primary hover:border-primary/50 hover:bg-page"
                }`}
              >
                {option.label}
                {isCurrent && (
                  <span className="text-xs font-normal text-white/70">
                    atual
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-gray-100/80">
          Não-binário ou outro? Feche e escolha em Dados pessoais.
        </p>
      </Modal.Body>

      <Modal.Footer>
        <ChipButton tone="primary" onClick={onClose}>
          Agora não
        </ChipButton>
      </Modal.Footer>
    </ModalShell>
  );
}
