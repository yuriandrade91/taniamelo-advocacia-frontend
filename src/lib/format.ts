/**
 * Formatação para exibição — pt-BR.
 *
 * Existia uma `formatBRL` privada dentro de `MonthlyBalance`. Com a área de
 * pagamentos, virariam duas cópias divergindo em casas decimais: o balanço
 * arredonda para inteiro (é um panorama), a tabela de pagamentos **não pode**
 * (R$ 1.234,56 arredondado para R$ 1.235 é um valor errado numa linha que a
 * pessoa vai conferir contra o extrato).
 *
 * Então são duas funções com nomes diferentes e uma só implementação por
 * baixo, em vez de uma função com um flag que alguém esquece de passar.
 */

/** Valor exato, com centavos: use em tabela, recibo, qualquer linha auditável. */
export const formatBRL = (value: number): string =>
  `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Valor arredondado, sem centavos: use em indicador e gráfico. */
export const formatBRLCompact = (value: number): string =>
  `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

/**
 * `yyyy-MM-dd` → `dd/MM/yyyy`.
 *
 * Recorte de string, não `new Date`. `new Date("2026-03-12")` é interpretado
 * como **UTC meia-noite**; em UTC-3 isso vira 11/03 na hora de exibir, e a
 * data de vencimento aparece um dia antes. O backend manda `LocalDate` — data
 * sem hora e sem fuso — então tratá-la como texto é o que preserva o sentido.
 */
export const formatDateBR = (iso?: string | null): string => {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "—";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

/** Rótulo da parcela: `2/12`, ou vazio quando o pagamento é único. */
export const formatInstallment = (
  current?: number | null,
  total?: number | null,
): string => (current && total ? `${current}/${total}` : "—");

/**
 * Interpreta um valor em reais digitado à mão.
 *
 * Dinheiro é onde um erro de pontuação vira erro de 100×, então as regras são
 * explícitas em vez de "dar um jeito":
 *
 * 1. **Tem vírgula** → padrão pt-BR: vírgula é decimal, pontos são milhar.
 *    `"1.234,56"` → `1234.56`
 * 2. **Sem vírgula, um único ponto, com 1 ou 2 dígitos depois** → alguém
 *    digitou no padrão americano. `"1234.56"` → `1234.56`
 * 3. **Qualquer outro ponto** é separador de milhar. `"1.234"` → `1234`,
 *    `"1.234.567"` → `1234567`
 *
 * A regra 2 existe porque teclado numérico costuma ter ponto, e `"1234.56"`
 * lido como milhar viraria R$ 123.456 — cem vezes o valor, sem nenhum sinal.
 *
 * Devolve `null` para o que não é número: quem chama decide se isso é erro de
 * validação ou campo vazio. **Nunca devolve 0 para entrada inválida** — zero é
 * um valor legítimo e confundir os dois esconde o erro.
 */
export function parseAmountBRL(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  let normalized: string;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = cleaned.split(".").length - 1;
    const afterLastDot = cleaned.slice(cleaned.lastIndexOf(".") + 1).length;
    normalized =
      dots === 1 && afterLastDot >= 1 && afterLastDot <= 2
        ? cleaned
        : cleaned.replace(/\./g, "");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
