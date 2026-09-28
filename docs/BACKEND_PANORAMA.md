# Panorama do backend — referência para integração

Retrato do `taniamelo-advocacia-backend` (Spring Boot / Java) do ponto de vista de **quem consome a API**. Serve de fonte de verdade para a integração do frontend.

> Documentação original do backend: `docs/ARCHITECTURE.md`, `docs/MULTI_TENANT_E_AUTH.md`, `docs/DATA_MODEL.md` e ADRs (`docs/adr/`) no repositório do backend.

---

## 1. Fundamentos

| Item | Valor |
|---|---|
| Base URL | `http://localhost:8080` (dev) — porta `8080` |
| Prefixo da API | `/api/v1` |
| Banco | PostgreSQL, schema gerenciado 100% por **Flyway** |
| Autenticação | JWT stateless (access token) + **refresh token em cookie httpOnly** |
| Sessão | `STATELESS` · CSRF desabilitado |
| CORS | `APP_CORS_ALLOWED_ORIGINS` (padrão `*` em dev — restringir em produção) |
| Upload | `max-file-size: 10MB` · `max-request-size: 60MB` (lote multipart) |
| Storage | local, `APP_STORAGE_LOCAL_PATH` (padrão `./storage`) |

---

## 2. Multi-tenancy (o ponto mais importante)

**Modelo:** *schema-per-tenant*. Cada escritório é um **schema Postgres autocontido** (`tenant_tania`, `tenant_demo`) com o conjunto completo de tabelas. Isolamento forte — nenhuma linha de um tenant é visível no outro. Não existe `tenant_id` nas queries.

### Como o frontend informa o tenant

Header obrigatório em **todas** as requisições, **inclusive no login**:

```
X-Tenant-Id: <slug ou UUID público do escritório>
```

⚠️ **O valor é o identificador PÚBLICO** (slug, ex.: `tania`, ou o UUID). O nome do schema (`tenant_tania`) **nunca trafega** — o `TenantRegistry` faz a tradução internamente.

### Ordem de resolução (`TenantResolutionFilter`)

1. Header `X-Tenant-Id`
2. Claim `tenant` do JWT (requisições autenticadas sem o header)
3. Nada → `default-schema` (`tenant_tania`)

Só identificadores de schemas configurados em `app.tenancy.schemas` são aceitos.

### Catálogo de tenants (control-plane)

Tabela `public.tenants` (fora dos schemas de tenant) com `schema_name`, `razao_social`, `cnpj`, `responsavel`, `email`, `telefone`, `plano`, `status`, timestamps. É a fonte de verdade de quais escritórios existem.

### Tenants de exemplo (dev)

| slug | schema |
|---|---|
| `tania` | `tenant_tania` |
| `demo` | `tenant_demo` |

---

## 3. Autenticação

| Item | Valor |
|---|---|
| Access token | JWT no header `Authorization: Bearer <token>`. TTL padrão **480 min** (`APP_JWT_EXPIRATION_MINUTES`) |
| Refresh token | Cookie **httpOnly** `refreshToken`. TTL **14 dias** (`APP_JWT_REFRESH_EXPIRATION_DAYS`). **Rotacionado** a cada refresh (o anterior é invalidado) |
| Claims do JWT | `sub` (userId), email, role, **`tenant`** |
| RBAC | `Role` = `ADMIN` \| `LAWYER` (+ STAFF nos exemplos). Autorização por papel (`@PreAuthorize`) **ainda não implementada** — hoje toda rota autenticada aceita qualquer papel |

### Endpoints

| Método | Path | Auth | Body / Notas |
|---|---|---|---|
| POST | `/api/v1/auth/login` | público* | `{ login, password }` — **`login` aceita e-mail OU username** |
| POST | `/api/v1/auth/refresh` | cookie | Lê o cookie, rotaciona, devolve novo access token |
| POST | `/api/v1/auth/logout` | cookie | Revoga o refresh token e limpa o cookie |

\* `permitAll` no Spring Security, **mas exige o header `X-Tenant-Id`**.

**Resposta do login (`LoginResponseDTO`):**
```json
{ "token", "tokenType": "Bearer", "expiresInSeconds",
  "fullName", "email", "role", "tenantId", "tenantSlug" }
```

> Implicação para o frontend: o cliente HTTP precisa de `withCredentials: true` para o cookie do refresh trafegar.

### Rotas públicas (`SecurityConfig`)

- `OPTIONS /**` (preflight)
- `/api/v1/auth/**`
- `GET /api/v1/tenants/resolve`
- `/actuator/health`, `/actuator/info`
- (Swagger / OpenAPI)

Todo o resto: `authenticated()`.

---

## 4. Envelope de resposta

Todas as respostas usam `ApiResponse<T>`:

```json
{
  "success": true,
  "data": { } ,          // objeto OU lista
  "pagination": { },     // presente em listagens
  "errors": [ ]          // presente em erro
}
```

**`Pagination`:** `pageNumber`, `pageSize`, `totalRecords`, `totalPages`, `hasNextPage`, `hasPreviousPage`.

**`ApiError`:** `field`, `message`, `code`.

### Mapa de erros (`GlobalExceptionHandler`)

| HTTP | Origem |
|---|---|
| 400 | Validação (`MethodArgumentNotValid`, `ConstraintViolation`), tipo inválido, JSON malformado, upload acima do limite |
| 401 | `AuthenticationException` (credenciais inválidas, token expirado) |
| 403 | `AccessDeniedException` |
| 404 | `NotFoundException`, rota inexistente |
| 409 | `DataIntegrityViolationException` (ex.: CPF duplicado) |
| 422 | `BusinessException` (regra de negócio) |
| 500 | `SystemException`, `FileStorageException` |

**Paginação é 1-based** (`pageNumber` começa em 1, default 1; `pageSize` default 10).

---

## 5. Endpoints (9 controllers, ~45 rotas)

### Tenants
| Método | Path | Notas |
|---|---|---|
| GET | `/tenants/resolve?slug=` | **Público**. Traduz slug → `tenantId` (UUID) |
| GET | `/tenants/current` | Dados do escritório da sessão |

### Clientes — `/clients`
| Método | Path | Notas |
|---|---|---|
| GET | `/clients` | Paginado. Filtros: `searchTerm` (nome/CPF), `benefitType[]`, `situation[]`, `createdFrom`, `createdTo` |
| POST | `/clients` | Retorna `201` + header `Location` |
| GET | `/clients/{id}` | |
| PUT | `/clients/{id}` | Substituição completa |
| PATCH | `/clients/{id}` | Parcial: `situation`, `benefit`, `clientType`, `notBillable` |
| DELETE | `/clients/{id}` | |
| GET | `/clients/{id}/situation-history` | Paginado |

### Sub-recursos do cliente
| Recurso | Base | Operações |
|---|---|---|
| Dados pessoais | `/clients/{id}/personal-data` | GET, PUT |
| Dados profissionais | `/clients/{id}/professional-data` | GET, PUT |
| Endereços | `/clients/{clientId}/addresses` | GET (lista), POST, GET/PUT/DELETE `/{addressId}` |
| Entrevistas | `/clients/{clientId}/interviews` | GET (lista), POST, GET/PUT/DELETE `/{interviewId}` |
| Pagamentos | `/clients/{clientId}/payments` | GET (lista), POST, GET/**PATCH**/DELETE `/{paymentId}` |

### Arquivos — `/clients/{clientId}/files`
| Método | Path | Notas |
|---|---|---|
| POST | `/files/documents` | **multipart** — upload em lote |
| GET | `/files/documents` | Paginado |
| GET / PATCH | `/files/documents/{fileId}` | |
| POST | `/files/simulations` | **multipart** — upload em lote |
| GET | `/files/simulations` | Paginado |
| GET / PATCH | `/files/simulations/{fileId}` | |
| PATCH | `/files/simulations/{fileId}/principal` | Marca simulação como principal |
| GET | `/files/{fileId}/download` | Binário |
| DELETE | `/files/{fileId}` | Documento ou simulação |

> `DELETE` de sub-recursos retorna `204 No Content` (sem envelope).

---

## 6. Enums (fonte de verdade)

| Enum | Valores (chave → label) |
|---|---|
| **BenefitType** (9) | `APOSENTADORIA_POR_IDADE` → Aposentadoria por idade · `APOSENTADORIA_POR_TEMPO_CONTRIBUICAO` · `APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE` · `APOSENTADORIA_ESPECIAL` · `APOSENTADORIA_POR_DEFICIENCIA` · `APOSENTADORIA_POR_TEMPO_PROFESSOR` · `APOSENTADORIA_POR_INVALIDEZ` · `APOSENTADORIA_RURAL` · `APOSENTADORIA_PCD` |
| **Situation** (6) | `FORMULARIO_PREENCHIDO` · `ANALISE_DOCUMENTAL` · `PLANEJAMENTO_EM_EXECUCAO` · `PLANEJAMENTO_CONCLUIDO` · `BENEFICIO_FUTURO` · `BENEFICIO_CONCLUIDO` |
| **MaritalStatus** (5) | `SOLTEIRO` · `CASADO` · **`SEPARADO`** · `DIVORCIADO` · `VIUVO` — ⚠️ **não existe "União Estável"** |
| **Gender** (4) | `MASCULINO` · `FEMININO` · `NAO_BINARIO` · `OUTRO` |
| **ClientType** (2) | `VERIFICADO` · `POTENCIAL` |
| **AddressType** (3) | `RESIDENCIAL` · `COMERCIAL` · `CORRESPONDENCIA` |
| **DocumentType** (11) | `IDENTIFICACAO_SEGURADO` · `CADASTRAIS_DADOS_PESSOAIS` · `VINCULO_TEMPO_CONTRIBUICAO` · `CONTRIBUINTE_INDIVIDUAL_FACULTATIVO` · `SEGURADO_ESPECIAL` · `ATIVIDADE_ESPECIAL` · `DOCUMENTOS_MEDICOS` · `DEPENDENTES_RELACAO_FAMILIAR` · `JUDICIAIS_ADMINISTRATIVOS` · `DECLARACOES_AUTODECLARACOES` · `OUTROS` |
| **PaymentMethod** (6) | `PIX` · `BOLETO` · `DINHEIRO` · `TRANSFERENCIA` · `CARTAO` · `OUTRO` |
| **PaymentStatus** (3) | `PENDENTE` · `PAGO` · `CANCELADO` |
| **Role** | `ADMIN` · `LAWYER` |

> Os filtros de listagem (`benefitType`, `situation`) aceitam **nome do enum OU label** (`fromLabel` no backend).

---

## 7. DTOs principais

### `ClientDetailsDTO` (GET por id)
`id`, `fullName`, `birthDate`, `age`, `cpf`, `motherName`, `mobilePhone`, `inssPassword`, `gender`, `rg`, `rgIssuer`, `rgIssueDate`, `email`, `referencePhone`, `referenceResponsible`, `maritalStatus`, `benefit`, `situation`, `beneficiaryNumber`, `nitPis`, `profession`, `ctps`, `ctpsSeries`, **`contributionTime` (String)**, `contributionInMonths` (Integer), `nationality`, `isWhatsapp`, `hasDisability`, `notes`, `responsibleUserId`, `clientType`, `notBillable`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

### `ClientListResponseDTO` (linha da tabela)
`id`, `fullName`, `cpf`, `mobilePhone`, `benefit`, `situation`, `clientType`, `createdAt`, `beneficiaryNumber`, `updatedAt`

### `ClientCreateRequestDTO` / `ClientUpdateRequestDTO`
**Obrigatórios:** `fullName`, `birthDate`, `cpf` (validado por `@ValidCPF`), `motherName`, `mobilePhone`, `inssPassword`, `gender`, `benefit`, `situation`.
**Opcionais:** `rg`, `rgIssuer`, `rgIssueDate`, `email`, `referencePhone`, `referenceResponsible`, `maritalStatus`, `beneficiaryNumber`, `nitPis`, `profession`, `ctps`, `ctpsSeries`, `contributionTime`, `nationality`, `isWhatsapp`, `hasDisability`, `notes`, `responsibleUserId`, `clientType`, `notBillable`

### Outros
- **`ClientAddressRequestDTO`** — obrigatórios: `street`, `city`, `state`; opcionais: `addressType`, `addressNumber`, `complement`, `neighborhood`, `zipCode`, `isPrimary`
- **`ClientInterviewRequestDTO`** — obrigatório: `content`; opcionais: `occurredAt`, `durationMinutes` (`@Positive`)
- **`ClientPaymentRequestDTO`** — obrigatórios: `description`, `dueDate`; opcionais: `amount` (BigDecimal), `installmentNumber`, `installmentTotal`, `paymentMethod`, `notes`. Resposta inclui `status`, `paidDate` e **`overdue`** (calculado)
- **`ClientFileDocumentResponseDTO`** — `documentType`, `originalFilename`, `mimeType`, `fileSizeBytes`, `notes`, `downloadUrl`, auditoria
- **`ClientFileSimulationResponseDTO`** — + `simulationDate`, `version`, `vinculos`, `isPrincipal`
- **`ClientSituationHistoryDTO`** — `id`, `currentSituation`, `changedAt`, `changedByUserId`

### Convenções de tipo (Java → JSON/TS)
| Java | JSON / TS |
|---|---|
| `LocalDate` | `"yyyy-MM-dd"` |
| `Instant` | ISO 8601 |
| `UUID` | `string` |
| `BigDecimal` | `number` |
| enum | `string` (nome da constante) |

---

## 8. Checklist de integração do frontend

- [x] Header `X-Tenant-Id` em todas as requisições
- [x] `withCredentials: true` (cookie do refresh)
- [x] Login com campo **`login`** (não `email`)
- [x] Refresh automático em `401` + retry
- [x] Enums espelhados (9 enums)
- [x] Paginação **1-based**
- [ ] Tratar `422` (regra de negócio) e `409` (duplicidade) na UI
- [ ] `DELETE` de sub-recurso retorna `204` sem corpo
- [ ] Uploads: respeitar 10MB/arquivo e 60MB/requisição
- [ ] RBAC por papel ainda não existe no backend — não confiar em `role` para segurança

---

## 9. Pontos de atenção

1. **Sem `@PreAuthorize`**: qualquer usuário autenticado acessa qualquer rota. Não implemente regras de segurança no frontend assumindo que o backend valida papel.
2. **`contributionTime` é texto livre**, não número. `contributionInMonths` é o campo numérico.
3. **CORS `*` em dev** — com `withCredentials`, navegadores rejeitam `*`. Em produção defina `APP_CORS_ALLOWED_ORIGINS` com a origem exata do frontend.
4. **Rotação de refresh**: cada `/auth/refresh` invalida o token anterior. Evite chamadas concorrentes de refresh (serialize).
5. **Flyway**: nunca editar migration aplicada; mudanças viram `V9`, `V10`…
