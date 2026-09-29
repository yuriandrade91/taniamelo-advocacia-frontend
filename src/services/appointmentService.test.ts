import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A lixeira da agenda.
 *
 * O que se testa é o contrato que a tela depende: a lista de excluídos tem
 * rota própria (e não é a agenda com um filtro), e restaurar é um PATCH sem
 * corpo — mandar o compromisso de volta inteiro sobrescreveria o que estava
 * gravado com o que a tela por acaso tinha em mãos.
 */

vi.mock("@/services/axiosService", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from "@/services/axiosService";
import {
  deleteAppointment,
  listDeletedAppointments,
  restoreAppointment,
} from "./appointmentService";

const get = vi.mocked(axiosInstance.get);
const patch = vi.mocked(axiosInstance.patch);
const del = vi.mocked(axiosInstance.delete);

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: { success: true, data: [] } });
  patch.mockResolvedValue({ data: { success: true, data: {} } });
  del.mockResolvedValue({ data: undefined });
});

describe("listDeletedAppointments", () => {
  it("bate em /appointments/deleted", async () => {
    await listDeletedAppointments();
    expect(get.mock.calls[0][0]).toMatch(/\/appointments\/deleted$/);
  });

  it("repassa a paginação como veio", async () => {
    await listDeletedAppointments({ pageNumber: 2, pageSize: 50 });
    expect(get.mock.calls[0][1]).toMatchObject({
      params: { pageNumber: 2, pageSize: 50 },
    });
  });
});

describe("restoreAppointment", () => {
  it("é PATCH no id, com corpo vazio", async () => {
    await restoreAppointment("a-1");
    expect(patch.mock.calls[0][0]).toMatch(/\/appointments\/a-1\/restore$/);
    expect(patch.mock.calls[0][1]).toEqual({});
  });

  it("avisa por padrão — restaurar é ação deliberada, o toast confirma que foi", async () => {
    await restoreAppointment("a-1");
    expect(patch.mock.calls[0][2]).toMatchObject({
      skipSuccessToast: undefined,
    });
  });

  it("silent cala o toast, para quem já avisou na própria tela", async () => {
    await restoreAppointment("a-1", { silent: true });
    expect(patch.mock.calls[0][2]).toMatchObject({ skipSuccessToast: true });
  });
});

describe("deleteAppointment", () => {
  it("continua com a janela de desfazer podendo silenciar", async () => {
    await deleteAppointment("a-1", { silent: true });
    expect(del.mock.calls[0][1]).toMatchObject({ skipSuccessToast: true });
  });
});
