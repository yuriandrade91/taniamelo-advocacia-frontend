import { describe, expect, it } from "vitest";
import { safeRichText } from "@/lib/richText";

/**
 * O HTML do editor rico mostrado fora dele (a Revisão do cadastro). Antes ele
 * virava texto puro e o relato perdia negrito e listas; mostrar exige
 * `innerHTML`, e por isso só passam as marcas da barra do editor.
 */

describe("safeRichText", () => {
  it("o que o editor produz passa inteiro", () => {
    const html =
      "<p>Texto <strong>negrito</strong>, <em>itálico</em>, <u>sublinhado</u> e <s>tachado</s></p>" +
      "<ul><li><p>um</p></li></ul><ol><li><p>dois</p></li></ol><blockquote><p>citação</p></blockquote>";
    expect(safeRichText(html)).toBe(html);
  });

  it("atributos saem, a marca fica (o <br> do fim de parágrafo do TipTap)", () => {
    expect(safeRichText('<p class="x" style="color:red">a<br class="ProseMirror-trailingBreak"></p>')).toBe(
      "<p>a<br></p>",
    );
  });

  it("evento em marca permitida não passa", () => {
    expect(safeRichText('<p onclick="alert(1)">a</p>')).toBe("<p>a</p>");
    expect(safeRichText("<strong onmouseover=alert(1)>a</strong>")).toBe("<strong>a</strong>");
  });

  it("script, imagem, link e svg somem — o texto entre eles vira texto", () => {
    expect(safeRichText("<p>a<script>alert(1)</script></p>")).toBe("<p>aalert(1)</p>");
    expect(safeRichText('<img src=x onerror="alert(1)">')).toBe("");
    expect(safeRichText('<a href="javascript:alert(1)">clique</a>')).toBe("clique");
    expect(safeRichText("<svg/onload=alert(1)>")).toBe("");
    expect(safeRichText('<iframe src="//x"></iframe>')).toBe("");
  });

  it("marca partida não se remonta em <script>", () => {
    expect(safeRichText("<scr<script>ipt>alert(1)</script>")).not.toMatch(/<script/i);
  });

  it("tirar uma marca não remonta outra com o `<` que sobrou antes dela", () => {
    expect(safeRichText("<<img>img src=x onerror=alert(1)>")).toBe("&lt;img src=x onerror=alert(1)>");
    expect(safeRichText("<<b>img src=x onerror=alert(1)>")).toBe("&lt;<b>img src=x onerror=alert(1)>");
  });

  it("marca sem fim vira texto", () => {
    expect(safeRichText("<p>a</p><img src=x onerror=alert(1)")).toBe("<p>a</p>&lt;img src=x onerror=alert(1)");
    expect(safeRichText("idade < 60 anos")).toBe("idade &lt; 60 anos");
  });

  it("maiúsculas viram a marca permitida em minúsculas", () => {
    expect(safeRichText("<P><STRONG>a</STRONG></P>")).toBe("<p><strong>a</strong></p>");
  });

  it("o texto escapado continua escapado", () => {
    expect(safeRichText("<p>&lt;script&gt; &amp; laudo</p>")).toBe("<p>&lt;script&gt; &amp; laudo</p>");
  });

  it("vazio é vazio", () => {
    expect(safeRichText("")).toBe("");
  });
});
