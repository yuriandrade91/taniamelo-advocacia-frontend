import { fireEvent, screen } from "@testing-library/react";

/**
 * Atalhos para os controles do HeroUI no jsdom.
 *
 * O Select do HeroUI abre a lista num popover que depende de layout; para
 * escolher uma opção, o teste usa o `<select>` escondido que ele mantém para
 * formulários (o mesmo caminho do preenchimento automático do navegador).
 */
export function chooseOption(label: string | RegExp, value: string | string[], scope: ParentNode = document) {
  const index = 0;
  const fields = [...scope.querySelectorAll<HTMLElement>('[data-slot="select"]')].filter((field) =>
    namesOf(field).some((text) => (typeof label === "string" ? text === label : label.test(text))),
  );
  const select = fields[index]?.querySelector("select");
  if (!select) throw new Error(`Select "${String(label)}" não encontrado`);
  const values = Array.isArray(value) ? value : [value];
  if (select.multiple) {
    for (const option of select.options) option.selected = values.includes(option.value);
    fireEvent.change(select);
  } else {
    fireEvent.change(select, { target: { value: values[0] } });
  }
}

/** Os nomes de um Select: o rótulo visível, o `aria-label` e o que o `aria-labelledby` aponta. */
function namesOf(field: HTMLElement): string[] {
  const trigger = field.querySelector("button");
  const labelledBy = (trigger?.getAttribute("aria-labelledby") ?? "")
    .split(" ")
    .map((id) => document.querySelector(`[id="${id}"]`)?.textContent?.trim() ?? "");
  return [
    field.querySelector('[data-slot="label"]')?.textContent?.trim() ?? "",
    field.getAttribute("aria-label") ?? "",
    trigger?.getAttribute("aria-label") ?? "",
    ...labelledBy,
  ].filter(Boolean);
}

/** O campo de texto pelo rótulo visível (inclui os que o HeroUI liga por `aria-labelledby`). */
export function inputByLabel(label: string | RegExp, index = 0): HTMLInputElement | HTMLTextAreaElement {
  // Rótulo de campo obrigatório termina com "*": o texto exato não casaria.
  const escaped = typeof label === "string" ? label.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) : "";
  const matcher = typeof label === "string" ? new RegExp(`^${escaped}\\s*\\*?$`) : label;
  const matches = screen.getAllByLabelText(matcher);
  const field = matches.filter((el) => el.tagName === "INPUT" || el.tagName === "TEXTAREA")[index];
  if (!field) throw new Error(`Campo "${String(label)}" não encontrado`);
  return field as HTMLInputElement;
}

/** O bloco (cartão, item de lista) que contém `text` e algum campo editável. */
export function cardOf(text: string): HTMLElement {
  let node: HTMLElement = screen.getAllByText(text)[0];
  while (node.parentElement && !node.querySelector("input:not([type=file]), textarea, [role=spinbutton]")) node = node.parentElement;
  return node;
}
