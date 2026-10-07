import { describe, expect, it } from "vitest";
import {
  birthdayCountdown,
  upcomingBirthdays,
  type BirthdaySource,
} from "./birthdays";

/** O cliente mínimo — só o que a derivação lê. */
const cliente = (
  id: string,
  fullName: string,
  birthDate?: string,
): BirthdaySource => ({ id, fullName, birthDate });

describe("upcomingBirthdays", () => {
  it("traz do mais perto ao mais longe", () => {
    const lista = upcomingBirthdays(
      [
        cliente("1", "Longe", "1970-03-20"),
        cliente("2", "Hoje", "1961-03-12"),
        cliente("3", "Amanhã", "1980-03-13"),
      ],
      { today: "2026-03-12" },
    );

    expect(lista.map((p) => p.name)).toEqual(["Hoje", "Amanhã", "Longe"]);
    expect(lista.map((p) => p.inDays)).toEqual([0, 1, 8]);
  });

  it("quem já passou vai para o ano que vem, no fim da fila", () => {
    const lista = upcomingBirthdays(
      [
        cliente("1", "Ontem", "1970-03-11"),
        cliente("2", "Daqui a meses", "1970-04-30"),
        cliente("3", "Daqui a um mês", "1970-04-11"),
      ],
      { today: "2026-03-12" },
    );

    expect(lista.map((p) => p.name)).toEqual([
      "Daqui a um mês",
      "Daqui a meses",
      "Ontem",
    ]);
    expect(lista.map((p) => p.inDays)).toEqual([30, 49, 364]);
  });

  it("mostra no máximo cinco, os mais próximos", () => {
    const lista = upcomingBirthdays(
      Array.from({ length: 8 }, (_, i) =>
        cliente(String(i), `Cliente ${i}`, `1970-03-${String(13 + i).padStart(2, "0")}`),
      ),
      { today: "2026-03-12" },
    );

    expect(lista).toHaveLength(5);
    expect(lista.map((p) => p.inDays)).toEqual([1, 2, 3, 4, 5]);
  });

  it("sem janela, um aniversário distante continua aparecendo", () => {
    // É o ponto da mudança: em base pequena o cartão vivia vazio.
    const [pessoa] = upcomingBirthdays([cliente("1", "Daqui a meio ano", "1970-09-20")], {
      today: "2026-03-12",
    });
    expect(pessoa.inDays).toBe(192);
  });

  it("vira o ano: em dezembro, janeiro já conta", () => {
    const lista = upcomingBirthdays([cliente("1", "Ano que vem", "1975-01-02")], {
      today: "2026-12-28",
    });

    expect(lista[0]).toMatchObject({ date: "2027-01-02", inDays: 5, turning: 52 });
  });

  it("29 de fevereiro comemora em 1º de março nos anos comuns", () => {
    const comum = upcomingBirthdays([cliente("1", "Bissexta", "1996-02-29")], {
      today: "2026-02-20",
    });
    expect(comum[0]).toMatchObject({ date: "2026-03-01", inDays: 9, turning: 30 });

    const bissexto = upcomingBirthdays([cliente("1", "Bissexta", "1996-02-29")], {
      today: "2028-02-20",
    });
    expect(bissexto[0].date).toBe("2028-02-29");
  });

  it("conta a idade que a pessoa completa, não a que tem hoje", () => {
    const [pessoa] = upcomingBirthdays([cliente("1", "Alguém", "1961-03-20")], {
      today: "2026-03-12",
    });
    expect(pessoa.turning).toBe(65);
  });

  it("ignora quem não tem data, id ou nome — e data que não é data", () => {
    const lista = upcomingBirthdays(
      [
        cliente("1", "Sem data", undefined),
        cliente("2", "Data torta", "12/03/1961"),
        cliente("3", "Mês impossível", "1961-13-12"),
        { fullName: "Sem id", birthDate: "1961-03-12" },
        cliente("5", "   ", "1961-03-12"),
      ],
      { today: "2026-03-12" },
    );

    expect(lista).toEqual([]);
  });

  it("não afirma idade quando o nascimento está no futuro", () => {
    const [pessoa] = upcomingBirthdays([cliente("1", "Dado errado", "2027-03-15")], {
      today: "2026-03-12",
    });
    expect(pessoa.turning).toBeNull();
  });

  it("desempata pelo nome, não pela ordem que a listagem trouxe", () => {
    const lista = upcomingBirthdays(
      [cliente("1", "Zilda", "1970-03-15"), cliente("2", "Ana", "1980-03-15")],
      { today: "2026-03-12" },
    );
    expect(lista.map((p) => p.name)).toEqual(["Ana", "Zilda"]);
  });
});

describe("birthdayCountdown", () => {
  it("fala em dias, e nomeia hoje e amanhã", () => {
    expect(birthdayCountdown(0)).toBe("hoje");
    expect(birthdayCountdown(1)).toBe("amanhã");
    expect(birthdayCountdown(5)).toBe("em 5 dias");
  });
});
