import { describe, expect, it } from "vitest";
import {
  FIELD_STRATEGIES,
  defineSection,
  formatValue,
  initialValues,
  ruleOf,
  rulesOf,
  validateValues,
} from "@/components/ui/form/schema";

const schema = defineSection({
  name: { kind: "text", label: "Nome", required: true },
  cpf: { kind: "cpf", label: "CPF" },
  gender: {
    kind: "select",
    label: "Gênero",
    required: "o gênero",
    options: [{ id: "FEMININO", label: "Feminino" }],
  },
  active: { kind: "switch", label: "Ativo?" },
  note: { kind: "text", label: "Nota" },
  confirm: {
    kind: "text",
    label: "Confirmação",
    rule: (value, values) => (value === values.name ? null : "Não confere."),
  },
});

describe("initialValues", () => {
  it("texto nasce vazio e switch nasce falso", () => {
    expect(initialValues(schema)).toEqual({
      name: "",
      cpf: "",
      gender: "",
      active: false,
      note: "",
      confirm: "",
    });
  });

  it("respeita o `initial` declarado", () => {
    const withInitial = defineSection({ isPrimary: { kind: "switch", label: "Principal", initial: true } });
    expect(initialValues(withInitial)).toEqual({ isPrimary: true });
  });
});

describe("ruleOf", () => {
  it("obrigatório usa o rótulo na mensagem", () => {
    expect(ruleOf(schema.name)("", {})).toBe("O campo Nome é obrigatório.");
  });

  it("select obrigatório pede a seleção com o nome declarado", () => {
    expect(ruleOf(schema.gender)("", {})).toBe("Selecione o gênero.");
    expect(ruleOf(schema.gender)("FEMININO", {})).toBeNull();
  });

  it("o tipo traz o validador de formato, que deixa o vazio passar", () => {
    expect(ruleOf(schema.cpf)("", {})).toBeNull();
    expect(ruleOf(schema.cpf)("111.111.111-11", {})).toBe("CPF inválido.");
    expect(ruleOf(schema.cpf)("529.982.247-25", {})).toBeNull();
  });

  it("a regra própria recebe os demais valores (regra cruzada)", () => {
    expect(ruleOf(schema.confirm)("ana", { name: "ana" })).toBeNull();
    expect(ruleOf(schema.confirm)("bia", { name: "ana" })).toBe("Não confere.");
  });

  it("`replacesKindRule` troca o validador do tipo pela regra própria", () => {
    const loose = ruleOf({ kind: "cpf", label: "CPF", rule: () => null, replacesKindRule: true });
    expect(loose("123", {})).toBeNull();
  });
});

describe("rulesOf e validateValues", () => {
  it("só entram campos com alguma regra", () => {
    expect(Object.keys(rulesOf(schema)).sort()).toEqual(["confirm", "cpf", "gender", "name"]);
  });

  it("devolve só os campos com erro; switch é avaliado como texto vazio", () => {
    const errors = validateValues(rulesOf(schema), {
      ...initialValues(schema),
      name: "Ana",
      confirm: "Ana",
    });
    expect(errors).toEqual({ gender: "Selecione o gênero." });
  });
});

describe("FIELD_STRATEGIES", () => {
  it("cada tipo mascara o que se digita", () => {
    expect(FIELD_STRATEGIES.cpf.mask?.("52998224725")).toBe("529.982.247-25");
    expect(FIELD_STRATEGIES.cep.mask?.("30140071")).toBe("30140-071");
    expect(FIELD_STRATEGIES.uf.mask?.("mg")).toBe("MG");
    expect(FIELD_STRATEGIES.digits.mask?.("3a3-")).toBe("33");
    expect(FIELD_STRATEGIES.email.mask?.(" a@b.c ")).toBe("a@b.c");
  });

  it("e escolhe o controle que desenha", () => {
    expect(FIELD_STRATEGIES.select.control).toBe("select");
    expect(FIELD_STRATEGIES.date.control).toBe("date");
    expect(FIELD_STRATEGIES.password.control).toBe("password");
    expect(FIELD_STRATEGIES.mobile.control).toBe("text");
  });
});

describe("formatValue", () => {
  it("select vira o rótulo da opção; desconhecido fica como veio", () => {
    expect(formatValue(schema.gender, "FEMININO")).toBe("Feminino");
    expect(formatValue(schema.gender, "OUTRO")).toBe("OUTRO");
  });

  it("datas viram dd/mm/aaaa, com hora quando houver", () => {
    expect(formatValue({ kind: "date", label: "D" }, "2026-03-12")).toBe("12/03/2026");
    expect(formatValue({ kind: "datetime", label: "D" }, "2026-03-12T14:05")).toBe("12/03/2026 às 14:05");
  });

  it("switch é Sim/Não; vazio é vazio; senha nunca aparece", () => {
    expect(formatValue(schema.active, true)).toBe("Sim");
    expect(formatValue(schema.active, false)).toBe("Não");
    expect(formatValue(schema.note, "")).toBe("");
    expect(formatValue({ kind: "password", label: "S" }, "segredo")).toBe("••••••");
  });
});
