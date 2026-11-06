import { API_BASE_URL } from "@/constants/endpoints/paths";
import { STORED_VALUE_EVENT } from "@/hooks/useStoredValue";
import { createSessionCache } from "./requestCache";

/**
 * A logo do escritório guardada no navegador — o que `useOfficeLogo` lê.
 *
 * Mora fora do hook porque a sessão (`lib/session`) também grava aqui, com o
 * `logoUrl` que o login e o refresh devolvem, e o hook importa o serviço de
 * tenant, que importa o `axiosService`, que importa a sessão: daqui o caminho
 * não fecha ciclo.
 */

/**
 * Uma conferência por escritório a cada carga de página: o cabeçalho, o site
 * e "Meus dados" esperam a mesma resposta em vez de pedir três vezes.
 */
export const officeLogoChecks = createSessionCache<string>(10);

/**
 * Por API e escritório (o mesmo escritório tem um caminho em cada backend,
 * como o UUID em `lib/tenant`). `""` é "marca padrão".
 */
export const officeLogoKey = (slug: string) => `officeLogo@${API_BASE_URL}@${slug}`;

/**
 * Grava a logo que o servidor acabou de dizer — no login, no refresh, ao
 * enviar ou remover. Vale como a conferência desta carga de página: a tela
 * não pergunta de novo ao `resolve` o que a resposta já trouxe.
 */
export function rememberOfficeLogo(slug: string, logoUrl: string | null): void {
  if (typeof document === "undefined") return;
  const value = logoUrl ?? "";
  officeLogoChecks.invalidate(slug);
  void officeLogoChecks.load(slug, () => Promise.resolve(value));
  try {
    localStorage.setItem(officeLogoKey(slug), value);
  } catch {
    return;
  }
  globalThis.dispatchEvent(new Event(STORED_VALUE_EVENT));
}
