"use client";

import type { ReactNode } from "react";
import { Popover } from "@heroui/react";
import { PhoneIcon } from "@/components/ui/icons/ContactIcons";
import { ContactAction } from "@/components/ui/actions/ContactAction";
import { IconButton } from "@/components/ui/actions/IconButton";
import { ROW_ICONS } from "@/components/ui/table/RowActions";
import {
  formatWaiting,
  toPendingLead,
  urgencyDot,
  urgencyTile,
} from "@/components/home/pendingLeads";
import { telLink } from "@/lib/contactLinks";
import { initials } from "@/lib/format";
import type { ClientListItem } from "@/interfaces/client/Client.interface";
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
  client: ClientListItem;
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
              <IconButton
                label="Visualizar este cliente"
                tone="neutral"
                onClick={onViewDetails}
              >
                {ROW_ICONS.view}
              </IconButton>
              {/* Ligação, e não WhatsApp: a listagem não diz se o número tem
                  WhatsApp, e mandar mensagem para um fixo queima o contato. */}
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
