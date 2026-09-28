/**
 * Papéis de acesso — espelha `com.lawfirm.law.firm.model.Role`.
 *
 * Este arquivo antes declarava `Admin = 1` e `Assistant = 2`, papéis que nunca
 * existiram no backend. Nada o importava, então a divergência não quebrava
 * nada — só respondia errado a quem fosse conferir "quais papéis existem?".
 *
 * O corte real é entre **operar e destruir**: STAFF faz o dia a dia inteiro
 * (cadastra e edita cliente, marca, cancela e conclui compromisso); excluir,
 * restaurar e ler a senha do INSS exigem ADMIN ou LAWYER. O financeiro tem
 * corte próprio e mais estrito, só ADMIN. Quem impõe isso é o backend; quem
 * decide o que a tela oferece é `lib/permissions.ts`.
 *
 * Diferente dos demais enums do projeto, este **não** passa por `@JsonValue`:
 * a API devolve o nome da constante (`"ADMIN"`), não um rótulo PT-BR. O rótulo
 * abaixo existe só para exibição.
 */

export const ROLE_ENTRIES = [
  ["ADMIN", "Administrador"],
  ["LAWYER", "Advogado"],
  ["STAFF", "Atendente"],
] as const;

export type RoleKey = (typeof ROLE_ENTRIES)[number][0];
export type RoleLabel = (typeof ROLE_ENTRIES)[number][1];

export const RoleLabelByKey = Object.fromEntries(ROLE_ENTRIES) as Record<
  RoleKey,
  RoleLabel
>;

export const RoleOptions = ROLE_ENTRIES.map(([value, label]) => ({
  value,
  label,
}));

/**
 * Rótulo de exibição. Papel desconhecido volta como veio, em vez de virar
 * "—": se o backend ganhar um papel novo, a tela mostra o nome cru e alguém
 * percebe, em vez de esconder a novidade atrás de um travessão.
 */
export const getRoleLabel = (value?: string | null): string => {
  if (!value) return "—";
  return RoleLabelByKey[value as RoleKey] ?? value;
};
