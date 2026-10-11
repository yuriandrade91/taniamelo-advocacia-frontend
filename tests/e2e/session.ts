/**
 * Onde fica a sessão do usuário padrão da suíte (ADMIN).
 *
 * Gravada pelo `auth.setup.ts` e lida pelo `playwright.config.ts`, pelos testes
 * que voltam ao ADMIN depois de trocar de usuário e pelo `apiHelper.ts`, que
 * tira dela o token para preparar e limpar massa pela API. Contém token
 * válido: o diretório `.auth/` está no `.gitignore`.
 */
export const ADMIN_STORAGE_STATE = "tests/e2e/.auth/user.json";
