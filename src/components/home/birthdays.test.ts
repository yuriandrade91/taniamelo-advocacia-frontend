import { describe, expect, it } from "vitest";
import type { UpcomingBirthdayResponse } from "@/interfaces/client/Client.interface";
import {
  BIRTHDAY_LIMIT,
  birthdayCountdown,
  birthdayMessage,
  toBirthdayPeople,
} from "./birthdays";

/** Uma linha como a API manda; `daysUntil` contado no dia da resposta. */
const row = (
  clientId: string,
  fullName: string,
  nextBirthday: string,
  {
    daysUntil = 0,
    turningAge = 40,
    birthDate = "1986-01-01",
    mobilePhone = undefined as string | undefined,
    isWhatsapp = undefined as boolean | undefined,
  } = {},
): UpcomingBirthdayResponse => ({
  clientId,
  fullName,
  birthDate,
  nextBirthday,
  daysUntil,
  turningAge,
  mobilePhone,
  isWhatsapp,
});

describe("toBirthdayPeople", () => {
  it("leva a linha da API para o cartão: id, nome, data, contagem e idade", () => {
    expect(
      toBirthdayPeople([row("c1", "  Ana Souza ", "2026-10-12", { turningAge: 56 })], "2026-10-08"),
    ).toEqual([
      {
        id: "c1",
        name: "Ana Souza",
        date: "2026-10-12",
        inDays: 4,
        turning: 56,
        phone: null,
        isWhatsapp: true,
      },
    ]);
  });

  it("hoje fica, com contagem zero", () => {
    const [person] = toBirthdayPeople([row("c1", "Hoje", "2026-10-08")], "2026-10-08");
    expect(person.inDays).toBe(0);
    expect(birthdayCountdown(person.inDays)).toBe("hoje");
  });

  it("quando o dia vira com a página aberta, quem já passou sai e os outros andam um dia", () => {
    // A resposta veio em 07/10; a tela agora está em 08/10.
    const fetchedYesterday = [
      row("c1", "Ontem", "2026-10-07", { daysUntil: 0 }),
      row("c2", "Hoje", "2026-10-08", { daysUntil: 1 }),
      row("c3", "Depois", "2026-10-20", { daysUntil: 13 }),
    ];
    const list = toBirthdayPeople(fetchedYesterday, "2026-10-08");
    expect(list.map((p) => [p.name, p.inDays])).toEqual([
      ["Hoje", 0],
      ["Depois", 12],
    ]);
  });

  it("conta pela data, não pelo daysUntil da resposta", () => {
    const [person] = toBirthdayPeople([row("c1", "Alguém", "2026-10-20", { daysUntil: 99 })], "2026-10-10");
    expect(person.inDays).toBe(10);
  });

  it("atravessa a virada do ano", () => {
    const [person] = toBirthdayPeople([row("c1", "Janeiro", "2027-01-02")], "2026-12-30");
    expect(person.inDays).toBe(3);
  });

  it("mais perto primeiro; empate pelo nome", () => {
    const list = toBirthdayPeople(
      [
        row("c1", "Zélia", "2026-10-15"),
        row("c2", "Bruno", "2026-10-09"),
        row("c3", "Álvaro", "2026-10-15"),
      ],
      "2026-10-08",
    );
    expect(list.map((p) => p.name)).toEqual(["Bruno", "Álvaro", "Zélia"]);
  });

  it(`corta em ${BIRTHDAY_LIMIT} por padrão, ou no limite pedido`, () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      row(`c${i}`, `Pessoa ${i}`, `2026-10-${String(10 + i).padStart(2, "0")}`),
    );
    expect(toBirthdayPeople(rows, "2026-10-08")).toHaveLength(BIRTHDAY_LIMIT);
    expect(toBirthdayPeople(rows, "2026-10-08", 2)).toHaveLength(2);
  });

  it("ignora linha sem id, sem nome ou com data ilegível", () => {
    const list = toBirthdayPeople(
      [
        row("", "Sem id", "2026-10-10"),
        row("c2", "   ", "2026-10-10"),
        row("c3", "Data ruim", "10/10/2026"),
        row("c4", "Válida", "2026-10-10"),
      ],
      "2026-10-08",
    );
    expect(list.map((p) => p.id)).toEqual(["c4"]);
  });

  it("não afirma idade que não faz sentido", () => {
    const [person] = toBirthdayPeople([row("c1", "Dado errado", "2026-10-10", { turningAge: 0 })], "2026-10-08");
    expect(person.turning).toBeNull();
  });

  it("lista vazia é lista vazia", () => {
    expect(toBirthdayPeople([], "2026-10-08")).toEqual([]);
  });
});

describe("birthdayCountdown", () => {
  it("escreve hoje, amanhã e a contagem", () => {
    expect(birthdayCountdown(0)).toBe("hoje");
    expect(birthdayCountdown(1)).toBe("amanhã");
    expect(birthdayCountdown(5)).toBe("em 5 dias");
  });
});

describe("telefone para o parabéns", () => {
  it("leva o celular e se ele é WhatsApp; sem a marca, conta como WhatsApp", () => {
    const [withPhone, noFlag, notWhatsapp, blank] = toBirthdayPeople(
      [
        row("c1", "A", "2026-10-08", { mobilePhone: " (31) 99999-0000 ", isWhatsapp: true }),
        row("c2", "B", "2026-10-09", { mobilePhone: "(31) 98888-0000" }),
        row("c3", "C", "2026-10-10", { mobilePhone: "(31) 3333-0000", isWhatsapp: false }),
        row("c4", "D", "2026-10-11", { mobilePhone: "  " }),
      ],
      "2026-10-08",
    );
    expect(withPhone).toMatchObject({ phone: "(31) 99999-0000", isWhatsapp: true });
    expect(noFlag.isWhatsapp).toBe(true);
    expect(notWhatsapp.isWhatsapp).toBe(false);
    expect(blank.phone).toBeNull();
  });
});

describe("birthdayMessage", () => {
  it("fala com o primeiro nome, em nome do escritório", () => {
    const text = birthdayMessage({ name: "  Antônia Ferreira Lima" });
    expect(text).toMatch(/^Olá, Antônia!/);
    expect(text).toContain("Tânia Melo Advocacia Previdenciária");
    expect(text).toContain("Hoje é o seu dia");
    expect(text).toContain("feliz aniversário");
  });

  it("não fala a idade", () => {
    expect(birthdayMessage({ name: "Ana" })).not.toMatch(/\d+ anos/);
  });
});
