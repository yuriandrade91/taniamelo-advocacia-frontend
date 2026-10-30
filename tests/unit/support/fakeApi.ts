import { vi } from "vitest";
import { clearClientSheets } from "@/lib/clientsCache";

/**
 * A API de mentira dos testes de componente: a instância do axios
 * (`@/services/axiosService`) trocada por rotas registradas no teste.
 *
 * O mock fica na borda HTTP de propósito: o serviço, o hook e o componente
 * rodam de verdade, e o teste diz só o que o backend responde. Rota não
 * registrada responde com o envelope vazio (lista vazia num GET), que é o
 * que uma tela recém-aberta encontra num escritório sem dados.
 */

type Method = "get" | "post" | "put" | "patch" | "delete";
type Request = { url: string; body?: unknown; config?: { params?: Record<string, unknown> } & Record<string, unknown> };
type Handler = (request: Request) => unknown;
type FieldError = { field: string | null; message: string };
type Route = { method: Method; match: string | RegExp; reply: unknown; fail?: { status: number; message: string; errors?: FieldError[] } };

const routes: Route[] = [];

/** O envelope do backend em volta de `data`. */
export const envelope = (data: unknown, pagination: Record<string, number> | null = null) => ({
  success: true,
  data,
  pagination,
  errors: [],
});

/** Envelope de página: `totalRecords` e companhia, como o `PageResponse` do backend. */
export const page = (items: unknown[], totalRecords = items.length, pageSize = 10) =>
  envelope(items, {
    pageNumber: 1,
    pageSize,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  });

const matches = (route: Route, method: Method, url: string) =>
  route.method === method &&
  (typeof route.match === "string" ? url.includes(route.match) : route.match.test(url));

/** Erro no formato do axios: o que `catch` e `messageOf` leem. */
export function httpError(status: number, message = "Falha simulada.", errors: FieldError[] = [{ field: null, message }]) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { success: false, data: null, message, errors }, headers: {} },
  });
}

/** Como o interceptor do `axiosService`: gravação bem-sucedida esvazia as leituras guardadas da ficha. */
function dispatch(method: Method, url: string, body?: unknown, config?: Request["config"]) {
  const response = respond(method, url, body, config);
  if (method !== "get") void response.then(clearClientSheets, () => undefined);
  return response;
}

function respond(method: Method, url: string, body?: unknown, config?: Request["config"]) {
  const route = routes.findLast((candidate) => matches(candidate, method, url));
  // Sem rota: lista vazia num GET de lista; resumo e escrita respondem sem dado.
  if (!route) return Promise.resolve({ status: 200, data: envelope(method === "get" && !url.endsWith("/summary") ? [] : null) });
  if (route.fail) return Promise.reject(httpError(route.fail.status, route.fail.message, route.fail.errors));
  try {
    const value = typeof route.reply === "function" ? (route.reply as Handler)({ url, body, config }) : route.reply;
    return Promise.resolve(value).then((data) => ({ status: 200, data, headers: {} }));
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

export const api = Object.assign(vi.fn((config: { url: string; method?: Method }) => dispatch(config.method ?? "get", config.url)), {
  get: vi.fn((url: string, config?: Request["config"]) => dispatch("get", url, undefined, config)),
  delete: vi.fn((url: string, config?: Request["config"]) => dispatch("delete", url, undefined, config)),
  post: vi.fn((url: string, body?: unknown, config?: Request["config"]) => dispatch("post", url, body, config)),
  put: vi.fn((url: string, body?: unknown, config?: Request["config"]) => dispatch("put", url, body, config)),
  patch: vi.fn((url: string, body?: unknown, config?: Request["config"]) => dispatch("patch", url, body, config)),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  defaults: { headers: { common: {} } },
});

/** Registra a resposta de uma rota (ou a função que a monta). A mais recente vence quando duas casam. */
export function onApi(method: Method, match: string | RegExp, reply: Handler): void;
export function onApi(method: Method, match: string | RegExp, reply: unknown): void;
export function onApi(method: Method, match: string | RegExp, reply: unknown) {
  routes.push({ method, match, reply });
}

/** A rota responde com erro HTTP; `errors` traz os erros por campo, como o backend. */
export function failApi(method: Method, match: string | RegExp, status = 500, message = "Falha simulada.", errors?: FieldError[]) {
  routes.push({ method, match, reply: null, fail: { status, message, errors } });
}

/** As chamadas feitas a um método, como `[url, body?, config?]`. */
export const callsTo = (method: Method) => api[method].mock.calls as unknown[][];

export function resetApi() {
  routes.length = 0;
  for (const method of ["get", "post", "put", "patch", "delete"] as const) api[method].mockClear();
  api.mockClear();
}
