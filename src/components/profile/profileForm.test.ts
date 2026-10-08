import { describe, expect, it } from "vitest";

import {
  EMPTY_PASSWORD_VALUES,
  MIN_PASSWORD_LENGTH,
  fieldError,
  firstMessage,
  profileChanged,
  profileValuesFrom,
  hasError,
  toPasswordRequest,
  toProfileRequest,
  validatePassword,
  validateProfile,
} from "./profileForm";
import type { MyProfile } from "@/interfaces/user/User.interface";

const profile: MyProfile = {
  id: "u-1",
  fullName: "Tânia Melo",
  email: "tania@exemplo.com",
  username: "dra.tania",
  role: "Administrador",
  active: true,
};

describe("profileValuesFrom", () => {
  it("traz só o que se edita — username e papel ficam de fora", () => {
    expect(profileValuesFrom(profile)).toEqual({
      fullName: "Tânia Melo",
      email: "tania@exemplo.com",
    });
  });

  it("perfil ausente vira campos vazios, não undefined", () => {
    // Campo controlado com `undefined` vira campo não-controlado no React e o
    // primeiro caractere digitado dispara o aviso — e some.
    expect(profileValuesFrom(null)).toEqual({ fullName: "", email: "" });
  });
});

describe("validateProfile", () => {
  it("aceita nome e e-mail válidos", () => {
    expect(validateProfile(profileValuesFrom(profile))).toEqual({});
  });

  it("nome vazio é obrigatório", () => {
    const errors = validateProfile({ fullName: "   ", email: "a@b.com" });
    expect(errors.fullName).toBeTruthy();
  });

  it("e-mail vazio pede o campo, e-mail torto pede o formato", () => {
    expect(validateProfile({ fullName: "Ana", email: "" }).email).toMatch(
      /obrigat/i,
    );
    expect(
      validateProfile({ fullName: "Ana", email: "ana@" }).email,
    ).toBeTruthy();
  });
});

describe("profileMudou", () => {
  it("é falso quando nada mudou — salvar à toa é toast de sucesso mentindo", () => {
    expect(profileChanged(profileValuesFrom(profile), profile)).toBe(false);
  });

  it("espaço nas pontas não conta como mudança", () => {
    expect(
      profileChanged(
        { fullName: "  Tânia Melo  ", email: " tania@exemplo.com " },
        profile,
      ),
    ).toBe(false);
  });

  it("é verdadeiro quando o nome muda de verdade", () => {
    expect(
      profileChanged({ fullName: "Tânia M.", email: profile.email }, profile),
    ).toBe(true);
  });

  it("sem perfil carregado, qualquer coisa digitada conta como mudança", () => {
    expect(profileChanged({ fullName: "Ana", email: "" }, null)).toBe(true);
  });
});

describe("toProfileRequest", () => {
  it("apara as pontas — e-mail com espaço passaria por endereço diferente", () => {
    expect(
      toProfileRequest({ fullName: "  Ana  ", email: " ana@x.com " }),
    ).toEqual({ fullName: "Ana", email: "ana@x.com" });
  });
});

describe("validatePassword", () => {
  const base = {
    currentPassword: "senhaAtual1",
    newPassword: "senhaNova123",
    confirmPassword: "senhaNova123",
  };

  it("aceita o caso feliz", () => {
    expect(validatePassword(base)).toEqual({});
  });

  it("exige a senha atual mesmo com sessão válida", () => {
    const errors = validatePassword({ ...base, currentPassword: "" });
    expect(errors.currentPassword).toBeTruthy();
  });

  it(`recusa nova senha com menos de ${MIN_PASSWORD_LENGTH} caracteres`, () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const errors = validatePassword({
      ...base,
      newPassword: short,
      confirmPassword: short,
    });
    expect(errors.newPassword).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("recusa nova senha igual à atual antes de ir ao servidor", () => {
    const errors = validatePassword({
      currentPassword: "mesmaSenha123",
      newPassword: "mesmaSenha123",
      confirmPassword: "mesmaSenha123",
    });
    expect(errors.newPassword).toMatch(/diferente/i);
  });

  it("confirmação divergente acusa na confirmação, não na nova", () => {
    const errors = validatePassword({ ...base, confirmPassword: "outraCoisa1" });
    expect(errors.confirmPassword).toMatch(/não conferem/i);
    expect(errors.newPassword).toBeUndefined();
  });

  it("tudo vazio acusa os três campos de uma vez", () => {
    const errors = validatePassword(EMPTY_PASSWORD_VALUES);
    expect(Object.keys(errors).sort()).toEqual([
      "confirmPassword",
      "currentPassword",
      "newPassword",
    ]);
  });
});

describe("toPasswordRequest", () => {
  it("não manda a confirmação — ela é contra erro de digitação, não contrato", () => {
    const body = toPasswordRequest({
      currentPassword: "a-senha-1",
      newPassword: "b-senha-2",
      confirmPassword: "b-senha-2",
    });
    expect(body).toEqual({
      currentPassword: "a-senha-1",
      newPassword: "b-senha-2",
    });
  });

  it("não apara espaço: espaço é caractere de senha", () => {
    const body = toPasswordRequest({
      currentPassword: " com espaco ",
      newPassword: " nova senha ",
      confirmPassword: " nova senha ",
    });
    expect(body.currentPassword).toBe(" com espaco ");
    expect(body.newPassword).toBe(" nova senha ");
  });
});

describe("erroDoCampo", () => {
  const error = {
    response: {
      data: {
        success: false,
        errors: [
          { field: "currentPassword", message: "Senha atual incorreta.", code: "X" },
          { field: null, message: "Requisição inválida.", code: "Y" },
        ],
      },
    },
  };

  it("acha a mensagem do campo pedido", () => {
    expect(fieldError(error, "currentPassword")).toBe("Senha atual incorreta.");
  });

  it("devolve null para campo que não errou — não empresta a mensagem do vizinho", () => {
    expect(fieldError(error, "newPassword")).toBeNull();
  });

  it("aguenta erro sem envelope (rede caiu, timeout)", () => {
    expect(fieldError(new Error("Network Error"), "email")).toBeNull();
    expect(fieldError(undefined, "email")).toBeNull();
  });
});

describe("primeiraMensagem", () => {
  it("usa o primeiro erro do envelope", () => {
    expect(
      firstMessage({
        response: { data: { errors: [{ message: "Deu ruim." }] } },
      }),
    ).toBe("Deu ruim.");
  });

  it("cai para message quando não há lista de erros", () => {
    expect(
      firstMessage({ response: { data: { message: "Sem permissão." } } }),
    ).toBe("Sem permissão.");
  });

  it("sem nada aproveitável devolve null, para quem chama usar o texto próprio", () => {
    expect(firstMessage({})).toBeNull();
  });
});

describe("temErro", () => {
  it("mapa vazio não tem erro", () => {
    expect(hasError({})).toBe(false);
  });

  it("chave existente com undefined não conta como erro", () => {
    // O `setCampo` limpa o erro colocando `undefined` na chave em vez de
    // removê-la; sem esta regra o botão ficaria travado para sempre.
    expect(hasError({ email: undefined })).toBe(false);
  });

  it("qualquer mensagem presente conta", () => {
    expect(hasError({ email: "inválido" })).toBe(true);
  });
});
