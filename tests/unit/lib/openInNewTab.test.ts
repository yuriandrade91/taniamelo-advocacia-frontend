import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openInNewTab } from "@/lib/openInNewTab";

describe("openInNewTab", () => {
  const open = vi.fn();

  beforeEach(() => {
    open.mockClear();
    vi.stubGlobal("window", { open });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("abre http(s) sem dar acesso a esta página", () => {
    openInNewTab("https://meet.exemplo.com/a");
    expect(open).toHaveBeenCalledWith("https://meet.exemplo.com/a", "_blank", "noopener,noreferrer");
  });

  it("não abre o que não é endereço web: o valor vem da API", () => {
    for (const url of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,x", "", null, undefined]) {
      openInNewTab(url);
    }
    expect(open).not.toHaveBeenCalled();
  });
});
