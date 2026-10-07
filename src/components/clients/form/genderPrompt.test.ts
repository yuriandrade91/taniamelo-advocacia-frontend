import { describe, expect, it } from "vitest";
import {
  DISABILITY_BENEFIT,
  GENDER_PROMPT_OPTIONS,
  initialGenderChoice,
  shouldAskGender,
} from "./genderPrompt";
import { GenderOptions } from "@/enums/gender/Gender";
import { BenefitOptions } from "@/enums/benefit/Benefits";

describe("a pergunta de sexo no cadastro", () => {
  it("abre ao trocar para a aposentadoria por deficiência", () => {
    expect(shouldAskGender("", DISABILITY_BENEFIT)).toBe(true);
    expect(shouldAskGender("APOSENTADORIA_POR_IDADE", DISABILITY_BENEFIT)).toBe(
      true,
    );
  });

  it("não abre ao escolher de novo o mesmo benefício", () => {
    expect(shouldAskGender(DISABILITY_BENEFIT, DISABILITY_BENEFIT)).toBe(false);
  });

  it("não abre para nenhum outro benefício", () => {
    for (const option of BenefitOptions) {
      if (option.value === DISABILITY_BENEFIT) continue;
      expect(shouldAskGender("", option.value)).toBe(false);
      expect(shouldAskGender(DISABILITY_BENEFIT, option.value)).toBe(false);
    }
  });

  it("a chave do benefício existe no enum — renomear lá quebraria a pergunta", () => {
    expect(BenefitOptions.map((option) => option.value)).toContain(
      DISABILITY_BENEFIT,
    );
  });

  it("as opções são chaves válidas do campo Gênero", () => {
    const keys = GenderOptions.map((option) => option.value);
    for (const option of GENDER_PROMPT_OPTIONS) {
      expect(keys).toContain(option.value);
    }
  });

  it("marca o gênero atual só quando é uma das duas opções", () => {
    expect(initialGenderChoice("FEMININO")).toBe("FEMININO");
    expect(initialGenderChoice("MASCULINO")).toBe("MASCULINO");
    expect(initialGenderChoice("NAO_BINARIO")).toBe("");
    expect(initialGenderChoice("")).toBe("");
  });
});
