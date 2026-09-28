/**
 * Validadores de formulário.
 *
 * Convenção: cada função devolve a **mensagem de erro** ou `null` quando o
 * valor é válido. Campos vazios devolvem `null` — obrigatoriedade é
 * responsabilidade de `validateRequired`, para que o mesmo validador sirva a
 * campo opcional e obrigatório.
 *
 * Regra que orienta tudo aqui: **o front nunca deve ser mais rígido que o
 * backend**. Rejeitar no navegador o que a API aceitaria é bloquear o usuário
 * por engano, e o erro fica invisível para quem escreveu a regra. Onde há
 * validação equivalente em Java, a referência está anotada no validador.
 */

import { todayIso } from "@/lib/period";

/** Só os dígitos — CPF, telefone e afins chegam mascarados da UI. */
const digitsOf = (value: string) => value.replace(/\D/g, "");

export function validateRequired(
  value: string,
  fieldName: string,
): string | null {
  if (!value || value.trim() === "") {
    return `O campo ${fieldName} é obrigatório.`;
  }
  return null;
}

/** Obrigatoriedade de select/enum, onde o valor vazio é `""` ou `null`. */
export function validateRequiredSelection(
  value: string | null | undefined,
  fieldName: string,
): string | null {
  if (!value) return `Selecione ${fieldName}.`;
  return null;
}

/**
 * E-mail.
 *
 * Espelha o `@Email` do Jakarta (Hibernate Validator), que é deliberadamente
 * permissivo: exige `algo@dominio` sem espaços e pouco mais. A versão anterior
 * daqui exigia TLD de 2 a 4 letras e reprovava endereços válidos e comuns no
 * meio jurídico (`@escritorio.advogado`, qualquer `.company`/`.social`) que o
 * backend aceitaria sem reclamar.
 */
export function validateEmail(value: string): string | null {
  if (!value) return null;
  const email = value.trim();
  // Sem espaços, exatamente um "@", com conteúdo dos dois lados e um ponto
  // no domínio — o mesmo espírito da checagem do Jakarta.
  const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  return emailRegex.test(email) ? null : "E-mail inválido.";
}

/**
 * CPF com dígitos verificadores.
 *
 * Espelha `com.lawfirm.law.firm.validation.CpfValidator`: 11 dígitos, rejeita
 * sequências de dígito repetido e confere os dois verificadores. Mantê-los
 * iguais evita o pior caso — o formulário deixar passar um CPF que o backend
 * devolve como 400 depois de o usuário preencher a ficha inteira.
 */
export function validateCPF(value: string): string | null {
  if (!value) return null;
  const cpf = digitsOf(value);
  if (cpf.length !== 11) return "CPF deve ter 11 dígitos.";
  if (/^(\d)\1{10}$/.test(cpf)) return "CPF inválido.";

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const result = 11 - (sum % 11);
    return result >= 10 ? 0 : result;
  };

  if (checkDigit(9) !== Number(cpf[9])) return "CPF inválido.";
  if (checkDigit(10) !== Number(cpf[10])) return "CPF inválido.";
  return null;
}

export function validateRG(value: string): string | null {
  if (!value) return null;
  const rg = digitsOf(value);
  if (rg.length < 7 || rg.length > 9) return "RG inválido.";
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value) return null;
  const phone = digitsOf(value);
  if (phone.length < 10 || phone.length > 11) return "Telefone inválido.";
  return null;
}

export function validateNIT(value: string): string | null {
  if (!value) return null;
  const nit = digitsOf(value);
  if (nit.length !== 11) return "NIT/PIS deve ter 11 dígitos.";
  return null;
}

export function validateCTPS(value: string): string | null {
  if (!value) return null;
  const ctps = digitsOf(value);
  if (ctps.length < 7 || ctps.length > 8) return "CTPS inválida.";
  return null;
}

/**
 * Tempo de contribuição: anos, meses e dias em campos separados.
 *
 * Mesmas faixas do backend (`TempoDeContribuicao`), replicadas aqui só para o
 * erro aparecer enquanto se digita em vez de depois do 400. A regra continua
 * sendo do servidor - convenção previdenciária de mês de 30 dias e ano de 12
 * meses, por isso meses vai até 11 e dias até 29.
 */
export function validateContributionPart(
  value: string,
  max: number,
  fieldName: string,
): string | null {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim())) return `${fieldName}: informe só números.`;
  const n = Number(value);
  if (n > max) return `${fieldName}: no máximo ${max}.`;
  return null;
}

export function validateCEP(value: string): string | null {
  if (!value) return null;
  const cep = digitsOf(value);
  if (cep.length !== 8) return "CEP deve ter 8 dígitos.";
  return null;
}

/** UF — usada no endereço, onde o backend exige `state` não vazio. */
export function validateUF(value: string): string | null {
  if (!value) return null;
  return /^[A-Za-z]{2}$/.test(value.trim()) ? null : "UF inválida.";
}

/**
 * `true` quando a data existe de fato no calendário.
 *
 * Um regex de formato não basta: `2026-02-31` casa com qualquer `\d{4}-\d{2}-\d{2}`
 * e não existe. Reconstruímos a data e conferimos se o `Date` manteve os mesmos
 * componentes — se o mês virou março, a entrada era inválida.
 */
function isRealIsoDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Data em ISO (`yyyy-MM-dd`) — o formato que o backend espera para `LocalDate`.
 *
 * A versão anterior usava `/^(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})$/`, que
 * tem um bug de precedência: o `^` prende só a primeira alternativa e o `$` só
 * a segunda. Na prática `"lixo01/01/2000"` e `"2020-01-01LIXO"` passavam, e
 * `"2026-02-31"` também.
 */
export function validateDate(value: string): string | null {
  if (!value) return null;
  return isRealIsoDate(value.trim()) ? null : "Data inválida.";
}

/**
 * Data de nascimento: precisa ser real, não pode estar no futuro e não pode
 * indicar idade implausível. O limite de 130 anos existe só para pegar erro de
 * digitação no ano (1091 em vez de 1991), não para julgar longevidade.
 */
export function validateBirthDate(value: string): string | null {
  const formatError = validateDate(value);
  if (formatError) return formatError;
  if (!value) return null;

  const birth = new Date(`${value.trim()}T00:00:00Z`);
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  if (birth.getTime() > todayUtc.getTime()) {
    return "Data de nascimento não pode estar no futuro.";
  }
  if (todayUtc.getUTCFullYear() - birth.getUTCFullYear() > 130) {
    return "Verifique o ano de nascimento.";
  }
  return null;
}

/** Data que não pode estar no futuro (emissão de RG, por exemplo). */
export function validatePastDate(value: string, fieldName: string): string | null {
  const formatError = validateDate(value);
  if (formatError) return formatError;
  if (!value) return null;

  const date = new Date(`${value.trim()}T00:00:00Z`);
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  return date.getTime() > todayUtc.getTime()
    ? `${fieldName} não pode estar no futuro.`
    : null;
}

/**
 * Data de liquidação — quando um pagamento ou despesa foi efetivamente pago.
 *
 * Difere de `validatePastDate` em duas coisas, e as duas importam: é
 * **obrigatória** quando o item foi liquidado (uma liquidação sem data não diz
 * em que mês o dinheiro se moveu), e o "hoje" é injetável, para o teste não
 * depender do relógio.
 *
 * Data no futuro é o erro que faz o caixa mentir: o mês fecha contando
 * dinheiro que ainda não se moveu. Vencimento futuro, ao contrário, é o caso
 * normal — é o que "a vencer" significa.
 */
export function validatePaidDate(
  value: string,
  isSettled: boolean,
  today: string = todayIso(),
): string | null {
  if (!isSettled) return null;
  if (!value.trim()) return "Informe a data.";
  if (!isRealIsoDate(value.trim())) return "Data inválida.";
  if (value > today) return "A data de pagamento não pode ser no futuro.";
  return null;
}

export function validateSwitch(
  value: boolean,
  fieldName: string,
): string | null {
  if (typeof value !== "boolean") {
    return `O campo ${fieldName} deve ser verdadeiro ou falso.`;
  }
  return null;
}

/** Idade em anos a partir de uma data ISO — usada no campo somente leitura. */
export function ageFromBirthDate(value: string): number | null {
  if (!value || !isRealIsoDate(value.trim())) return null;
  const birth = new Date(`${value.trim()}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age < 0 ? null : age;
}
