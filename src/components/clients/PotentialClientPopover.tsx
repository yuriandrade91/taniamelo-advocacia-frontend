"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Popover } from "@heroui/react";
import { PhoneIcon, WhatsappIcon } from "@/components/ui/icons/ContactIcons";
import { ContactAction } from "@/components/ui/ContactAction";
import ActionButton from "@/components/ui/table/ActionButton";
import svgPaths from "@/constants/svg/paths";
import {
  formatWaiting,
  telLink,
  toPendingLead,
  whatsappLink,
} from "@/components/home/pendingLeads";
import type { Clients } from "@/interfaces/Clients.interface";

/**
 * Popover do selo "cliente potencial" na tabela de clientes
 * (heroui.com/.../popover#interactive-content).
 *
 * ## Hover mostra, clique fixa
 *
 * Passar o mouse abre uma prévia que some ao tirar o mouse — como o tooltip
 * que isto substitui. Clicar fixa a prévia aberta, sobrevivendo ao mouse
 * saindo; só fecha de novo com Esc ou clique fora. É por isso que `isOpen`
 * não é só "está fixo": sem o hover, cada espiada exigiria um clique.
 *
 * A pista de que "fixar" e "fechar" são a mesma notificação da lib
 * (`onOpenChange(false)`, seja de Esc, clique fora ou clique no próprio
 * gatilho) é `isHovering`: se o mouse ainda está em cima quando o fechamento
 * chega, foi um clique na prévia — vira fixar. Se não está, foi Esc ou
 * clique fora — fecha de vez.
 *
 * ## O atraso ao sair
 *
 * Sem ele, o intervalo entre o ícone e o cartão (onde fica a seta do
 * popover) faz o mouse "sair" de um e ainda não ter "entrado" no outro, e a
 * prévia pisca fechada no meio do caminho até o telefone.
 */
export function PotentialClientPopover({
  client,
  onViewDetails,
  children,
}: {
  client: Clients;
  /** "Visualizar" — mesmo ícone e ação da coluna "Ações" da tabela. */
  onViewDetails: () => void;
  children: ReactNode;
}) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const startHovering = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsHovering(true);
  };

  const scheduleStopHovering = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsHovering(false), 150);
  };

  const handleOpenChange = (next: boolean) => {
    if (next || isHovering) {
      setIsPinned(true);
      return;
    }
    setIsPinned(false);
    setIsHovering(false);
  };

  const lead = toPendingLead(client);

  return (
    <Popover isOpen={isPinned || isHovering} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        aria-label="Ver detalhes do cliente potencial"
        onMouseEnter={startHovering}
        onMouseLeave={scheduleStopHovering}
      >
        {children}
      </Popover.Trigger>
      <Popover.Content
        placement="top"
        className="w-72"
        onMouseEnter={startHovering}
        onMouseLeave={scheduleStopHovering}
      >
        <Popover.Arrow />
        <Popover.Dialog>
          <span className="inline-flex w-fit items-center rounded-full bg-light-secondary px-2 py-0.5 text-[11px] font-medium text-secondary">
            Cliente potencial
          </span>
          <p className="mt-2 truncate text-sm font-semibold text-primary">
            {lead.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-100">
            <span>{formatWaiting(lead.waitingDays)}</span>
            {lead.benefit && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{lead.benefit}</span>
              </>
            )}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/5 pt-3">
            <span className="truncate text-sm text-gray-100">
              {lead.phone ?? "Sem telefone"}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
              <ActionButton
                label="Visualizar este cliente"
                tone="neutral"
                onClick={onViewDetails}
              >
                <Image
                  src={svgPaths.ICONS.DETAILS}
                  alt=""
                  height={20}
                  width={20}
                  className="h-5 w-5"
                />
              </ActionButton>
              {/* WhatsApp só quando o cadastro afirma que o número tem —
                  mandar mensagem para um fixo queima o contato. */}
              {lead.isWhatsapp && (
                <ContactAction
                  href={whatsappLink(lead.phone)}
                  label={`WhatsApp de ${lead.name}`}
                  tone="success"
                >
                  <WhatsappIcon />
                </ContactAction>
              )}
              <ContactAction
                href={telLink(lead.phone)}
                label={`Ligar para ${lead.name}`}
                tone="primary"
              >
                <PhoneIcon />
              </ContactAction>
            </div>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
