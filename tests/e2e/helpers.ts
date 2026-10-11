import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Os gestos de tela que vários testes repetem, cada um com o seu porquê.
 * Preparar e limpar massa pela API fica em `apiHelper.ts`.
 */

/**
 * Campo de data (ou data e hora) do react-aria: cada parte — dia, mês, ano,
 * hora, minuto — é um spinbutton próprio, e `fill` não funciona. Clicar em
 * cada uma e digitar é o que o usuário faz, e é o que o componente entende.
 *
 * `scope` é a página ou o diálogo: dentro de uma modal, o mesmo rótulo pode
 * existir também na barra de filtros atrás dela.
 */
export async function fillDateSegments(scope: Page | Locator, label: string | RegExp, parts: readonly string[]) {
  const page = "keyboard" in scope ? scope : scope.page();
  const segments = scope.getByRole("group", { name: label }).getByRole("spinbutton");
  for (let i = 0; i < parts.length; i++) {
    await segments.nth(i).click();
    await page.keyboard.type(parts[i]);
  }
}

/** Abre o select pelo rótulo do campo e escolhe a opção. */
export async function choose(page: Page, label: string, option: string) {
  // Pelo rótulo: a barra de ações do cadastro também lista o obrigatório pendente como botão.
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: option }).click();
}

/**
 * Uma aba do cadastro de cliente. O nome acessível é "Título (estado)" — daí o
 * `^` e o parêntese, que não deixam "Endereço" casar com outra coisa. Clicar na
 * aba já ativa não muda nada.
 */
export async function openSection(page: Page, title: string) {
  await page.getByRole("tab", { name: new RegExp(`^${title} \\(`) }).click();
}

/**
 * Fecha a lista de sugestões de um ComboBox (cliente) com Tab.
 *
 * Esc fecha a lista enquanto ela está aberta, mas, se ela já tiver se fechado
 * sozinha, a tecla sobe para o diálogo e fecha o formulário inteiro. E clicar
 * em outro ponto não serve: com o popover aberto, o diálogo fica
 * `aria-hidden`. Tab tira o foco do campo — fecha a lista em qualquer estado e
 * nunca fecha um diálogo. `dialog`, quando passado, confirma isso.
 */
export async function closeSuggestions(page: Page, dialog?: Locator) {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toBeHidden();
  if (dialog) await expect(dialog).toBeVisible();
}

const thisMonth = (day: string): string[] => {
  const now = new Date();
  return [day, String(now.getMonth() + 1).padStart(2, "0"), String(now.getFullYear())];
};

/** Dia 10 deste mês, em partes de campo de data: vence dentro do mês que a tela abre. */
export const dueThisMonth = () => thisMonth("10");

/** Dia 1º deste mês: pago antes de hoje, sem cair no aviso de data futura. */
export const paidThisMonth = () => thisMonth("01");

/** A conta STAFF da suíte (opcional): sem ela, os testes de papel se pulam. */
export const STAFF = {
  user: process.env.E2E_USER_STAFF,
  password: process.env.E2E_PASSWORD_STAFF,
};

/** Entra como atendente, pelo formulário de login, até a Home. */
export async function signInAsStaff(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Usuário").fill(STAFF.user!);
  await page.getByPlaceholder("Senha").fill(STAFF.password!);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/home");
}

/**
 * A senha do INSS na ficha, pelo que a pessoa vê — o rótulo do campo e o nome
 * do botão. O botão muda de nome com o estado ("Revelar senha" ↔ "Esconder
 * senha"); a regex aceita os dois, e "não há botão" significa nenhum deles.
 */
export const inssPasswordInput = (page: Page) => page.getByRole("textbox", { name: 'Senha "meu inss"' });
export const inssPasswordToggle = (page: Page) => page.getByRole("button", { name: /^(Revelar|Esconder) senha$/ });
