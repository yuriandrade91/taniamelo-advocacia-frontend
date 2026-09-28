import { describe, expect, it } from "vitest";
import {
  casarIdsDeEndereco,
  countPrimaries,
  findPrimaryIndex,
  indexAfterRemoval,
  isValidPrimarySelection,
  nextSelectedIndex,
  removeSlotAt,
  withPrimaryAt,
} from "./primaryAddress";

const list = (...flags: boolean[]) => flags.map((isPrimary) => ({ isPrimary }));

describe("withPrimaryAt", () => {
  it("promove um e rebaixa todos os outros", () => {
    expect(withPrimaryAt(list(true, false, false), 1)).toEqual(
      list(false, true, false),
    );
  });

  it("promover quem já é principal não muda nada", () => {
    expect(withPrimaryAt(list(true, false), 0)).toEqual(list(true, false));
  });

  it("resolve o caso de dois marcados — sobra um", () => {
    expect(countPrimaries(withPrimaryAt(list(true, true, false), 2))).toBe(1);
  });

  it("índice fora da faixa devolve a lista intacta, sem zerar a escolha", () => {
    expect(withPrimaryAt(list(true, false), 5)).toEqual(list(true, false));
    expect(withPrimaryAt(list(true, false), -1)).toEqual(list(true, false));
  });

  it("não muta a entrada", () => {
    const original = list(true, false);
    withPrimaryAt(original, 1);
    expect(original).toEqual(list(true, false));
  });
});

describe("findPrimaryIndex", () => {
  it("acha o principal", () => {
    expect(findPrimaryIndex(list(false, true, false))).toBe(1);
  });

  it("devolve -1 quando não há nenhum", () => {
    expect(findPrimaryIndex(list(false, false))).toBe(-1);
  });
});

describe("isValidPrimarySelection", () => {
  it("aceita exatamente um", () => {
    expect(isValidPrimarySelection(list(false, true, false))).toBe(true);
  });

  it("recusa dois — é o lote que o backend devolveria 400", () => {
    expect(isValidPrimarySelection(list(true, true))).toBe(false);
  });

  it("recusa nenhum", () => {
    expect(isValidPrimarySelection(list(false, false))).toBe(false);
  });

  it("lista vazia é válida — não há endereço a enviar", () => {
    expect(isValidPrimarySelection([])).toBe(true);
  });
});

describe("removeSlotAt", () => {
  const BLANK = { tag: "vazio", isPrimary: false };
  const v = (tag: string) => ({ tag, isPrimary: false });

  it("desloca valores e ids juntos ao remover o do meio", () => {
    const result = removeSlotAt(
      [v("a"), v("b"), v("c")],
      ["id-a", "id-b", "id-c"],
      1,
      BLANK,
    );
    expect(result.values.map((x) => x.tag)).toEqual(["a", "c", "vazio"]);
    expect(result.ids).toEqual(["id-a", "id-c", null]);
  });

  it("mantém o pareamento valor↔id — é o bug que sobrescreve endereço errado", () => {
    const result = removeSlotAt(
      [v("a"), v("b"), v("c")],
      ["id-a", "id-b", "id-c"],
      0,
      BLANK,
    );
    // "b" tem que continuar apontando para id-b depois de andar de posição.
    expect(result.values[0].tag).toBe("b");
    expect(result.ids[0]).toBe("id-b");
    expect(result.values[1].tag).toBe("c");
    expect(result.ids[1]).toBe("id-c");
  });

  it("a última posição volta em branco e sem id", () => {
    const result = removeSlotAt([v("a"), v("b")], ["id-a", null], 0, BLANK);
    expect(result.values[1]).toEqual(BLANK);
    expect(result.ids[1]).toBeNull();
  });

  it("índice fora da faixa não mexe em nada", () => {
    const values = [v("a"), v("b")];
    const ids = ["id-a", "id-b"];
    expect(removeSlotAt(values, ids, 9, BLANK).ids).toEqual(ids);
    expect(removeSlotAt(values, ids, -1, BLANK).values.map((x) => x.tag)).toEqual(
      ["a", "b"],
    );
  });

  it("não muta a entrada", () => {
    const values = [v("a"), v("b")];
    const ids = ["id-a", "id-b"];
    removeSlotAt(values, ids, 0, BLANK);
    expect(values.map((x) => x.tag)).toEqual(["a", "b"]);
    expect(ids).toEqual(["id-a", "id-b"]);
  });
});

describe("nextSelectedIndex", () => {
  it("removendo antes da selecionada, o foco anda um para trás", () => {
    expect(nextSelectedIndex(0, 2, 2)).toBe(1);
  });

  it("removendo a própria selecionada, fica na mesma posição (agora outra aba)", () => {
    expect(nextSelectedIndex(1, 1, 2)).toBe(1);
  });

  it("removendo a última selecionada, volta para a anterior", () => {
    expect(nextSelectedIndex(2, 2, 2)).toBe(1);
  });

  it("nunca passa do fim nem fica negativo", () => {
    expect(nextSelectedIndex(0, 0, 1)).toBe(0);
    expect(nextSelectedIndex(0, 0, 0)).toBe(0);
  });
});

describe("indexAfterRemoval", () => {
  it("quem estava depois anda uma casa para trás", () => {
    expect(indexAfterRemoval(2, 0)).toBe(1);
    expect(indexAfterRemoval(1, 0)).toBe(0);
  });

  it("quem estava antes não se move", () => {
    expect(indexAfterRemoval(0, 2)).toBe(0);
    expect(indexAfterRemoval(1, 2)).toBe(1);
  });

  it("a própria removida deixa de existir", () => {
    expect(indexAfterRemoval(1, 1)).toBe(-1);
  });
});


/**
 * Casamento dos ids devolvidos pelo lote com as abas que os originaram.
 *
 * O caso que dói é o esparso: abas 0 e 2 preenchidas, aba 1 vazia. A resposta
 * do backend é densa — dois itens —, e casar por posição gravaria o id do
 * endereço da aba 2 na aba 1. A tela não denunciaria nada: as duas abas
 * ficariam com um id válido, e a próxima edição sobrescreveria um endereço
 * que ninguém pediu para mudar.
 */
describe("casarIdsDeEndereco", () => {
  it("casa pela ordem de envio, não pela posição da aba", () => {
    const resultado = casarIdsDeEndereco(
      [null, null, null],
      [0, 2],
      [{ id: "end-A" }, { id: "end-C" }],
    );
    expect(resultado).toEqual(["end-A", null, "end-C"]);
  });

  it("aba não enviada conserva o id que já tinha", () => {
    const resultado = casarIdsDeEndereco(
      ["end-antigo", null, null],
      [1],
      [{ id: "end-novo" }],
    );
    expect(resultado).toEqual(["end-antigo", "end-novo", null]);
  });

  it("resposta mais curta que o pedido não apaga id existente", () => {
    const resultado = casarIdsDeEndereco(
      ["end-antigo", "outro"],
      [0, 1],
      [{ id: "end-novo" }],
    );
    expect(resultado).toEqual(["end-novo", "outro"]);
  });

  it("item sem id na resposta não vira undefined na lista", () => {
    const resultado = casarIdsDeEndereco([null], [0], [{}]);
    expect(resultado).toEqual([null]);
  });

  it("lote vazio devolve a lista intacta", () => {
    expect(casarIdsDeEndereco(["a", "b"], [], [])).toEqual(["a", "b"]);
  });
});
