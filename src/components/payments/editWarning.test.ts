import { describe, expect, it } from "vitest";
import { editWarning } from "./editWarning";

describe("editWarning", () => {
  it("em aberto (previsto ou atrasado) edita direto, sem aviso", () => {
    expect(editWarning({ status: "Pendente", overdue: false }, "pago")).toBeNull();
    expect(editWarning({ status: "Pendente", overdue: true }, "recebido")).toBeNull();
  });

  it("recebido avisa com a data do recebimento", () => {
    const warning = editWarning(
      { status: "Pago", paidDate: "2026-09-30" },
      "recebido",
    );
    expect(warning?.heading).toBe("Editar um lançamento já recebido?");
    expect(warning?.description).toContain("recebido em 30/09/2026");
  });

  it("pago sem data ainda avisa, sem inventar a data", () => {
    const warning = editWarning({ status: "Pago" }, "pago");
    expect(warning?.heading).toBe("Editar um lançamento já pago?");
    expect(warning?.description).toMatch(/^Ele foi pago e já entra/);
  });

  it("cancelado avisa que editar pode reabrir", () => {
    const warning = editWarning({ status: "Cancelado", overdue: true }, "pago");
    expect(warning?.heading).toBe("Editar um lançamento cancelado?");
    expect(warning?.description).toContain("reabri-lo");
  });
});
