"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BenefitKey } from "@/enums/benefit/Benefits";
import { SERVICES, SITE_CONTACT, whatsappHref } from "./siteContent";
import { ArrowUpRightIcon as ArrowUpRight, CloseIcon } from "./siteIcons";
import { ChoicePills, Eyebrow, PRESS, shortBenefit } from "./shared";

/** O assunto da mensagem: uma das aposentadorias, "ainda não sei", ou o texto da própria pessoa. */
export type Topic = BenefitKey | "unsure" | "own" | "none";

const TOPICS: readonly { id: Topic; label: string }[] = [
  ...SERVICES.map((service) => ({ id: service.key, label: shortBenefit(service.title) })),
  { id: "unsure", label: "Ainda não sei" },
  { id: "own", label: "Escrever do meu jeito" },
];

/** O texto pronto de cada assunto. "Escrever do meu jeito" começa em branco. */
function messageFor(topic: Topic) {
  if (topic === "own") return "";
  if (topic === "unsure") {
    return "Olá! Vim pelo site e gostaria de uma orientação. Ainda não sei qual aposentadoria se encaixa no meu caso.";
  }
  const service = SERVICES.find((item) => item.key === topic);
  if (!service) return "Olá! Vim pelo site e gostaria de conversar sobre a minha aposentadoria.";
  return `Olá! Vim pelo site e gostaria de conversar sobre ${service.title.toLowerCase()}. Quero entender se tenho direito e quais são os próximos passos.`;
}

/** "21988275421" → "(21) 98827-5421". */
const formattedWhatsapp = SITE_CONTACT.whatsapp.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

/**
 * A janela do "falar com a equipe". `<dialog>` de verdade: Esc fecha, o foco
 * fica dentro e o resto da página não recebe clique.
 */
export function WhatsAppComposer({ initialTopic, onClose }: Readonly<{ initialTopic: Topic; onClose: () => void }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [message, setMessage] = useState(() => messageFor(initialTopic));
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Clique no fundo (o próprio <dialog>, não o conteúdo) fecha. É atalho do
    // mouse; no teclado quem fecha é o Esc, que o <dialog> já trata.
    const closeOnBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", closeOnBackdrop);
    return () => dialog.removeEventListener("click", closeOnBackdrop);
  }, []);

  const choose = (next: Topic) => {
    setTopic(next);
    setMessage(messageFor(next));
    if (next === "own") requestAnimationFrame(() => textRef.current?.focus());
  };

  const trimmed = message.trim();
  const sendClassName = `group inline-flex min-h-[54px] items-center gap-4 bg-secondary px-6 text-base font-medium text-white ${PRESS}`;
  const sendLabel = (
    <>
      Enviar pelo WhatsApp
      <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="pr-dialog m-auto w-[min(600px,calc(100%-32px))] max-w-none bg-ivory p-0 text-primary backdrop:bg-midnight/70 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[calc(100svh-48px)] overflow-y-auto p-8 max-[760px]:p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Eyebrow>Falar com a equipe</Eyebrow>
            <h2 id={titleId} className="mt-4 text-[34px] leading-[1.15] font-light max-[760px]:text-[28px]">
              Sobre qual aposentadoria
              <br />
              <span className="text-secondary">você quer conversar?</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline hover:rotate-90 hover:border-primary ${PRESS}`}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <ChoicePills
          legend="Escolha o assunto e a mensagem já vem escrita"
          options={TOPICS}
          value={topic}
          onChange={choose}
          className="mt-7"
          legendClassName="text-[15px] text-muted-ink"
          groupClassName="mt-4 flex flex-wrap gap-2"
          optionClassName={(isActive) =>
            `${PRESS} rounded-full border px-4 py-2.5 text-[15px] ${
              isActive ? "border-primary bg-primary text-white" : "border-hairline bg-white hover:border-secondary"
            }`
          }
        />

        <label htmlFor={textId} className="mt-7 block text-[13px] font-medium tracking-[1.5px] text-secondary uppercase">
          Sua mensagem
        </label>
        <textarea
          id={textId}
          ref={textRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          placeholder="Conte com suas palavras: qual aposentadoria, há quanto tempo contribui, o que aconteceu…"
          className="mt-3 w-full resize-y border border-hairline bg-white p-4 text-base leading-[1.7] transition outline-none focus:border-secondary"
        />
        <p className="mt-2 text-[14px] text-muted-ink">Pode mudar o texto como quiser antes de enviar.</p>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <span className="text-[14px] text-muted-ink">WhatsApp {formattedWhatsapp}</span>
          {trimmed ? (
            <a
              href={whatsappHref(trimmed)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dialogRef.current?.close()}
              className={sendClassName}
            >
              {sendLabel}
            </a>
          ) : (
            <button type="button" disabled className={`${sendClassName} cursor-not-allowed opacity-45`}>
              {sendLabel}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
