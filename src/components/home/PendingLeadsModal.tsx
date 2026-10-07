"use client";

import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label, Skeleton } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import {
  MailIcon,
  PhoneIcon,
  WhatsappIcon,
} from "@/components/ui/icons/ContactIcons";
import { ContactAction } from "@/components/ui/ContactAction";
import { initials } from "@/lib/format";
import { clients as fetchClients } from "@/services/clientService";
import {
  filterLeads,
  formatWaiting,
  groupLeads,
  mailtoLink,
  telLink,
  toPendingLead,
  urgencyDot,
  urgencyTile,
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

/** A pílula de espera, por urgência — o ponto e o ladrilho vêm de `pendingLeads`. */
const URGENCY_PILL: Record<LeadUrgency, string> = {
  critical: "bg-danger/10 text-danger",
  warning: "bg-light-secondary text-secondary",
  recent: "bg-light-gray text-gray-100",
};

/** Os filtros do topo, na ordem da fila. */
const FILTERS: { id: "todos" | LeadUrgency; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "critical", label: "+1 mês" },
  { id: "warning", label: "+2 semanas" },
  { id: "recent", label: "Recentes" },
];

/**
 * Uma pessoa da fila: quem, há quanto tempo, para quê e por onde falar.
 *
 * O ladrilho de iniciais é o mesmo da lista de clientes — a fila é de gente,
 * e um bloco de linhas de texto puro lê como planilha. A espera é o dado que
 * decide a ordem de ligar, então ela é pílula colorida, não texto cinza.
 */
function LeadRow({ lead }: { lead: PendingLead }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-black/5 transition hover:bg-secondary/5">
      <span
        aria-hidden="true"
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-semibold ${urgencyTile(lead.urgency)}`}
      >
        {initials(lead.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{lead.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-100">
          {lead.benefit && <span className="truncate">{lead.benefit}</span>}
          {/* O telefone em texto: dá para ditar por cima do ombro sem clicar. */}
          {lead.phone && (
            <>
              {lead.benefit && <span aria-hidden="true">·</span>}
              <span className="whitespace-nowrap">{lead.phone}</span>
            </>
          )}
        </p>
      </div>

      <span
        className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap sm:inline-flex ${URGENCY_PILL[lead.urgency]}`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${urgencyDot(lead.urgency)}`} />
        {formatWaiting(lead.waitingDays)}
      </span>

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
  const [search, setSearch] = useState("");
  /** Faixa de espera escolhida no topo — "todos" é o estado inicial. */
  const [urgency, setUrgency] = useState<"todos" | LeadUrgency>("todos");
  /** Cada abertura relê a fila e começa sem busca; a resposta é marcada com a abertura que a pediu. */
  const [session, setSession] = useState(0);
  useResetOnOpen(isOpen, () => {
    setSearch("");
    setUrgency("todos");
    setSession((n) => n + 1);
  });
  const [result, setResult] = useState<{ session: number; leads: PendingLead[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetchClients({ situation: ["FORMULARIO_PREENCHIDO"], pageNumber: 1, pageSize: PAGE_SIZE })
      .then(
        (envelope) => ({ leads: (envelope?.data ?? []).map((client) => toPendingLead(client)), failed: false }),
        () => ({ leads: [], failed: true }),
      )
      .then((loaded) => {
        if (active) setResult({ session, ...loaded });
      });
    return () => {
      active = false;
    };
  }, [isOpen, session]);

  const current = result?.session === session ? result : null;
  const leads = useMemo(() => current?.leads ?? [], [current]);
  const isLoading = isOpen && current === null;
  const hasError = current?.failed ?? false;

  const visible = useMemo(() => {
    const encontrados = filterLeads(leads, search);
    return urgency === "todos"
      ? encontrados
      : encontrados.filter((lead) => lead.urgency === urgency);
  }, [leads, search, urgency]);
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
              <Skeleton key={row} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : hasError ? (
          <p className="rounded-2xl bg-danger/5 px-4 py-3 text-sm text-primary ring-1 ring-danger/30">
            Não foi possível carregar a lista. Tente abrir de novo.
          </p>
        ) : leads.length === 0 ? (
          <p className="rounded-2xl bg-page px-4 py-6 text-center text-sm text-gray-100">
            Ninguém esperando. Todo formulário preenchido já virou atendimento.
          </p>
        ) : (
          <>
            {/*
              A faixa do topo responde antes de qualquer clique: a frase diz o
              estado da fila, e os números ao lado são o filtro. Clicar numa
              faixa de espera é a pergunta que a pessoa faz de verdade — "quem
              está parado há mais de um mês?" —, e ela deixou de exigir rolar
              até o grupo certo.
            */}
            <div className="flex flex-col gap-3 rounded-2xl bg-page px-4 py-3">
              {summary && <p className="text-sm text-primary">{summary}</p>}
              <div role="group" aria-label="Filtrar por tempo de espera" className="flex flex-wrap gap-1.5">
                {FILTERS.map((filter) => {
                  const count =
                    filter.id === "todos"
                      ? leads.length
                      : leads.filter((lead) => lead.urgency === filter.id).length;
                  const on = urgency === filter.id;
                  // Faixa sem ninguém não vira botão: filtro que leva a lista
                  // vazia é um clique desperdiçado.
                  if (count === 0 && filter.id !== "todos") return null;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setUrgency(filter.id)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        on
                          ? "bg-primary text-white"
                          : "bg-white text-gray-100 ring-1 ring-black/5 hover:text-primary"
                      }`}
                    >
                      {filter.id !== "todos" && (
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${urgencyDot(filter.id)}`}
                        />
                      )}
                      {filter.label}
                      <span className={`tabular-nums ${on ? "text-white/70" : "text-gray-100/60"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* A busca só aparece quando a lista é grande o bastante para
                alguém procurar alguém específico nela. */}
            {leads.length > 8 && (
              <div className="flex flex-col gap-1">
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
                {search
                  ? `Nenhum resultado para “${search}”.`
                  : "Ninguém nesta faixa de espera."}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.urgency} className="flex flex-col gap-2">
                  {/*
                    O cabeçalho do grupo some quando o filtro já isolou uma
                    faixa: repetir "Esperando há mais de um mês" embaixo do
                    botão que diz isso é dizer duas vezes.
                  */}
                  {urgency === "todos" && (
                    <header className="flex items-center gap-2 px-1">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${urgencyDot(group.urgency)}`}
                      />
                      <h3 className="text-sm font-medium text-primary">{group.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${URGENCY_PILL[group.urgency]}`}
                      >
                        {group.leads.length}
                      </span>
                      <span className="ml-1 hidden text-xs text-gray-100 sm:block">
                        {group.hint}
                      </span>
                    </header>
                  )}

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
