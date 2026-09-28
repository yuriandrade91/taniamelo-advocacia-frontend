# Deploy do frontend — S3 + CloudFront

A aplicação é publicada como **site estático**: o build gera HTML em `out/`,
o pipeline copia para o bucket e invalida o CloudFront. Não há Node em
produção.

Distribuição já existente: `https://d2euv33mmi0nt2.cloudfront.net/`

---

## ⚠️ Antes de publicar: a página HTTPS não fala com a API HTTP

O site é servido em **HTTPS**. O `NEXT_PUBLIC_API_URL` aponta hoje para
`http://98.82.73.175:8080`, em **HTTP**. Navegador nenhum permite que uma
página HTTPS chame uma API HTTP: é *mixed content* ativo, bloqueado sem
pergunta e sem opção de prosseguir. A tela de login carrega bonita e o
"Entrar" não faz nada; o erro fica no console, onde o usuário não olha.

O pipeline **não detecta isso** — o build passa, os arquivos sobem, as três
rotas respondem 200. O que falha é cada requisição à API, dentro do navegador.

### A saída, e ela não exige certificado na EC2

A instância **não precisa de HTTPS**. Quem precisa falar HTTPS é o navegador,
e quem responde ao navegador é o CloudFront. Basta a API passar por ele:

1. Na mesma distribuição, acrescente uma **origem** apontando para
   `98.82.73.175`, com **Origin protocol policy: HTTP only** e **HTTP port:
   8080**. O CloudFront fala HTTP com a instância; o navegador fala HTTPS com
   o CloudFront. O trecho sem TLS fica dentro da AWS.
2. Acrescente um **comportamento** para `/api/*` apontando para essa origem,
   com:
   - **Cache policy**: `CachingDisabled` — resposta de API não se cacheia.
   - **Origin request policy**: `AllViewer` — o backend precisa do
     `Authorization`, do `X-Tenant-Id` e do cookie de refresh.
   - **Viewer protocol policy**: `Redirect HTTP to HTTPS`.
   - **Allowed methods**: todos (a aplicação usa POST, PUT, PATCH, DELETE).
   - **Sem** a função de reescrita do `.html` (ver a seção adiante).
3. `NEXT_PUBLIC_API_URL` passa a ser a **própria URL do site**
   (`https://d2euv33mmi0nt2.cloudfront.net`). Os caminhos já começam com
   `/api/v1/...`, então nada no código muda.

Isto resolve três coisas de uma vez: o mixed content, o CORS (passa a ser
mesma origem) e o certificado, que deixa de ser assunto da instância. É a
forma mais barata de sair do lugar — e não é um arranjo de dev: é a mesma
topologia que serve em produção, trocando depois o domínio.

### Se ainda assim quiser o caminho mais curto, para dev

Hoje a distribuição responde **301 de HTTP para HTTPS**. Mudando o *Viewer
protocol policy* do comportamento padrão para **HTTP and HTTPS**, o site abre
em `http://d2euv33mmi0nt2.cloudfront.net` e aí a página HTTP pode chamar a API
HTTP — sem mixed content, sem mexer em origem nenhuma.

Duas ressalvas honestas, porque este caminho engana:

- **O navegador pode te levar de volta para HTTPS sozinho.** O Chrome tenta
  atualizar navegações digitadas para HTTPS e só cai para HTTP quando o HTTPS
  falha — e aqui ele não falha. Você abre `http://`, acaba em `https://`, e o
  bloqueio volta sem nada explicar.
- **Toda a sessão passa a trafegar em claro**, inclusive o token e a senha do
  login. Em `tenant_tania` da instância de desenvolvimento isso é massa
  semeada, então o risco é aceitável; no dia em que houver dado real, não é.

O cookie de refresh não atrapalha em nenhum dos dois caminhos: o backend o
emite com `Secure` configurável e **o padrão é `false`**
(`app.auth.refresh-cookie.secure`). Sobre HTTP ele é gravado normalmente.

## O que mudou na aplicação para virar estático

`output: "export"` no `next.config.ts` **desliga o middleware**. O Next não
falha o build por isso: imprime um aviso no meio da saída e segue.

O `src/proxy.ts` era a guarda de rota — quem não tinha token levava um 307
para o login antes de qualquer HTML sair. Ele foi removido e reescrito em
`src/components/auth/GuardaDeRota.tsx`, que roda no cliente, dentro do layout
de `(private)`.

**A diferença é real e está registrada no próprio componente:** antes a tela
protegida nunca chegava ao navegador; agora chega, e o JavaScript decide. Quem
desligar o JavaScript vê a casca da aplicação — mas não vê dado de cliente
nenhum, porque toda leitura passa pela API, que exige o token e responde 401
sem ele. O que se perdeu foi a porta de entrada; o cofre continua trancado.

Se alguém recriar um `proxy.ts`, ele funcionará em `pnpm dev` e será ignorado
em produção — a pior combinação possível. O comentário no `next.config.ts`
existe para essa pessoa.

---

## A função de reescrita no CloudFront

O export gera `out/home.html`, `out/login.html`, `out/clientes/novo.html`. O
navegador pede `/home`, e o S3 devolve 403 — a chave `home` não existe.

Sem `trailingSlash: true`, de propósito: ligá-lo resolveria no S3, mas mudaria
toda URL da aplicação de `/home` para `/home/`, inclusive os links que as
pessoas já têm salvos.

Crie uma **CloudFront Function** (não Lambda@Edge) associada ao
*viewer request* do comportamento padrão:

```js
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // A API não é página: /api/v1/clients viraria /api/v1/clients.html e o
  // backend responderia 404 numa rota que existe. O guard fica aqui, e não
  // só na escolha do comportamento, porque associar a função ao
  // comportamento errado é um clique — e o sintoma apareceria como "a API
  // sumiu", longe daqui.
  if (uri.indexOf("/api/") === 0) return request;

  // A raiz é resolvida pelo "Default root object" da distribuição.
  if (uri === "/") return request;

  // Arquivo com extensão (chunk, imagem, fonte) passa direto.
  if (uri.indexOf(".") !== -1) return request;

  // /home -> /home.html ; /clientes/novo -> /clientes/novo.html
  request.uri = uri.replace(/\/$/, "") + ".html";
  return request;
}
```

E, na distribuição:

- **Default root object**: `index.html`
- **Custom error response**: 403 e 404 → `/404.html`, com código 404.
  O S3 responde **403** (e não 404) para chave inexistente quando a origem é
  o endpoint REST com OAC — sem esse mapeamento, uma URL errada mostra um XML
  de "Access Denied" em vez da página de erro da aplicação.

---

## O que configurar no GitHub

**Variables** (não são segredo, e escondê-las só dificulta o diagnóstico):

| Variável | Exemplo |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.taniamelo.adv.br` |
| `NEXT_PUBLIC_TENANT_SLUG` | `tania` |
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET` | nome do bucket do site |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E...` |
| `SITE_URL` | `https://d2euv33mmi0nt2.cloudfront.net` |

**Secrets**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

> Melhor que chave de acesso: OIDC (`aws-actions/configure-aws-credentials`
> com `role-to-assume`). Elimina credencial de longa duração do repositório.
> O backend ainda usa chave; migrar os dois de uma vez é um trabalho próprio.

A policy mínima para quem publica:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::SEU-BUCKET/*" },
    { "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::SEU-BUCKET" },
    { "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
      "Resource": "arn:aws:cloudfront::SUA-CONTA:distribution/SUA-DISTRIBUICAO" }
  ]
}
```

---

## Como o pipeline funciona

`.github/workflows/deploy.yml`, na `develop`:

1. **Portão**: `typecheck` e testes de unidade. Sem isso, o pipeline seria
   `scp` com etapas extras.
2. **Build** com as `NEXT_PUBLIC_*`. Elas são **inlinadas no JavaScript** — não
   são lidas em runtime. Trocar de backend exige build novo.
3. **Assets primeiro** (`_next/static`, `immutable`, um ano de cache), **HTML
   depois** (`no-cache`, com `--delete`). A ordem importa: o HTML novo
   referencia chunks de hash novo, e publicá-lo antes deixaria quem carregasse
   a página no intervalo pedindo um arquivo que ainda não existe.
4. **Invalidação** do CloudFront, aguardando concluir.
5. **Conferência**: `/`, `/login` e `/home` precisam responder 200. Um 403 ou
   404 aqui quase sempre é a função de reescrita ausente.

`concurrency` com fila (e sem `cancel-in-progress`): dois deploys simultâneos
embaralhariam o bucket, e cancelar no meio o deixaria pela metade.

---

## Rodando o build localmente

```bash
pnpm build          # gera out/
npx serve out       # confere antes de publicar
```

`out/` está no `.gitignore` junto com `.next/`.
