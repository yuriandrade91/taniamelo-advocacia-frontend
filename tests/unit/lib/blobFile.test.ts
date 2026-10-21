import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openBlob, saveBlob } from "@/lib/blobFile";

/**
 * Entregar ao navegador o arquivo que veio da API. Sem DOM aqui: `window`,
 * `document` e o link são dublês — o que se afirma é a ordem dos passos, que
 * é onde mora o defeito (aba pedida depois do `await` cai no bloqueador de
 * pop-up).
 */

type Tab = { opener: unknown; close: ReturnType<typeof vi.fn>; location: { href: string } };

let tab: Tab | null;
let link: { href: string; download: string; click: ReturnType<typeof vi.fn> };
let open: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  tab = { opener: "app", close: vi.fn(), location: { href: "" } };
  link = { href: "", download: "", click: vi.fn() };
  open = vi.fn(() => tab);
  vi.stubGlobal("window", { open });
  vi.stubGlobal("document", { createElement: vi.fn(() => link) });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:app/1");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const pdf = new Blob(["%PDF"], { type: "application/pdf" });

describe("saveBlob", () => {
  it("baixa com o nome original", async () => {
    await saveBlob(async () => pdf, "laudo.pdf");
    expect(link).toMatchObject({ href: "blob:app/1", download: "laudo.pdf" });
    expect(link.click).toHaveBeenCalledOnce();
  });

  it("libera o endereço depois de um tempo, não na hora", async () => {
    await saveBlob(async () => pdf, "laudo.pdf");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:app/1");
  });
});

describe("openBlob", () => {
  it("pede a aba antes de buscar o arquivo — depois do await o bloqueador barra", async () => {
    let tabWhenLoading = false;
    await openBlob(async () => {
      tabWhenLoading = open.mock.calls.length === 1;
      return pdf;
    }, "laudo.pdf");
    expect(tabWhenLoading).toBe(true);
    expect(tab?.opener).toBeNull();
    expect(tab?.location.href).toBe("blob:app/1");
  });

  it("imagem também abre na aba", async () => {
    await openBlob(async () => new Blob(["x"], { type: "image/png" }), "print.png");
    expect(tab?.location.href).toBe("blob:app/1");
    expect(link.click).not.toHaveBeenCalled();
  });

  it("o que não é PDF nem imagem é salvo, e a aba em branco fecha", async () => {
    await openBlob(async () => new Blob(["<script>"], { type: "text/html" }), "pagina.html");
    expect(tab?.close).toHaveBeenCalledOnce();
    expect(tab?.location.href).toBe("");
    expect(link).toMatchObject({ download: "pagina.html" });
    expect(link.click).toHaveBeenCalledOnce();
  });

  it("a requisição falhou: a aba em branco fecha e o erro segue", async () => {
    await expect(openBlob(async () => { throw new Error("404"); }, "laudo.pdf")).rejects.toThrow("404");
    expect(tab?.close).toHaveBeenCalledOnce();
  });

  it("aba bloqueada mesmo assim: tenta abrir o endereço direto", async () => {
    tab = null;
    await openBlob(async () => pdf, "laudo.pdf");
    expect(open).toHaveBeenLastCalledWith("blob:app/1", "_blank", "noopener,noreferrer");
  });
});
