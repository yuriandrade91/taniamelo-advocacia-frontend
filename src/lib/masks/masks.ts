// Funções de máscara para padrões brasileiros

/**
 * Só os dígitos.
 *
 * Mora aqui porque é o primeiro passo de toda máscara, e era a linha mais
 * copiada do projeto: estava escrita de novo nos validadores, no serviço de
 * CEP, no preenchimento automático de endereço e no schema de campos. Uma
 * cópia a mais é inofensiva; quatro é onde uma delas passa a aceitar o que as
 * outras recusam sem ninguém notar.
 */
export const digitsOf = (value: string) => value.replace(/\D/g, "");

export function maskCPF(value: string) {
  return digitsOf(value)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
export function maskRG(value: string) {
  return digitsOf(value)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1})$/, "$1-$2");
}
export function maskEmail(value: string) {
  return value.replace(/\s/g, "");
}
export function maskCelular(value: string) {
  return digitsOf(value)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}
/** Fixo (10 dígitos) ou celular (11): o hífen depois de 4 ou 5 dígitos, conforme o tamanho. */
export function maskTelefone(value: string) {
  const digits = digitsOf(value).slice(0, 11);
  const split = digits.length > 10 ? 7 : 6;
  if (digits.length <= 2) return digits;
  if (digits.length <= split) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}
export function maskNIT(value: string) {
  return digitsOf(value)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{5})(\d)/, "$1.$2")
    .replace(/(\d{2})(\d{1,2})$/, "$1-$2");
}
/**
 * CTPS: **só o número** (até 8 dígitos).
 *
 * A versão anterior montava "1234567/12345 MG" — número, série e UF no mesmo
 * campo. Mas série tem campo próprio (`ctpsSeries`, no DTO e na tela), e o
 * `validateCTPS` sempre exigiu 7 ou 8 dígitos: quem digitasse o exemplo do
 * placeholder via "CTPS inválida" sem ter errado nada. Um campo, um dado.
 */
export function maskCTPS(value: string) {
  return digitsOf(value).slice(0, 8);
}

export function maskCEP(value: string) {
  return digitsOf(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}
