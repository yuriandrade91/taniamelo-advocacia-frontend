"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label, Skeleton } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import {
  MailIcon,
  PhoneIcon,
  WhatsappIcon,
} from "@/components/ui/icons/ContactIcons";
import { ContactAction } from "@/components/ui/ContactAction";
import { clients as fetchClients } from "@/services/clientService";
import {
  filterLeads,
  formatWaiting,
  groupLeads,
  mailtoLink,
  telLink,
  toPendingLead,
  whatsappLink,
  type LeadUrgency,
  type PendingLead,
} from "./pendingLeads";

/**
 * Quem preencheu o formulário e ainda não virou cliente.
 *
 * ## O que faz dela uma lista de trabalho, e não uma tabela
 *
 * Quem clica em "Entrar em contato" não quer saber quantos são — quer saber
 * **por quem começar**. A modal responde isso antes de qualquer interação: a
 * lista chega agrupada por tempo de espera, do mais parado para o mais
 * recente, e cada grupo diz em uma linha por que está separado.
 *
 * Ordenar por nome, ou dar colunas ordenáveis, devolveria a decisão para quem
 * olha. É o que se faz quando não se sabe o que priorizar — e aqui se sabe.
 *
 * ## Contato em um toque
 *
 * WhatsApp, ligação e e-mail saem como links nativos (`wa.me`, `tel:`,
 * `mailto:`), então funcionam no celular e no desktop sem integração nenhuma.
 * O botão de WhatsApp só aparece quando o cadastro **afirma** que o número tem
 * WhatsApp — mandar mensagem para um fixo é o tipo de erro que queima o
 * contato.
 *
 * Cada ação que não pode ser montada (telefone incompleto, e-mail sem arroba)
 * simplesmente não vira botão, em vez de virar um link quebrado.
 *
 * ## De onde vem o dado
 *
 * `GET /clients?situation=FORMULARIO_PREENCHIDO` — a situação inicial do
 * fluxo. É a mesma consulta que alimenta o contador do cartão, para os dois
 * não se contradizerem.
 */

export type PendingLeadsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/** Quantos carregar. Acima disto, a fila deixou de ser um problema de contato. */
const PAGE_SIZE = 100;

const URGENCY_STYLE: Record<
  LeadUrgency,
  { dot: string; badge: string; border: string }
> = {
  critical: {
    dot: "bg-danger",
    badge: "bg-danger/10 text-danger",
    border: "border-danger/30",
  },
  warning: {
    dot: "bg-secondary",
    badge: "bg-light-secondary text-secondary",
    border: "border-secondary/30",
  },
  recent: {
    dot: "bg-gray-100/40",
    badge: "bg-light-gray text-gray-100",
    border: "border-black/5",
  },
};

function LeadRow({ lead }: { lead: PendingLead }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{lead.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-100">
          <span>{formatWaiting(lead.waitingDays)}</span>
          {lead.benefit && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{lead.benefit}</span>
            </>
          )}
        </p>
      </div>

      {/* O telefone em texto: dá para ditar por cima do ombro sem clicar. */}
      {lead.phone && (
        <span className="hidden shrink-0 text-xs whitespace-nowrap text-gray-100 sm:block">
          {lead.phone}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        {/*
          WhatsApp só quando o cadastro afirma que o número tem. Mandar
          mensagem para um fixo queima o contato.
        */}
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
        <ContactAction
          href={mailtoLink(lead.email)}
          label={`E-mail para ${lead.name}`}
          tone="neutral"
        >
          <MailIcon />
        </ContactAction>
      </div>
    </li>
  );
}

export function PendingLeadsModal({ isOpen, onClose }: PendingLeadsModalProps) {
  const [leads, setLeads] = useState<PendingLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    setHasError(false);
    setSearch("");

    fetchClients({
      situation: ["FORMULARIO_PREENCHIDO"],
      pageNumber: 1,
      pageSize: PAGE_SIZE,
    })
      .then((envelope) => {
        if (!active) return;
        setLeads((envelope?.data ?? []).map((client) => toPendingLead(client)));
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const visible = useMemo(() => filterLeads(leads, search), [leads, search]);
  const groups = useMemo(() => groupLeads(visible), [visible]);

  /**
   * A frase do topo. Diz o que a lista inteira significa antes de a pessoa ler
   * qualquer nome — e nomeia o pior caso, que é o que decide a ordem de ligar.
   */
  const summary = useMemo(() => {
    if (leads.length === 0) return null;
    const critical = leads.filter((lead) => lead.urgency === "critical").length;
    const oldest = leads.reduce(
      (max, lead) => Math.max(max, lead.waitingDays ?? 0),
      0,
    );
    if (critical > 0) {
      return `${critical} ${critical === 1 ? "pessoa espera" : "pessoas esperam"} há mais de um mês. A mais antiga, ${formatWaiting(oldest)}.`;
    }
    return `Ninguém esperando há mais de um mês. A mais antiga da fila, ${formatWaiting(oldest)}.`;
  }, [leads]);

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Formulários pendentes"
      description="Pessoas que preencheram o formulário e ainda não viraram clientes, do contato mais atrasado para o mais recente."
      size="lg"
      hideFooter
    >
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : hasError ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-primary">
            Não foi possível carregar a lista. Tente abrir de novo.
          </p>
        ) : leads.length === 0 ? (
          <p className="rounded-xl border border-black/5 bg-light-gray/40 px-4 py-6 text-center text-sm text-gray-100">
            Ninguém esperando. Todo formulário preenchido já virou atendimento.
          </p>
        ) : (
          <>
            {summary && (
              <p className="rounded-xl border border-black/5 bg-light-gray/40 px-4 py-3 text-sm text-primary">
                {summary}
              </p>
            )}

            {/* A busca só aparece quando a lista é grande o bastante para
                alguém procurar alguém específico nela. */}
            {leads.length > 8 && (
              <div>
                <Label className="text-secondary">Buscar</Label>
                <Input
                  className="form-border-style"
                  placeholder="Nome, telefone ou e-mail"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            )}

            {visible.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-100">
                Nenhum resultado para “{search}”.
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.urgency} className="flex flex-col gap-2">
                  <header
                    className={`flex items-center gap-2 border-l-2 pl-3 ${URGENCY_STYLE[group.urgency].border}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${URGENCY_STYLE[group.urgency].dot}`}
                    />
                    <h3 className="text-sm font-medium text-primary">
                      {group.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${URGENCY_STYLE[group.urgency].badge}`}
                    >
                      {group.leads.length}
                    </span>
                    <span className="ml-1 hidden text-xs text-gray-100 sm:block">
                      {group.hint}
                    </span>
                  </header>

                  <ul className="flex flex-col gap-2">
                    {group.leads.map((lead) => (
                      <LeadRow key={lead.id} lead={lead} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onPress={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </FormModal>
  );
}
