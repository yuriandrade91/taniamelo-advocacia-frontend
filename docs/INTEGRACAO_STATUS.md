# Status da integração frontend ↔ backend

Última atualização: Julho/2026 · Base: HeroUI v2 (instalado), Next 16.0.8, Tailwind 3

> Contrato completo da API: `docs/BACKEND_PANORAMA.md`

---

## ✅ Concluído

### Camada de dados (agnóstica de UI — sobrevive à migração v3)

| Arquivo | O que faz |
|---|---|
| `src/constants/endpoints/paths.ts` | ~45 endpoints (9 controllers), incl. tenants/refresh/logout. Aliases legados mantidos |
| `src/lib/tenant.ts` | Resolução do tenant: `NEXT_PUBLIC_TENANT_SLUG` → `tenantId` após login |
| `src/services/axiosService.ts` | Header `X-Tenant-Id`, `withCredentials`, refresh automático em 401 (serializado) |
| `src/services/authService.ts` | `login` / `refresh` / `logout` / `isAuthenticated` |
| `src/services/tenantService.ts` | `resolveTenant` / `currentTenant` |
| `src/services/clientService.ts` | CRUD completo + `situation-history` |
| `src/services/clientAddressService.ts` | CRUD de endereços |
| `src/services/clientInterviewService.ts` | CRUD de entrevistas |
| `src/services/clientPaymentService.ts` | CRUD + PATCH de pagamentos |
| `src/services/clientDataService.ts` | Dados pessoais e profissionais |
| `src/services/clientFileService.ts` | Documentos, simulações, download, delete |

### Enums espelhados (9)
`benefit` (9 valores) · `situation` · `maritalStatus` (corrigido) · `gender` · `clientType` · `addressType` · `documentType` · `payment` (method + status)

Cada um expõe `*Key` (nome da constante), **`*Label`** (o que a API devolve) e **`*Input`** (aceito em requisição).

### Interfaces tipadas
`interfaces/auth`, `interfaces/tenant`, `interfaces/client/Client.interface.ts`, `interfaces/client/ClientSubResources.interface.ts`

### Componentes integrados

| Componente | Integração |
|---|---|
| `login/page.tsx` | `authService.login` — persiste token + tenant |
| `Navbar.tsx` | Botão **Sair** → `authService.logout` |
| `clientes/page.tsx` | `clientService.clients` (filtros + paginação) e `deleteClient` |
| `AddNewClientModal` | `createClient` |
| `DetailsClientModal` | `clientById`, `updateClient`, `deleteClient`, `clientSituationHistory` |

Nenhum componente chama mais o axios diretamente. `tsc --noEmit` passa limpo.

---

## 🐛 Bugs de contrato corrigidos

1. **`X-Tenant-Id` ausente** — o backend é multi-tenant e exige o header em toda rota, inclusive login. Sem isso, **nada** funcionava.
2. **PUT do DetailsClientModal em snake_case** (`full_name`, `birth_date`, `situation_id`, `benefit_id`, `created_by: 1`…) — o DTO é camelCase. O update falhava por completo.
3. **`nonBillable` / `non_billable`** → o backend usa **`notBillable`** (envio e leitura).
4. **`contributionTime` convertido para número** — é **texto livre** no backend (`contributionInMonths` é o campo numérico).
5. **`MaritalStatus`** tinha "União Estável" (rejeitado pela API) e faltava "Separado(a)".
6. **`BenefitType`** faltavam `APOSENTADORIA_RURAL` e `APOSENTADORIA_PCD`.
7. **Enums: labels vs nomes** — o backend usa `@JsonValue`/`@JsonCreator`, então **devolve labels** e **aceita ambos**. Tipos `*Label` / `*Input` refletem isso.
8. **`clientService` importava interface inexistente** (`ClientRequest.interface`) — o projeto não compilava.
9. **Endpoints errados** — faltava o prefixo `/api` e o histórico era `/history` em vez de `/situation-history`.
10. **Sem refresh token** — agora há renovação automática em 401, com chamadas serializadas (o backend invalida o refresh anterior a cada uso).

---

## ⏭️ Próximos passos

### 1. Migração HeroUI v3 + Tailwind v4 (pendente)
Plano completo em `docs/MIGRACAO_HEROUI_V3_TAILWIND_V4.md` (se ausente, foi revertido — regerar).
Resumo: `@heroui/react@3` + `@heroui/styles`, remover pacotes v2 e `framer-motion`, Tailwind v4 CSS-first (`@theme`), remover `HeroUIProvider`, reescrever compound components (`Input`→`TextField`, `Modal`, `Select`, `Table`, `Progress`→`ProgressBar`, `Toast`).
⚠️ Requer `pnpm install` local — não pode ser feito no ambiente do agente.
⚠️ Ao migrar, marcar `"use client"` em **todo** arquivo que importe `@heroui/react` (é client-only) — inclui `lib/toast.ts` e o root `layout.tsx` (extrair `app/providers.tsx`).

### 2. Sub-recursos sem UI
Services prontos e sem tela: **endereços, entrevistas, pagamentos, arquivos** (documentos/simulações), dados pessoais/profissionais separados.

### 3. Tratamento de erros na UI
- `422` (regra de negócio) e `409` (duplicidade, ex.: CPF) não têm tratamento dedicado.
- `DELETE` de sub-recurso responde `204` sem corpo.

### 4. Segurança
- Token em cookie **não-httpOnly** (`document.cookie`) — vulnerável a XSS. Ver plano de SSR.
- Guarda de rotas em `src/proxy.ts` está comentada.
- **Backend sem `@PreAuthorize`**: qualquer autenticado acessa qualquer rota — não confiar em `role` no frontend.

### 5. Configuração
- `CORS` do backend é `*` em dev; com `withCredentials` o navegador **rejeita** `*`. Definir `APP_CORS_ALLOWED_ORIGINS` com a origem exata do frontend.
- Adicionar ao `.env`: `NEXT_PUBLIC_TENANT_SLUG=tania`.
- `eslint.config.mjs` quebra com `FlatCompat` (erro de estrutura circular) e `next lint` foi removido no Next 16 — migrar para flat config puro.
