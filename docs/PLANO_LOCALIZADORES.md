# Plano: localizadores semânticos primeiro, `data-test` por exceção

## A regra

1. **Papel e nome acessível** — `getByRole("button", { name: "Revelar senha" })`.
2. **Rótulo, placeholder, texto** — `getByLabel`, `getByPlaceholder`, `getByText`.
3. **`data-testid`** — só quando 1 e 2 não alcançam, e com o porquê escrito ao
   lado.

O motivo não é estética. Um localizador semântico afirma o que a pessoa vê:
"existe um botão chamado Revelar senha". Quando esse botão muda de nome, o
teste **deve** falhar — o produto mudou. Um `data-testid` sobrevive a trocar o
rótulo para "Mostrar sneha": o teste continua verde e o defeito chega ao
usuário. O gancho de teste protege o teste de mudar; o localizador semântico
protege o usuário.

O custo do `data-testid` é invisível no dia em que se escreve e aparece meses
depois, quando ninguém sabe se `client-row-3` ainda significa alguma coisa.

## O que já é verdade aqui

O projeto tem **dois** `data-testid`, ambos em `InssPasswordField.tsx`:
`inss-password-field` (numa `div` de embrulho) e `inss-password-toggle` (no
botão de revelar). São usados em 10 lugares entre `inss-password.spec.ts` e
`papeis.spec.ts`.

Os dois estão em elementos **já acessíveis** — exatamente o caso que a regra
manda evitar:

| Hoje | Equivalente semântico |
|---|---|
| `getByTestId("inss-password-field")` | `getByLabel('Senha "meu inss"')` |
| `getByTestId("inss-password-toggle")` | `getByRole("button", { name: /revelar senha\|esconder/i })` |

**Conferido, não suposto:** troquei os dez usos na cópia de trabalho e rodei os
dois arquivos contra a AWS — 11 testes, todos verdes, zero `getByTestId` na
suíte. O passo 1 abaixo é aplicar isso no repositório, não descobrir se dá.

O botão é o caso interessante. O nome muda com o estado ("Revelar senha" →
"Consultando…" → "Esconder"), e é essa variação que empurra quem escreve o
teste para o `data-testid`. Mas a asserção que importa em `papeis.spec.ts` é
*"o atendente não recebe o botão de revelar"* — e `getByRole("button", { name:
/revelar senha/i })` diz isso na língua do produto, enquanto
`getByTestId("inss-password-toggle")` diz na língua do DOM.

## O achado que muda a ordem de preferência

Neste projeto **`getByRole` vem antes de `getByLabel`**, e não por gosto.

Cada `SelectField` do HeroUI renderiza um `<select>` nativo espelho, escondido
(`tabindex="-1"`, tamanho zero), dentro de um `<label>` sem texto próprio. O
"rótulo" que sobra para esse `<label>` é a **concatenação de todas as opções**:

```
<select tabindex="-1">  →  "Aposentadoria por idadeAposentadoria por tempo de
                            contribuiçãoAposentadoria por incapacidade…"
```

`getByLabel` casa por substring e não distingue elemento fora da árvore de
acessibilidade. Resultado real, que custou uma rodada de teste:

```
getByLabel("Cidade") resolveu para 2 elementos
```

Porque **"in­capa­cidade"** contém "cidade". O campo Cidade do endereço e o
combo de benefício viraram o mesmo localizador.

**Isto não é defeito de acessibilidade.** Conferi: o espelho está dentro de um
`div[aria-hidden="true"]`, então leitor de tela não o enxerga — o HeroUI faz a
coisa certa. É um risco de *localizador*, e só. `getByRole` respeita
`aria-hidden` e nunca alcança o espelho; `getByLabel` alcança.

Consequência prática, que já está nos testes novos:

```ts
// ruim aqui: pode casar com o select espelho
page.getByLabel("Cidade")

// bom: papel + nome, imune ao espelho
page.getByRole("textbox", { name: "Cidade" })

// e quando há duas abas de endereço no DOM, a escondida também conta:
page.getByRole("textbox", { name: "Cidade" }).filter({ visible: true })
```

## Quando `data-test` é legítimo

Três casos, e é bom que sejam poucos:

1. **O elemento não tem papel nem nome** e não deveria ganhar um só para o
   teste — um contêiner de layout que serve de escopo, uma área de canvas, um
   gráfico.
2. **O texto é o dado, não o rótulo.** Uma célula cujo conteúdo é "R$ 1.234,56"
   não pode ser localizada pelo próprio valor: o teste passaria a depender do
   número que ele mesmo quer verificar.
3. **Ambiguidade estrutural irredutível** — a quarta linha de uma tabela cujas
   linhas são todas iguais por definição. E mesmo aí, `getByRole("row")` com
   `nth` costuma ser melhor, porque descreve a estrutura em vez de inventar um
   nome.

Fora disso: se o elemento é alcançável por papel e nome, **acrescentar
`data-testid` é criar uma segunda verdade** sobre o mesmo elemento — e as duas
vão divergir.

## As etapas

### 1. Tirar os dois `data-testid` que sobram *(pronto para aplicar)*

Trocar os dez usos por `getByLabel` / `getByRole` e remover os atributos do
`InssPasswordField.tsx`. Já validado: 11 testes verdes contra a AWS.

Verificação: `grep -r "data-testid" src` não devolve nada e
`pnpm test:e2e:dev e2e/inss-password.spec.ts e2e/papeis.spec.ts` passa.

### 2. Escrever a regra onde ela é consultada

A convenção existe em `docs/E2E_PLAYWRIGHT.md` numa linha ("localizar por papel
e texto visível, não por classe CSS") que não cobre `data-testid` nem a
armadilha do `getByLabel`. Esta página passa a ser o lugar da regra, e o
`E2E_PLAYWRIGHT.md` aponta para cá.

### 3. Trocar `getByLabel` por `getByRole` nos formulários

Hoje há usos de `getByLabel` em `cadastro-endereco-em-lote.spec.ts` que
funcionam por sorte — o nome do campo não é substring de nenhuma lista de
opções. "Nome completo", "CPF" e "Celular" estão a um benefício novo de
distância de virar ambíguos.

Não é urgente e não é cosmético: é dívida que cobra no dia em que alguém
acrescenta uma opção de enum.

### 4. Uma trava que falhe sozinha

Sem trava, a regra dura até o próximo teste difícil às seis da tarde.

O ESLint do projeto **não roda** (`TypeError: Converting circular structure to
JSON` ao carregar a config — reproduz em instalação limpa), então uma regra de
lint não é opção hoje. O Vitest roda, e um teste de unidade resolve:

```ts
// src/lib/localizadores.test.ts
const PERMITIDOS: Record<string, string> = {
  // "caminho/do/arquivo.tsx": "por que este elemento não é alcançável por papel e nome"
};

it("todo data-testid novo precisa de justificativa escrita", () => {
  // varre src/**/*.tsx, junta os arquivos com data-testid,
  // compara com PERMITIDOS e falha nomeando o arquivo novo.
});
```

O valor não é impedir o `data-testid` — é obrigar a escrever a frase. Quem
precisa mesmo escreve em dez segundos; quem estava só com pressa desiste, que é
o caso comum.

## O que este plano NÃO propõe

Caçar `getByText` e `getByPlaceholder`. Os dois são semânticos e descrevem o
que a pessoa vê. `getByPlaceholder("Pesquisar beneficiário...")` é uma boa
afirmação sobre a tela de clientes — trocar por um `data-testid` seria piorar.
