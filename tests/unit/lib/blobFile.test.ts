import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openBlob, printBlob, saveBlob } from "@/lib/blobFile";

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

describe("printBlob", () => {
  type Frame = {
    style: { cssText: string };
    src: string;
    onload: (() => void) | null;
    remove: ReturnType<typeof vi.fn>;
    setAttribute: ReturnType<typeof vi.fn>;
    contentWindow: { print: ReturnType<typeof vi.fn> };
  };
  const newFrame = (): Frame => ({
    style: { cssText: "" },
    src: "",
    onload: null,
    remove: vi.fn(),
    setAttribute: vi.fn(),
    contentWindow: { print: vi.fn() },
  });
  let appended: Frame[];

  beforeEach(() => {
    appended = [];
    vi.stubGlobal("document", {
      createElement: vi.fn((tag: string) => (tag === "iframe" ? newFrame() : link)),
      body: { appendChild: (frame: Frame) => appended.push(frame) },
    });
  });

  it("imprime só depois de o arquivo carregar no iframe", async () => {
    await printBlob(async () => pdf, "ficha.pdf");
    const [frame] = appended;
    expect(frame.src).toBe("blob:app/1");
    expect(frame.contentWindow.print).not.toHaveBeenCalled();
    frame.onload?.();
    expect(frame.contentWindow.print).toHaveBeenCalledOnce();
  });

  it("a impressão seguinte tira o iframe e o endereço da anterior; a atual fica", async () => {
    await printBlob(async () => pdf, "ficha.pdf");
    const [first] = appended;
    vi.mocked(URL.revokeObjectURL).mockClear();
    expect(first.remove).not.toHaveBeenCalled();

    await printBlob(async () => pdf, "ficha.pdf");
    expect(first.remove).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(appended[1].remove).not.toHaveBeenCalled();
  });

  it("o que não é PDF nem imagem é salvo, sem iframe: não roda com o acesso do app", async () => {
    await printBlob(async () => new Blob(["<script>"], { type: "text/html" }), "pagina.html");
    expect(appended).toHaveLength(0);
    expect(link).toMatchObject({ download: "pagina.html" });
    expect(link.click).toHaveBeenCalledOnce();
  });
});
