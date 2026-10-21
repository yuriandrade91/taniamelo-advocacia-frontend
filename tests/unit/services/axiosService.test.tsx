import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signIn } from "../support/session";

/**
 * A instância real do axios (o resto dos testes de tela a troca pela API de
 * mentira): interceptors de token, tenant, refresh e erro, com um adapter no
 * lugar da rede.
 */
vi.unmock("@/services/axiosService");

const { default: api } = await import("@/services/axiosService");
const { notificationCenter } = await import("@/services/notificationService");

type Reply = { status: number; data?: unknown };
let replies: Record<string, Reply | ((config: InternalAxiosRequestConfig) => Reply)> = {};
const seen: InternalAxiosRequestConfig[] = [];

const adapter: AxiosAdapter = async (config) => {
  seen.push(config);
  const key = Object.keys(replies).find((path) => config.url?.includes(path));
  const found = key ? replies[key] : { status: 200, data: { success: true, data: null } };
  const reply = typeof found === "function" ? found(config) : found;
  const response = { data: reply.data, status: reply.status, statusText: "", headers: {}, config };
  if (reply.status >= 400) {
    throw Object.assign(new axios.AxiosError("falha", String(reply.status), config, null, response), { response });
  }
  return response;
};

beforeEach(() => {
  replies = {};
  seen.length = 0;
  api.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;
});

afterEach(() => vi.restoreAllMocks());

describe("axiosService", () => {
  it("anexa o token e o tenant e avisa o sucesso pela central", async () => {
    signIn();
    const notify = vi.spyOn(notificationCenter, "notifyResponse");
    replies["/clients"] = { status: 200, data: { success: true, data: [] } };
    await api.get("/api/v1/clients", { params: { year: [2025, 2026] } });
    expect(seen[0].headers.Authorization).toBe("Bearer token-de-teste");
    expect(seen[0].headers["X-Tenant-Id"]).toBe("tenant-1");
    expect(notify).toHaveBeenCalled();
  });

  it("401 renova o token uma vez e repete a requisição", async () => {
    signIn();
    let calls = 0;
    replies["/clients"] = () => (++calls === 1 ? { status: 401 } : { status: 200, data: { success: true, data: [] } });
    replies["/auth/refresh"] = { status: 200, data: { data: { token: "token-novo", expiresInSeconds: 60 } } };
    const response = await api.get("/api/v1/clients");
    expect(response.status).toBe(200);
    expect(seen.at(-1)?.headers.Authorization).toBe("Bearer token-novo");
  });

  it("401 com refresh recusado encerra a sessão", async () => {
    signIn();
    replies["/clients"] = { status: 401 };
    replies["/auth/refresh"] = { status: 401 };
    const session = await import("@/lib/session");
    const expire = vi.spyOn(session, "expireSession").mockImplementation(() => {});
    await expect(api.get("/api/v1/clients")).rejects.toBeTruthy();
    expect(expire).toHaveBeenCalled();
  });

  it("401 na rota de login é resposta, não sessão vencida", async () => {
    replies["/auth/login"] = { status: 401, data: { message: "Credenciais inválidas" } };
    const notify = vi.spyOn(notificationCenter, "notifyError");
    await expect(api.post("/api/v1/auth/login", {})).rejects.toBeTruthy();
    expect(notify).toHaveBeenCalled();
  });

  it("erro de arquivo em blob vira o envelope do backend", async () => {
    const notify = vi.spyOn(notificationCenter, "notifyError").mockImplementation(() => {});
    replies["/files/x"] = { status: 500, data: new Blob([JSON.stringify({ message: "Falha no storage" })]) };
    await expect(api.get("/api/v1/clients/c1/files/x", { responseType: "blob" })).rejects.toMatchObject({
      response: { data: { message: "Falha no storage" } },
    });
    expect(notify).toHaveBeenCalled();
  });

  it("blob ilegível fica sem envelope", async () => {
    vi.spyOn(notificationCenter, "notifyError").mockImplementation(() => {});
    replies["/files/y"] = { status: 500, data: new Blob(["não é json"]) };
    await expect(api.get("/api/v1/clients/c1/files/y")).rejects.toMatchObject({ response: { data: undefined } });
  });

  it("skipErrorToast deixa a tela tratar o erro", async () => {
    const notify = vi.spyOn(notificationCenter, "notifyError");
    replies["/users/me"] = { status: 500 };
    await expect(api.get("/api/v1/users/me", { skipErrorToast: true })).rejects.toBeTruthy();
    expect(notify).not.toHaveBeenCalled();
  });

  it("com a sessão acabando, nenhum erro vira toast", async () => {
    const session = await import("@/lib/session");
    vi.spyOn(session, "isSessionEnding").mockReturnValue(true);
    const notify = vi.spyOn(notificationCenter, "notifyError");
    replies["/clients"] = { status: 500 };
    await expect(api.get("/api/v1/clients")).rejects.toBeTruthy();
    expect(notify).not.toHaveBeenCalled();
  });
});
