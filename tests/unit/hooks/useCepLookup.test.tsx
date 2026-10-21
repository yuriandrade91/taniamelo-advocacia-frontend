import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCepLookup } from "@/hooks/useCepLookup";
import { envelope, failApi, onApi } from "../support/fakeApi";
import { CEP_MESSAGES } from "@/lib/cepAutofill";

const found = { zipCode: "30140000", street: "Av. Afonso Pena", neighborhood: "Centro", city: "Belo Horizonte", state: "MG" };

describe("useCepLookup", () => {
  it("CEP completo consulta, avisa enquanto carrega e preenche o endereço", async () => {
    onApi("get", "/cep/30140000", envelope(found));
    const onFound = vi.fn();
    const { result } = renderHook(() => useCepLookup(onFound));
    act(() => result.current.handleCepChange("30140-000"));
    expect(result.current.hint).toBe(CEP_MESSAGES.loading);
    await waitFor(() => expect(onFound).toHaveBeenCalledWith(found));
    expect(result.current.notice).toBeUndefined();
  });

  it("o mesmo CEP não consulta duas vezes; incompleto limpa o estado", async () => {
    onApi("get", "/cep/30140000", envelope(found));
    const onFound = vi.fn();
    const { result } = renderHook(() => useCepLookup(onFound));
    act(() => result.current.handleCepChange("30140000"));
    act(() => result.current.handleCepChange("30140-000"));
    await waitFor(() => expect(onFound).toHaveBeenCalledTimes(1));
    act(() => result.current.handleCepChange("3014"));
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it.each([
    [404, CEP_MESSAGES.notFound],
    [500, CEP_MESSAGES.unavailable],
    [429, "Muitas consultas de CEP"],
  ])("resposta %i vira aviso no campo", async (status, message) => {
    failApi("get", "/cep/", status);
    const { result } = renderHook(() => useCepLookup(vi.fn()));
    act(() => result.current.handleCepChange("99999999"));
    await waitFor(() => expect(result.current.notice).toContain(message));
  });

  it("CEP sem endereço na resposta é não encontrado", async () => {
    onApi("get", "/cep/", envelope(null));
    const { result } = renderHook(() => useCepLookup(vi.fn()));
    act(() => result.current.handleCepChange("11111111"));
    await waitFor(() => expect(result.current.notice).toBe(CEP_MESSAGES.notFound));
  });

  it("400 (CEP inválido) volta ao estado neutro", async () => {
    failApi("get", "/cep/", 400);
    const { result } = renderHook(() => useCepLookup(vi.fn()));
    act(() => result.current.handleCepChange("00000000"));
    await waitFor(() => expect(result.current.state.status).toBe("idle"));
  });

  it("resposta atrasada de um CEP já trocado é descartada", async () => {
    let release: (value: unknown) => void = vi.fn();
    onApi("get", "/cep/22222222", () => new Promise((resolve) => (release = resolve)));
    onApi("get", "/cep/33333333", envelope(found));
    const onFound = vi.fn();
    const { result } = renderHook(() => useCepLookup(onFound));
    act(() => result.current.handleCepChange("22222222"));
    act(() => result.current.handleCepChange("33333333"));
    await waitFor(() => expect(onFound).toHaveBeenCalledTimes(1));
    await act(async () => release(envelope({ ...found, city: "Outra" })));
    expect(onFound).toHaveBeenCalledTimes(1);
  });
});
