import { describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
  validateBirthDate,
  validateCEP,
  validateContributionPart,
  validateCPF,
  validateDate,
  validateEmail,
  validatePastDate,
  validatePhone,
  validateRequired,
  validateRequiredSelection,
  validateUF,
} from "./validators";

/** ISO de hoje deslocado em dias — evita datas fixas que expiram. */
const isoOffsetDays = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

describe("validateCPF", () => {
  it("aceita CPF válido, com ou sem máscara", () => {
    // Mesmo CPF do seed de mock (Maria Aparecida).
    expect(validateCPF("390.533.447-05")).toBeNull();
    expect(validateCPF("39053344705")).toBeNull();
  });

  it("rejeita dígito verificador errado", () => {
    expect(validateCPF("390.533.447-06")).toBe("CPF inválido.");
  });

  it("rejeita sequência de dígito repetido", () => {
    expect(validateCPF("111.111.111-11")).toBe("CPF inválido.");
    expect(validateCPF("000.000.000-00")).toBe("CPF inválido.");
  });

  it("rejeita quantidade errada de dígitos", () => {
    expect(validateCPF("390.533.447")).toBe("CPF deve ter 11 dígitos.");
  });

  it("vazio não é erro deste validador — quem exige é validateRequired", () => {
    expect(validateCPF("")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("aceita endereços comuns e TLD longo", () => {
    expect(validateEmail("dra.tania@taniamelo.adv.br")).toBeNull();
    expect(validateEmail("nome@escritorio.advogado")).toBeNull();
    expect(validateEmail("a@b.co")).toBeNull();
  });

  it("rejeita o que não tem cara de e-mail", () => {
    expect(validateEmail("sem-arroba.com")).toBe("E-mail inválido.");
    expect(validateEmail("dois@@arrobas.com")).toBe("E-mail inválido.");
    expect(validateEmail("sem@dominio")).toBe("E-mail inválido.");
    expect(validateEmail("com espaco@dominio.com")).toBe("E-mail inválido.");
  });
});

describe("validateDate", () => {
  it("aceita ISO real", () => {
    expect(validateDate("1991-02-28")).toBeNull();
    expect(validateDate("2024-02-29")).toBeNull(); // ano bissexto
  });

  it("rejeita data que não existe no calendário", () => {
    expect(validateDate("2026-02-31")).toBe("Data inválida.");
    expect(validateDate("2025-02-29")).toBe("Data inválida."); // não bissexto
    expect(validateDate("2026-13-01")).toBe("Data inválida.");
  });

  it("rejeita lixo em volta de uma data válida", () => {
    // Os dois passavam na versão anterior por causa da precedência do regex.
    expect(validateDate("lixo01/01/2000")).toBe("Data inválida.");
    expect(validateDate("2020-01-01LIXO")).toBe("Data inválida.");
  });
});

describe("validateBirthDate", () => {
  it("aceita data passada real", () => {
    expect(validateBirthDate("1991-02-28")).toBeNull();
  });

  it("rejeita futuro", () => {
    expect(validateBirthDate(isoOffsetDays(1))).toBe(
      "Data de nascimento não pode estar no futuro.",
    );
  });

  it("aceita hoje (recém-nascido é caso válido)", () => {
    expect(validateBirthDate(isoOffsetDays(0))).toBeNull();
  });

  it("sinaliza ano implausível — pega erro de digitação", () => {
    expect(validateBirthDate("1091-05-10")).toBe("Verifique o ano de nascimento.");
  });
});

describe("validatePastDate", () => {
  it("rejeita futuro com o nome do campo na mensagem", () => {
    expect(validatePastDate(isoOffsetDays(2), "Emissão do RG")).toBe(
      "Emissão do RG não pode estar no futuro.",
    );
  });

  it("aceita passado", () => {
    expect(validatePastDate("2010-06-01", "Emissão do RG")).toBeNull();
  });
});

describe("ageFromBirthDate", () => {
  it("calcula a idade em anos completos", () => {
    const d = new Date();
    // Aniversário já passou neste ano: 30 anos exatos.
    const iso = `${d.getUTCFullYear() - 30}-01-01`;
    const expected = d.getUTCMonth() === 0 && d.getUTCDate() < 1 ? 29 : 30;
    expect(ageFromBirthDate(iso)).toBe(expected);
  });

  it("ainda não fez aniversário este ano", () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    const iso = `${new Date().getUTCFullYear() - 30}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const age = ageFromBirthDate(iso);
    expect(age === 29 || age === 30).toBe(true);
  });

  it("devolve null para entrada inválida", () => {
    expect(ageFromBirthDate("")).toBeNull();
    expect(ageFromBirthDate("2026-02-31")).toBeNull();
  });
});

describe("validadores simples", () => {
  it("validateRequired", () => {
    expect(validateRequired("   ", "Nome")).toBe("O campo Nome é obrigatório.");
    expect(validateRequired("Yuri", "Nome")).toBeNull();
  });

  it("validateRequiredSelection", () => {
    expect(validateRequiredSelection("", "o gênero")).toBe("Selecione o gênero.");
    expect(validateRequiredSelection(null, "o gênero")).toBe("Selecione o gênero.");
    expect(validateRequiredSelection("MASCULINO", "o gênero")).toBeNull();
  });

  it("validatePhone aceita fixo e celular", () => {
    expect(validatePhone("(31) 3333-1111")).toBeNull();
    expect(validatePhone("(31) 98888-1111")).toBeNull();
    expect(validatePhone("(31) 9")).toBe("Telefone inválido.");
  });

  it("validateCEP", () => {
    expect(validateCEP("30240-000")).toBeNull();
    expect(validateCEP("3024-000")).toBe("CEP deve ter 8 dígitos.");
  });

  it("validateUF", () => {
    expect(validateUF("MG")).toBeNull();
    expect(validateUF("mg")).toBeNull();
    expect(validateUF("MGX")).toBe("UF inválida.");
  });

  it("validateContributionPart", () => {
    // Em branco é "não informado", e é válido - quem exige alguma coisa aqui
    // seria o backend, e ele também aceita os três ausentes.
    expect(validateContributionPart("", 130, "Anos")).toBeNull();
    expect(validateContributionPart("0", 130, "Anos")).toBeNull();
    expect(validateContributionPart("130", 130, "Anos")).toBeNull();
    expect(validateContributionPart("131", 130, "Anos")).toBe(
      "Anos: no máximo 130.",
    );
    expect(validateContributionPart("12", 11, "Meses")).toBe(
      "Meses: no máximo 11.",
    );
    expect(validateContributionPart("30", 29, "Dias")).toBe(
      "Dias: no máximo 29.",
    );
    expect(validateContributionPart("-1", 130, "Anos")).toBe(
      "Anos: informe só números.",
    );
  });
});
