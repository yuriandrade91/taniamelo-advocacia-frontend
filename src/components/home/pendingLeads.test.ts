import { describe, expect, it } from "vitest";
import {
  filterLeads,
  formatWaiting,
  groupLeads,
  mailtoLink,
  telLink,
  toPendingLead,
  toPhoneDigits,
  urgencyOf,
  whatsappLink,
  type PendingLead,
} from "./pendingLeads";
import type { Clients } from "@/interfaces/Clients.interface";

const TODAY = "2026-09-06";

const client = (extra: Partial<Clients> = {}): Clients =>
  ({
    id: "c-1",
    fullName: "Maria Aparecida",
    cpf: "123",
    birthDate: "1960-01-01",
    motherName: "Ana",
    mobilePhone: "(21) 97996-2251",
    gender: "Feminino",
    benefit: "Aposentadoria por idade",
    situation: "Formulário preenchido",
    ...extra,
  }) as Clients;

const lead = (extra: Partial<PendingLead> = {}): PendingLead => ({
  id: "x",
  name: "Fulano",
  waitingDays: 1,
  urgency: "recent",
  isWhatsapp: false,
  ...extra,
});

describe("urgencyOf", () => {
  it("separa nas faixas de 15 e 30 dias", () => {
    expect(urgencyOf(0)).toBe("recent");
    expect(urgencyOf(14)).toBe("recent");
    expect(urgencyOf(15)).toBe("warning");
    expect(urgencyOf(29)).toBe("warning");
    expect(urgencyOf(30)).toBe("critical");
    expect(urgencyOf(400)).toBe("critical");
  });

  it("sem data não vira urgente", () => {
    // Inventar urgência a partir de dado ausente colocaria alguém no topo da
    // fila por um defeito de cadastro.
    expect(urgencyOf(null)).toBe("recent");
  });
});

describe("toPendingLead", () => {
  it("calcula a espera sem deslocamento de fuso", () => {
    // `new Date("2026-08-07")` seria meia-noite UTC e daria um dia a mais.
    expect(toPendingLead(client({ createdAt: "2026-08-07" }), TODAY).waitingDays).toBe(30);
    expect(toPendingLead(client({ createdAt: "2026-09-06" }), TODAY).waitingDays).toBe(0);
  });

  it("aceita ISO com hora — só a parte da data importa", () => {
    expect(
      toPendingLead(client({ createdAt: "2026-09-05T23:50:00Z" }), TODAY).waitingDays,
    ).toBe(1);
  });

  it("nunca devolve espera negativa", () => {
    // Cadastro com data futura é defeito de dado; "há -3 dias" seria pior.
    expect(toPendingLead(client({ createdAt: "2026-09-09" }), TODAY).waitingDays).toBe(0);
  });

  it("sem createdAt devolve null, não zero", () => {
    // Zero significaria "cadastrado hoje", que é uma afirmação que não temos.
    expect(toPendingLead(client(), TODAY).waitingDays).toBeNull();
  });

  it("só marca WhatsApp quando o cadastro afirma", () => {
    expect(toPendingLead(client(), TODAY).isWhatsapp).toBe(false);
    expect(toPendingLead(client({ isWhatsapp: true }), TODAY).isWhatsapp).toBe(true);
  });
});

describe("links de contato", () => {
  it("monta o número nacional com o 55", () => {
    expect(toPhoneDigits("(21) 97996-2251")).toBe("5521979962251");
    expect(toPhoneDigits("21 2212-1990")).toBe("552122121990");
  });

  it("não duplica o código do país", () => {
    expect(toPhoneDigits("+55 21 97996-2251")).toBe("5521979962251");
  });

  it("recusa número incompleto em vez de gerar link quebrado", () => {
    expect(toPhoneDigits("9999")).toBeNull();
    expect(toPhoneDigits(undefined)).toBeNull();
    expect(whatsappLink("123")).toBeNull();
    expect(telLink(undefined)).toBeNull();
  });

  it("gera os links no formato de cada app", () => {
    expect(whatsappLink("(21) 97996-2251")).toBe("https://wa.me/5521979962251");
    expect(telLink("(21) 97996-2251")).toBe("tel:+5521979962251");
    expect(mailtoLink("a@b.com")).toBe("mailto:a@b.com");
  });

  it("recusa e-mail sem arroba", () => {
    expect(mailtoLink("nao-e-email")).toBeNull();
    expect(mailtoLink(undefined)).toBeNull();
  });
});

describe("groupLeads", () => {
  it("põe o grupo mais crítico primeiro", () => {
    const groups = groupLeads([
      lead({ id: "a", waitingDays: 2, urgency: "recent" }),
      lead({ id: "b", waitingDays: 40, urgency: "critical" }),
      lead({ id: "c", waitingDays: 20, urgency: "warning" }),
    ]);
    expect(groups.map((g) => g.urgency)).toEqual(["critical", "warning", "recent"]);
  });

  it("ordena o mais antigo primeiro dentro do grupo", () => {
    const groups = groupLeads([
      lead({ id: "novo", waitingDays: 31, urgency: "critical" }),
      lead({ id: "velho", waitingDays: 90, urgency: "critical" }),
    ]);
    expect(groups[0].leads.map((l) => l.id)).toEqual(["velho", "novo"]);
  });

  it("não mostra grupo vazio", () => {
    const groups = groupLeads([lead({ waitingDays: 1, urgency: "recent" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].urgency).toBe("recent");
  });

  it("lista vazia não gera grupo nenhum", () => {
    expect(groupLeads([])).toEqual([]);
  });
});

describe("formatWaiting", () => {
  it("fala em dias até um mês", () => {
    expect(formatWaiting(0)).toBe("hoje");
    expect(formatWaiting(1)).toBe("há 1 dia");
    expect(formatWaiting(9)).toBe("há 9 dias");
  });

  it("vira meses a partir de 30", () => {
    expect(formatWaiting(30)).toBe("há 1 mês");
    expect(formatWaiting(42)).toBe("há 1 mês e 12 dias");
    expect(formatWaiting(60)).toBe("há 2 meses");
  });

  it("diz que falta a data em vez de mentir uma", () => {
    expect(formatWaiting(null)).toBe("sem data de cadastro");
  });
});

describe("filterLeads", () => {
  const leads = [
    lead({ id: "1", name: "Antônio José" }),
    lead({ id: "2", name: "Beatriz", email: "bia@exemplo.com" }),
    lead({ id: "3", name: "Carlos", phone: "(21) 97996-2251" }),
  ];

  it("ignora acento e caixa", () => {
    expect(filterLeads(leads, "antonio").map((l) => l.id)).toEqual(["1"]);
    expect(filterLeads(leads, "ANTÔNIO").map((l) => l.id)).toEqual(["1"]);
  });

  it("busca também por e-mail e telefone", () => {
    expect(filterLeads(leads, "bia@").map((l) => l.id)).toEqual(["2"]);
    expect(filterLeads(leads, "97996").map((l) => l.id)).toEqual(["3"]);
  });

  it("termo vazio devolve tudo", () => {
    expect(filterLeads(leads, "   ")).toHaveLength(3);
  });
});
