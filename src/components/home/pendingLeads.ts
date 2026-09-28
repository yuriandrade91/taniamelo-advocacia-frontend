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

/** Só os dígitos, com o 55 do Brasil na frente quando falta. */
export function toPhoneDigits(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // 10 (fixo com DDD) ou 11 (celular com DDD) dígitos é número nacional.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // 12/13 já vem com o código do país.
  if (digits.length === 12 || digits.length === 13) return digits;
  return null;
}

export const whatsappLink = (phone?: string): string | null => {
  const digits = toPhoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : null;
};

export const telLink = (phone?: string): string | null => {
  const digits = toPhoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
};

export const mailtoLink = (email?: string): string | null =>
  email && email.includes("@") ? `mailto:${email}` : null;

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

  return leads.filter((lead) =>
    [lead.name, lead.phone ?? "", lead.email ?? ""]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .includes(query),
  );
}
