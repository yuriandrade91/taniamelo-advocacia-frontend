/**
 * "Meus dados" — regras e payloads.
 *
 * Módulo puro pelo mesmo motivo de `wallet/entryForms`: o que dá para conferir
 * sem abrir o navegador mora aqui, e a página só renderiza campo e chama
 * serviço.
 *
 * ## Por que a senha atual é obrigatória
 *
 * A sessão já está válida — o backend sabe quem é a pessoa pelo token. Ainda
 * assim ele exige a senha atual, e a tela exige antes dele: é o que separa
 * "quem está logado" de "quem sabe a senha", e é a diferença entre um
 * navegador deixado aberto e uma conta tomada. O servidor recusa de qualquer
 * jeito; validar aqui só evita a viagem.
 *
 * ## O que não se edita
 *
 * `username` e `role` não entram no payload. O username é o login — mudá-lo
 * trocaria a identidade da sessão em curso. O papel é autorização: quem pode
 * mudar o próprio papel não tem papel.
 */

import { validateEmail, validateRequired } from "@/lib/validators/validators";
import type {
  ChangePasswordRequest,
  MyProfile,
  MyProfileUpdateRequest,
} from "@/interfaces/user/User.interface";

/** Tamanho mínimo da nova senha — o mesmo `@Size(min = 8)` do backend. */
export const SENHA_MINIMA = 8;

// ───────────────────────────── Dados ─────────────────────────────

export type ProfileValues = {
  fullName: string;
  email: string;
};

export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

export const profileValuesFrom = (perfil: MyProfile | null): ProfileValues => ({
  fullName: perfil?.fullName ?? "",
  email: perfil?.email ?? "",
});

export function validateProfile(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {};
  const nome = validateRequired(values.fullName, "Nome");
  if (nome) errors.fullName = nome;

  const obrigatorio = validateRequired(values.email, "E-mail");
  if (obrigatorio) errors.email = obrigatorio;
  else {
    const formato = validateEmail(values.email);
    if (formato) errors.email = formato;
  }
  return errors;
}

/**
 * Salvar sem ter mudado nada é requisição à toa — e, pior, um toast de sucesso
 * que ensina a pessoa a clicar em "Salvar" por reflexo para conferir se salvou.
 */
export function profileMudou(
  values: ProfileValues,
  perfil: MyProfile | null,
): boolean {
  const original = profileValuesFrom(perfil);
  return (
    values.fullName.trim() !== original.fullName.trim() ||
    values.email.trim() !== original.email.trim()
  );
}

export function toProfileRequest(
  values: ProfileValues,
): MyProfileUpdateRequest {
  return {
    fullName: values.fullName.trim(),
    // O backend compara e-mail para recusar duplicado; espaço nas pontas faria
    // "ana@x.com " passar por endereço diferente de "ana@x.com".
    email: values.email.trim(),
  };
}

// ───────────────────────────── Senha ─────────────────────────────

export type PasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

export const EMPTY_PASSWORD_VALUES: PasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function validatePassword(values: PasswordValues): PasswordErrors {
  const errors: PasswordErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Informe a senha atual.";
  }

  if (!values.newPassword) {
    errors.newPassword = "Informe a nova senha.";
  } else if (values.newPassword.length < SENHA_MINIMA) {
    errors.newPassword = `A nova senha precisa ter ao menos ${SENHA_MINIMA} caracteres.`;
  } else if (values.newPassword === values.currentPassword) {
    // O backend também recusa. Recusar aqui evita que a pessoa descubra isso
    // só depois de digitar as três caixas e clicar.
    errors.newPassword = "A nova senha precisa ser diferente da atual.";
  }

  /**
   * A confirmação não vai para o servidor — ela existe contra o erro de
   * digitação numa caixa cujo conteúdo não se lê. Sem ela, um dedo trocado
   * vira uma senha que ninguém sabe qual é.
   */
  if (!values.confirmPassword) {
    errors.confirmPassword = "Repita a nova senha.";
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "As senhas não conferem.";
  }

  return errors;
}

export function toPasswordRequest(
  values: PasswordValues,
): ChangePasswordRequest {
  // Sem trim: espaço é caractere de senha. Aparar aqui recusaria silenciosamente
  // uma senha legítima e faria a pessoa achar que esqueceu a própria.
  return {
    currentPassword: values.currentPassword,
    newPassword: values.newPassword,
  };
}

export const temErro = (errors: Record<string, string | undefined>): boolean =>
  Object.values(errors).some(Boolean);

/**
 * Mensagem de erro que o servidor devolveu para um campo.
 *
 * A troca de senha falha por motivos que pertencem a um campo específico —
 * "senha atual incorreta", "a nova senha é igual à atual" — e o envelope traz
 * exatamente isso em `errors[].field`. Jogar tudo num toast genérico faria a
 * pessoa adivinhar qual das três caixas está errada.
 */
export function erroDoCampo(erro: unknown, campo: string): string | null {
  const envelope = (erro as { response?: { data?: unknown } })?.response?.data;
  const errors = (envelope as { errors?: unknown })?.errors;
  if (!Array.isArray(errors)) return null;
  for (const item of errors) {
    const registro = item as { field?: unknown; message?: unknown };
    if (registro?.field === campo && typeof registro.message === "string") {
      return registro.message;
    }
  }
  return null;
}

/** Primeira mensagem do envelope, para quando o erro não é de campo nenhum. */
export function primeiraMensagem(erro: unknown): string | null {
  const envelope = (erro as { response?: { data?: unknown } })?.response?.data;
  const errors = (envelope as { errors?: unknown })?.errors;
  if (Array.isArray(errors)) {
    for (const item of errors) {
      const mensagem = (item as { message?: unknown })?.message;
      if (typeof mensagem === "string" && mensagem) return mensagem;
    }
  }
  const mensagem = (envelope as { message?: unknown })?.message;
  return typeof mensagem === "string" && mensagem ? mensagem : null;
}
