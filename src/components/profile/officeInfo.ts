import type { Office } from "@/interfaces/tenant/Tenant.interface";
import { maskPhone } from "@/lib/masks/masks";

/**
 * As regras da seção "Escritório" de Meus dados, fora do componente para o
 * teste chegar nelas sem desenhar a tela.
 */

/** Os tipos que o backend aceita. SVG não entra: é documento e pode levar script. */
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const LOGO_ACCEPT = LOGO_TYPES.join(",");
/** O mesmo limite do backend: conferir aqui poupa o envio de um arquivo que volta recusado. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** O motivo de recusar o arquivo antes de enviar, ou `null`. O servidor confere de novo, pelos bytes. */
export function logoFileError(file: Pick<File, "type" | "size">): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) {
    return "A logo precisa ser uma imagem PNG, JPEG ou WebP.";
  }
  if (file.size > LOGO_MAX_BYTES) return "A logo pode ter até 2 MB.";
  return null;
}

/** O que a seção mostra do escritório, na ordem; o valor vazio vira "—". */
export const OFFICE_FIELDS = [
  { key: "razaoSocial", label: "Razão social" },
  { key: "cnpj", label: "CNPJ" },
  { key: "responsavel", label: "Responsável" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "plano", label: "Plano" },
] as const satisfies readonly { key: keyof Office; label: string }[];

/** O telefone vem com o 55 do Brasil (`+551133334444`); a tela mostra o número nacional. */
const nationalPhone = (phone: string) => {
  const digits = phone.replaceAll(/\D/g, "");
  return maskPhone(digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits);
};

export function officeValue(office: Office, key: (typeof OFFICE_FIELDS)[number]["key"]): string {
  const value = office[key]?.trim();
  if (!value) return "—";
  return key === "telefone" ? nationalPhone(value) : value;
}

/** O rótulo do botão de envio: há logo para trocar, ou é a primeira. */
export function sendLabel(isSending: boolean, hasLogo: boolean): string {
  if (isSending) return "Enviando...";
  return hasLogo ? "Trocar logo" : "Enviar logo";
}
