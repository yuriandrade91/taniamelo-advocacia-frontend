/**
 * Formulários pendentes — de contador a lista de trabalho.
 *
 * ## O que este módulo decide
 *
 * O cartão da home diz "6 pessoas que ainda não se tornaram clientes" e oferece
 * "Entrar em contato". O número sozinho não ajuda ninguém: a pergunta de quem
 * clica não é *quantos*, é **quem ligar primeiro**.
 *
 * A resposta é o tempo de espera. Alguém que preencheu o formulário há 40 dias
 * e nunca foi contatado é um caso perdido em formação; alguém de ontem é fluxo
 * normal. Por isso a lista chega ordenada do mais antigo para o mais recente e
 * agrupada por faixa de espera — a ordem é a recomendação.
 *
 * ## Por que não uma tabela ordenável
 *
 * Porque uma tabela devolve a decisão para quem olha. O grupo "esperando há
 * mais de 30 dias" no topo, com contagem própria, já responde antes de
 * qualquer clique. Ordenar por nome é o que se faz quando não se sabe o que
 * priorizar.
 */

import { daysBetween, todayIso } from "@/lib/period";
import { OFFICE_NAME } from "@/constants/office";
import type { Clients } from "@/interfaces/Clients.interface";

export type LeadUrgency = "critical" | "warning" | "recent";

export interface PendingLead {
  id: string;
  name: string;
  /** Dias desde o preenchimento. `null` quando a data não veio. */
  waitingDays: number | null;
  urgency: LeadUrgency;
  benefit?: string;
  phone?: string;
  isWhatsapp: boolean;
  email?: string;
}

export interface LeadGroup {
  urgency: LeadUrgency;
  title: string;
  /** Frase curta que explica por que este grupo está separado. */
  hint: string;
  leads: PendingLead[];
}

/**
 * Faixas de espera.
 *
 * 15 e 30 dias não são números mágicos: 15 é cerca de duas semanas, o intervalo
 * em que um interessado ainda lembra por que preencheu; 30 é o mês, quando ele
 * já procurou outro escritório. Se a prática do escritório disser outra coisa,
 * é aqui que se muda — e num lugar só.
 */
export const URGENCY_THRESHOLDS = { critical: 30, warning: 15 } as const;

export function urgencyOf(waitingDays: number | null): LeadUrgency {
  // Sem data, trata como recente: inventar urgência a partir de dado ausente
  // colocaria alguém no topo da fila por um defeito de cadastro.
  if (waitingDays === null) return "recent";
  if (waitingDays >= URGENCY_THRESHOLDS.critical) return "critical";
  if (waitingDays >= URGENCY_THRESHOLDS.warning) return "warning";
  return "recent";
}

/**
 * A cor da urgência: o ponto e o ladrilho de iniciais.
 *
 * Mora aqui, junto da regra que decide a urgência, porque a fila
 * (`PendingLeadsModal`) e o selo da lista de clientes
 * (`PotentialClientPopover`) mostram a mesma pessoa — e duas tabelas de cor
 * divergem no dia em que alguém mexer em uma só. Vermelho é "já foi longe
 * demais"; dourado, "ainda dá tempo"; cinza, fluxo normal.
 */
const URGENCY_DOT: Record<LeadUrgency, string> = {
  critical: "bg-danger",
  warning: "bg-secondary",
  recent: "bg-gray-100/40",
};

const URGENCY_TILE: Record<LeadUrgency, string> = {
  critical: "bg-danger/10 text-danger",
  warning: "bg-light-secondary text-secondary",
  recent: "bg-page text-gray-100",
};

export const urgencyDot = (urgency: LeadUrgency) => URGENCY_DOT[urgency];
export const urgencyTile = (urgency: LeadUrgency) => URGENCY_TILE[urgency];

/**
 * O primeiro contato, escrito.
 *
 * Quem abre a fila vai mandar a mesma mensagem dezenas de vezes, e escrever à
 * mão é onde se erra o nome de quem esperou dois meses. O texto já sai com o
 * nome e com o motivo — o benefício que a pessoa marcou no formulário —, que
 * é o que faz a mensagem parecer retomada de conversa e não disparo.
 *
 * Sem benefício no cadastro, a frase cai para "sobre o seu atendimento": é
 * melhor ser genérico do que afirmar um benefício que ninguém escolheu.
 */
export function contactMessage(lead: {
  name: string;
  benefit?: string;
}): string {
  const first = lead.name.trim().split(/\s+/)[0] ?? lead.name;
  const subject = lead.benefit?.trim()
    ? `sobre ${lead.benefit.trim().toLowerCase()}`
    : "sobre o seu atendimento";
  return (
    `Olá, ${first}! Aqui é do escritório ${OFFICE_NAME}. ` +
    `Recebemos o seu formulário ${subject} e queremos dar andamento ao seu caso. ` +
    `Podemos conversar?`
  );
}

export function toPendingLead(
  client: Clients,
  today: string = todayIso(),
): PendingLead {
  const created = client.createdAt?.slice(0, 10);
  const waitingDays =
    created && /^\d{4}-\d{2}-\d{2}$/.test(created)
      ? Math.max(0, daysBetween(created, today))
      : null;

  return {
    id: String(client.id ?? ""),
    name: client.fullName,
    waitingDays,
    urgency: urgencyOf(waitingDays),
    benefit: client.benefit || undefined,
    phone: client.mobilePhone || undefined,
    isWhatsapp: client.isWhatsapp === true,
    email: client.email || undefined,
  };
}

const GROUP_META: Record<LeadUrgency, { title: string; hint: string }> = {
  critical: {
    title: "Esperando há mais de um mês",
    hint: "Provavelmente já procuraram outro escritório. Ligue primeiro.",
  },
  warning: {
    title: "Entre duas semanas e um mês",
    hint: "Ainda lembram por que preencheram o formulário.",
  },
  recent: {
    title: "Últimas duas semanas",
    hint: "Fluxo normal — contato ainda em tempo.",
  },
};

const ORDER: LeadUrgency[] = ["critical", "warning", "recent"];

/**
 * Agrupa e ordena. Dentro de cada grupo, o mais antigo primeiro — a mesma
 * lógica em escala menor.
 *
 * Grupos vazios não aparecem: um cabeçalho "Esperando há mais de um mês" com
 * nada embaixo é ruído que ainda por cima assusta.
 */
export function groupLeads(leads: PendingLead[]): LeadGroup[] {
  return ORDER.map((urgency) => ({
    urgency,
    ...GROUP_META[urgency],
    leads: leads
      .filter((lead) => lead.urgency === urgency)
      .sort((a, b) => (b.waitingDays ?? -1) - (a.waitingDays ?? -1)),
  })).filter((group) => group.leads.length > 0);
}

/** "há 3 dias", "hoje", "há 1 mês e 12 dias". */
export function formatWaiting(waitingDays: number | null): string {
  if (waitingDays === null) return "sem data de cadastro";
  if (waitingDays === 0) return "hoje";
  if (waitingDays === 1) return "há 1 dia";
  if (waitingDays < 30) return `há ${waitingDays} dias`;

  const months = Math.floor(waitingDays / 30);
  const days = waitingDays % 30;
  const monthPart = `${months} ${months === 1 ? "mês" : "meses"}`;
  if (days === 0) return `há ${monthPart}`;
  return `há ${monthPart} e ${days} ${days === 1 ? "dia" : "dias"}`;
}

/** Filtro por nome, telefone ou e-mail — sem acento e sem caixa. */
export function filterLeads(leads: PendingLead[], term: string): PendingLead[] {
  const query = term
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!query) return leads;

  // O benefício entra porque é o que a linha mostra ao lado do nome: procurar
  // por "rural" e não achar ninguém, com "Aposentadoria rural" na tela, é a
  // busca contradizendo a lista. O e-mail continua valendo, ainda que não
  // apareça — quem tem o endereço na mão acha por ele.
  return leads.filter((lead) =>
    [lead.name, lead.phone ?? "", lead.benefit ?? "", lead.email ?? ""]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .includes(query),
  );
}
