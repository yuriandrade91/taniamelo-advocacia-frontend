# Contrato com o backend

O `taniamelo-advocacia-backend` (Spring Boot) visto de quem o consome. Fonte
de verdade do lado de cá: `src/constants/endpoints/paths.ts` (rotas),
`src/interfaces/` (DTOs) e `src/enums/` (vocabulário). Do lado de lá, os
controllers em `src/main/java/.../controller` e os docs do próprio backend
(`docs/ARCHITECTURE.md`, `docs/MULTI_TENANT_E_AUTH.md`, `docs/DATA_MODEL.md`).

> Levantado dos controllers em 09/10/2026: 90 rotas. A coluna **Tela** diz
> quem usa cada uma; "—" é rota que existe no servidor e não tem tela — a
> lista do que falta construir está no [`ROADMAP.md`](ROADMAP.md).

---

## 1. Fundamentos

| | |
|---|---|
| Base | `NEXT_PUBLIC_API_URL` (local: `http://localhost:8080`) + `/api/v1` |
| Escritório | header `X-Tenant-Id` em **toda** requisição, inclusive no login: o slug público (`tania`) ou o UUID. O nome do schema nunca trafega |
| Autenticação | `Authorization: Bearer <access token>` (JWT, 8 h); refresh por cookie `httpOnly` (14 dias), **rotacionado a cada uso** — refresh concorrente invalida o outro, por isso o front serializa |
| Resposta | envelope `{ success, data, pagination?, errors? }`; listas com `pagination` **1-based** (`pageNumber`, `pageSize`, `totalRecords`, `totalPages`) |
| Listas na query | repetidas **sem colchetes** (`status=PAGO&status=PENDENTE`) — `paramsSerializer: { indexes: null }` no `axiosService` |
| Datas | `LocalDate` → `"yyyy-MM-dd"` (texto, sem fuso: o front não passa por `new Date`); `Instant` → ISO 8601 |
| Dinheiro | `BigDecimal` → `number` |
| Enums | a API **devolve o rótulo** (`@JsonValue`: "Aposentadoria por idade") e **aceita** rótulo ou chave (`@JsonCreator`). Os selects trabalham com a chave (`enumKeyOf`, em `lib/formValues`) |
| Exclusão | lógica (`deleted_at`); `DELETE` de sub-recurso responde `204` sem envelope |

### Erros

| HTTP | Quando | O que a tela faz |
|---|---|---|
| 400 | validação, tipo inválido, enum desconhecido, upload acima do limite | toast com a mensagem do campo; formulários com `errors[].field` mostram no campo |
| 401 | token vencido | o `axiosService` tenta o refresh uma vez; sem sucesso, fim de sessão e login |
| 403 | papel sem permissão | toast; a tela já esconde o que o papel não pode (`lib/permissions`) |
| 404 | rota inexistente na instância | onde a rota pode estar em pausa, "não está no ar neste ambiente" |
| 409 | duplicidade (CPF) | toast |
| 422 | regra de negócio (data retroativa sem ciência, concluir antes da hora…) | toast; os fluxos conhecidos perguntam antes |
| 429 | login bloqueado por tentativas | "tente novamente em X" (`lib/retryAfter`) |

## 2. Papéis

| Papel | O que pode |
|---|---|
| `ADMIN` | tudo, inclusive o financeiro (`@RequerAdmin`) |
| `SUPPORT` (= `LAWYER`, nome antigo) | operar, **excluir, restaurar, ler a senha do INSS e listar usuários** (`@RequerAdvogado`); sem financeiro |
| `STAFF` | o dia a dia: cadastrar e editar cliente, marcar, cancelar e concluir compromisso |

Quem autoriza é o backend. O front só não oferece o que vai ser recusado.

## 3. Rotas

Caminhos relativos a `/api/v1`. **Papel** em branco = qualquer autenticado.

### Autenticação e escritório

| Método | Rota | Papel | Tela |
|---|---|---|---|
| POST | `/auth/login` | público (com `X-Tenant-Id`) | Login |
| POST | `/auth/refresh` | cookie | `axiosService` (401) e restauração da sessão no login |
| POST | `/auth/logout` | cookie | Menu do usuário |
| GET | `/tenants/resolve?slug=` | público | — (o front manda o slug direto no header) |
| GET | `/tenants/current` | | — (dados do escritório) |
| POST | `/support/login` | público | — (console de suporte) |
| POST | `/support/sessions/{tenantId}` | suporte | — (entrar num escritório como suporte) |

### Usuários

| Método | Rota | Papel | Tela |
|---|---|---|---|
| GET | `/users?includeInactive=` | SUPPORT/ADMIN | nomes de autor (`useOfficeAuthors`) |
| GET | `/users/me` | | Perfil |
| PUT | `/users/me` | | Perfil |
| PATCH | `/users/me/password` | | Perfil |

### Clientes

| Método | Rota | Papel | Tela |
|---|---|---|---|
| GET | `/clients` | | Clientes (lista, filtros), Home (contadores), Relatórios (contagens), busca de cliente |
| POST | `/clients` | | Cadastro |
| GET | `/clients/{id}` | | Ficha |
| PUT | `/clients/{id}` | | Ficha — **substitui o recurso inteiro** (`clientSheet.toUpdateRequest`) |
| PATCH | `/clients/{id}` | | Mudança de etapa (lista, Home); `situation`, `benefit`, `clientType`, `notBillable` |
| DELETE | `/clients/{id}` | SUPPORT/ADMIN | Clientes (com janela de desfazer) |
| GET | `/clients/deleted` | SUPPORT/ADMIN | — (lixeira) |
| PATCH | `/clients/{id}/restore` | SUPPORT/ADMIN | — (restaurar) |
| GET | `/clients/{id}/situation-history` | | Ficha, trilha da mudança de etapa |
| GET | `/clients/{id}/inss-password` | SUPPORT/ADMIN, **auditada** | Ficha ("Revelar senha", nunca ao abrir) |
| GET | `/clients/upcoming-birthdays` | | Home (aniversariantes) |
| GET / PUT | `/clients/{id}/personal-data` | | PUT: Cadastro (seção já gravada); GET: — |
| GET / PUT | `/clients/{id}/professional-data` | | PUT: Cadastro; GET: — |

`ClientListResponseDTO` (a linha da lista) traz só: `clientId`, `fullName`,
`cpf`, `mobilePhone`, `benefit`, `situation`, `clientType`, `notBillable`,
`beneficiaryNumber`, `createdAt`, `updatedAt`, `deletedAt`. **Não** traz
`email`, `isWhatsapp` nem `birthDate` — o que depende deles na lista não tem
como funcionar (ver o roadmap).

### Sub-recursos do cliente

| Método | Rota | Papel | Tela |
|---|---|---|---|
| GET / POST | `/clients/{id}/addresses` | | Cadastro, Ficha |
| POST | `/clients/{id}/addresses/batch` | | Cadastro (vários endereços numa requisição) |
| GET / PUT | `/clients/{id}/addresses/{addressId}` | | PUT: Ficha, Cadastro; GET: — |
| DELETE | `/clients/{id}/addresses/{addressId}` | SUPPORT/ADMIN | Cadastro |
| GET / POST | `/clients/{id}/interviews` | | Cadastro, Ficha |
| GET / PUT | `/clients/{id}/interviews/{interviewId}` | | PUT: Ficha; GET: — |
| DELETE | `/clients/{id}/interviews/{interviewId}` | SUPPORT/ADMIN | — |
| GET / POST | `/clients/{id}/disability-periods` | | Cadastro, Ficha |
| GET | `/clients/{id}/disability-periods/conversion` | | Ficha (o front também calcula, igual — `lib/disabilityTime`) |
| GET / PUT | `/clients/{id}/disability-periods/{periodId}` | | PUT: Ficha; GET: — |
| DELETE | `/clients/{id}/disability-periods/{periodId}` | SUPPORT/ADMIN | Cadastro, Ficha |

### Arquivos do cliente

| Método | Rota | Papel | Tela |
|---|---|---|---|
| POST / GET | `/clients/{id}/files/documents` | | Cadastro (envio em lote, multipart), Ficha |
| POST / GET | `/clients/{id}/files/simulations` | | Cadastro, Ficha |
| GET / PATCH | `/clients/{id}/files/documents/{fileId}` | | — (editar tipo/observação depois do envio) |
| GET / PATCH | `/clients/{id}/files/simulations/{fileId}` | | — |
| PATCH | `/clients/{id}/files/simulations/{fileId}/principal` | | — (trocar a simulação principal depois do envio) |
| GET | `/clients/{id}/files/{fileId}/download` | | Ficha ("Visualizar" e "Baixar", pelo `downloadClientFile`, com o token — o `downloadUrl` da listagem não serve de link: é caminho da API e a rota exige o token) |
| DELETE | `/clients/{id}/files/{fileId}` | SUPPORT/ADMIN | Ficha |

Limites do upload: 10 MB por arquivo, 60 MB por requisição.

### Agenda

| Método | Rota | Papel | Tela |
|---|---|---|---|
| GET | `/appointments` | | Agenda, Home (cartão do mês) |
| POST | `/appointments` | | Agenda, Home |
| PUT | `/appointments/{id}` | | Agenda, Home |
| PATCH | `/appointments/{id}/cancel` | | Agenda, Home (com justificativa) |
| PATCH | `/appointments/{id}/complete` | | Agenda, Home (`earlyCompletionAcknowledged` para antes da hora) |
| DELETE | `/appointments/{id}` | SUPPORT/ADMIN | Agenda, Home |
| GET | `/appointments/summary?year=` | | Home (abas por mês) |
| GET | `/appointments/timeline` | | Relatórios |
| GET | `/appointments/conflicts` | | formulário de compromisso (aviso enquanto se digita) |
| GET | `/appointments/{id}` | | — |
| GET | `/appointments/{id}/history` | | — (trilha do compromisso) |
| GET | `/appointments/deleted` | SUPPORT/ADMIN | — (lixeira) |
| PATCH | `/appointments/{id}/restore` | SUPPORT/ADMIN | — (restaurar) |

### Financeiro — tudo `@RequerAdmin`

Regras (competência × caixa, baldes disjuntos, Pagamentos ≠ receita) em
[`FINANCE_SPEC.md`](FINANCE_SPEC.md).

| Método | Rota | Tela |
|---|---|---|
| GET | `/payments`, `/payments/summary`, `/payments/timeline` | Pagamentos, Home (próximas receitas), Relatórios |
| GET / POST | `/clients/{id}/payments` | POST: Pagamentos (novo valor a receber); GET: — (a ficha usa `/payments?clientId=`) |
| GET / PATCH / DELETE | `/clients/{id}/payments/{paymentId}` | Pagamentos (detalhe, edição, recebimento, exclusão) |
| GET / POST | `/expenses` | Carteira |
| GET / PUT / DELETE | `/expenses/{id}` | Carteira |
| GET | `/expenses/summary`, `/expenses/timeline` | Carteira, Home (balanço), Relatórios |
| GET / POST | `/revenues` | Carteira |
| GET / PUT / DELETE | `/revenues/{id}` | Carteira |
| GET | `/revenues/summary`, `/revenues/timeline` | Carteira, Relatórios |

### Outros

| Método | Rota | Tela |
|---|---|---|
| GET | `/cep/{cep}` | Endereço (cadastro e ficha) |

## 4. Enums

Espelhados em `src/enums/`, todos pela fábrica `createEnum` (`lib/enumFactory`):
benefício, situação, estado civil, gênero, tipo de cliente, tipo de
endereço, tipo de documento, grau de deficiência, categoria de despesa,
forma e status de pagamento, tipo/modalidade/status de compromisso. A
exceção é `Role`: a API devolve a chave (`"ADMIN"`), não um rótulo.

Quando o backend ganhar um valor, ele entra aqui antes de aparecer na tela —
o select não mostra o que não conhece.
