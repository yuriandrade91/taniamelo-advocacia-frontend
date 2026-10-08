"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Popover } from "@heroui/react";
import { PhoneIcon, WhatsappIcon } from "@/components/ui/icons/ContactIcons";
import { ContactAction } from "@/components/ui/ContactAction";
import ActionButton from "@/components/ui/table/ActionButton";
import svgPaths from "@/constants/svg/paths";
import {
  formatWaiting,
  toPendingLead,
  urgencyDot,
  urgencyTile,
} from "@/components/home/pendingLeads";
import { telLink, whatsappLink } from "@/lib/contactLinks";
import { initials } from "@/lib/format";
import type { Clients } from "@/interfaces/Clients.interface";
import { Pill } from "@/components/ui/feedback/Badges";
import { useHoverCard } from "@/hooks/useHoverCard";

/**
 * Popover do selo "cliente potencial" na tabela de clientes
 * (heroui.com/.../popover#interactive-content).
 *
 * Hover mostra, clique fixa — o comportamento é o de `useHoverCard`, o mesmo
 * do trilho de etapas e das parcelas do acordo.
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
  const card = useHoverCard();

  const lead = toPendingLead(client);

  return (
    <Popover {...card.popoverProps}>
      <Popover.Trigger {...card.triggerProps} aria-label="Ver detalhes do cliente potencial">
        {children}
      </Popover.Trigger>
      <Popover.Content {...card.contentProps} placement="top" className="w-72">
        <Popover.Arrow />
        <Popover.Dialog>
          {/*
            O mesmo desenho da fila de leads (`PendingLeadsModal`): ladrilho
            de iniciais tingido pela urgência, nome, e a espera em pílula com
            ponto. É a mesma pessoa vista de dois lugares — ler diferente nos
            dois custa atenção e não dá nada.
          */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-semibold ${urgencyTile(lead.urgency)}`}
            >
              {initials(lead.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">{lead.name}</p>
              <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-gray-100">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${urgencyDot(lead.urgency)}`}
                />
                {formatWaiting(lead.waitingDays)}
              </span>
            </div>
          </div>

          <p className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-100">
            <span className="truncate">{lead.benefit || "Benefício a definir"}</span>
            <Pill size="sm">Potencial</Pill>
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
