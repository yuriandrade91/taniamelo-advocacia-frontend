import { describe, expect, it } from "vitest";

import {
  chaveDoItem,
  clienteParaItem,
  compromissoParaItem,
  formatarExclusao,
  ordenarPorExclusao,
  type TrashItem,
} from "./trashItems";
import type { Clients } from "@/interfaces/Clients.interface";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

const item = (extra: Partial<TrashItem>): TrashItem => ({
  kind: "cliente",
  id: "x",
  title: "t",
  subtitle: "",
  deletedAt: "",
  ...extra,
});

describe("clienteParaItem", () => {
  it("usa clientId, e não id — o recurso cliente manda o id nesse nome", () => {
    const cliente = {
      clientId: "c-1",
      fullName: "Maria Silva",
      cpf: "123.456.789-09",
      deletedAt: "2026-09-20T13:00:00Z",
    } as Clients;

    expect(clienteParaItem(cliente)).toEqual({
      kind: "cliente",
      id: "c-1",
      title: "Maria Silva",
      subtitle: "CPF 123.456.789-09",
      deletedAt: "2026-09-20T13:00:00Z",
    });
  });

  it("sem CPF, o subtítulo fica vazio em vez de 'CPF undefined'", () => {
    const cliente = { clientId: "c-2", fullName: "Sem CPF" } as Clients;
    expect(clienteParaItem(cliente).subtitle).toBe("");
  });

  it("sem nome mostra um marcador, não string vazia na coluna principal", () => {
    const cliente = { clientId: "c-3" } as unknown as Clients;
    expect(clienteParaItem(cliente).title).toBe("(sem nome)");
  });
});

describe("compromissoParaItem", () => {
  it("traz o cliente como identificação", () => {
    const compromisso = {
      id: "a-1",
      title: "Perícia",
      clientName: "João Souza",
      deletedAt: "2026-09-21T10:30:00Z",
    } as AppointmentResponse;

    expect(compromissoParaItem(compromisso)).toMatchObject({
      kind: "compromisso",
      id: "a-1",
      title: "Perícia",
      subtitle: "João Souza",
    });
  });

  it("compromisso sem cliente é caso normal — subtítulo vazio", () => {
    const compromisso = { id: "a-2", title: "Reunião interna" } as AppointmentResponse;
    expect(compromissoParaItem(compromisso).subtitle).toBe("");
  });
});

describe("ordenarPorExclusao", () => {
  it("mais recente primeiro — o arrependimento é sobre o que acabou de sair", () => {
    const ordenado = ordenarPorExclusao([
      item({ id: "antigo", deletedAt: "2026-09-01T10:00:00Z" }),
      item({ id: "novo", deletedAt: "2026-09-28T10:00:00Z" }),
      item({ id: "meio", deletedAt: "2026-09-15T10:00:00Z" }),
    ]);
    expect(ordenado.map((i) => i.id)).toEqual(["novo", "meio", "antigo"]);
  });

  it("sem data vai para o FIM, não para o topo", () => {
    // String vazia ordena antes de qualquer data numa comparação ingênua — o
    // registro mais incompleto acabaria em primeiro.
    const ordenado = ordenarPorExclusao([
      item({ id: "sem-data", deletedAt: "" }),
      item({ id: "com-data", deletedAt: "2026-09-01T10:00:00Z" }),
    ]);
    expect(ordenado.map((i) => i.id)).toEqual(["com-data", "sem-data"]);
  });

  it("não muda a lista original", () => {
    const original = [
      item({ id: "a", deletedAt: "2026-09-01T00:00:00Z" }),
      item({ id: "b", deletedAt: "2026-09-02T00:00:00Z" }),
    ];
    ordenarPorExclusao(original);
    expect(original.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("mistura os dois recursos numa ordem só", () => {
    const ordenado = ordenarPorExclusao([
      item({ kind: "cliente", id: "c", deletedAt: "2026-09-10T00:00:00Z" }),
      item({ kind: "compromisso", id: "a", deletedAt: "2026-09-20T00:00:00Z" }),
    ]);
    expect(ordenado.map((i) => i.kind)).toEqual(["compromisso", "cliente"]);
  });
});

describe("formatarExclusao", () => {
  it("mostra no fuso do escritório, não no do navegador", () => {
    // 14:03 UTC é 11:03 em São Paulo. Sem fixar o fuso, a mesma exclusão
    // apareceria em hora diferente para quem estivesse viajando.
    expect(formatarExclusao("2026-09-29T14:03:11Z")).toBe("29/09/2026, 11:03");
  });

  it("vazio e lixo viram travessão, não 'Invalid Date'", () => {
    expect(formatarExclusao("")).toBe("—");
    expect(formatarExclusao("não é data")).toBe("—");
  });
});

describe("chaveDoItem", () => {
  it("separa por tipo — cliente e compromisso podem ter o mesmo UUID?", () => {
    // Não podem, na prática. Mas a chave do React não é lugar de apostar
    // nisso: prefixar custa nada e elimina a classe inteira de bug.
    expect(chaveDoItem(item({ kind: "cliente", id: "1" }))).toBe("cliente:1");
    expect(chaveDoItem(item({ kind: "compromisso", id: "1" }))).toBe(
      "compromisso:1",
    );
  });
});
