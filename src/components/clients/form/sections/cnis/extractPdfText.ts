/**
 * Texto de um PDF, no navegador.
 *
 * ## Por que o import é dinâmico
 *
 * `pdfjs-dist` ainda não está no `package.json`. Um `import` estático quebraria
 * a compilação do projeto inteiro por causa de uma seção; o `import()` dentro
 * da função quebra só esta função, e com uma mensagem que diz o comando a
 * rodar. A seção continua utilizável colando o texto enquanto isso.
 *
 * ## Por que reconstruir as linhas
 *
 * `getTextContent()` devolve fragmentos soltos com coordenadas, não linhas: o
 * PDF não tem conceito de linha, tem posições. Agrupar por `transform[5]` (a
 * coordenada vertical) é o que devolve a linha visual — e é dela que o parser
 * depende, porque o CNIS é uma tabela onde a linha é o registro.
 *
 * A tolerância de 2 unidades absorve o desalinhamento de meio ponto entre
 * células de uma mesma linha, que aparece em quase todo PDF gerado por
 * relatório.
 */

const INSTALL_HINT =
  "A leitura de PDF precisa da biblioteca pdfjs-dist, que ainda não está instalada. Rode `pnpm add pdfjs-dist` na raiz do projeto — ou, por enquanto, abra o PDF, selecione tudo (Ctrl+A), copie e cole no campo de texto abaixo.";

export class PdfSupportError extends Error {
  constructor(message: string = INSTALL_HINT) {
    super(message);
    this.name = "PdfSupportError";
  }
}

type TextItem = { str: string; transform: number[] };

/**
 * Só o que usamos do pdf.js, declarado aqui.
 *
 * `typeof import("pdfjs-dist")` não serve: o TypeScript resolve o tipo em
 * tempo de compilação e o pacote não está instalado, então o projeto inteiro
 * deixaria de compilar por causa desta seção. Esta interface é o contrato
 * mínimo, e o `as` fica confinado a uma linha.
 */
interface PdfJsModule {
  version: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(source: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: unknown[] }>;
      }>;
    }>;
  };
}

/** Fragmentos → linhas, agrupando por altura na página. */
function itemsToLines(items: TextItem[]): string[] {
  const rows = new Map<number, { x: number; text: string }[]>();

  for (const item of items) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5]);
    // Encaixa numa linha já vista quando a diferença é de arredondamento.
    let key = y;
    for (const existing of rows.keys()) {
      if (Math.abs(existing - y) <= 2) {
        key = existing;
        break;
      }
    }
    const row = rows.get(key) ?? [];
    row.push({ x: item.transform[4], text: item.str });
    rows.set(key, row);
  }

  return [...rows.entries()]
    // Y cresce para cima no PDF: ordem decrescente é a ordem de leitura.
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((cell) => cell.text)
        .join("  ")
        .replace(/\s{3,}/g, "  ")
        .trim(),
    )
    .filter((line) => line.length > 0);
}

export async function extractPdfText(file: File): Promise<string> {
  let pdfjs: PdfJsModule;
  try {
    // O nome via variável impede o bundler de tentar resolver o módulo em
    // tempo de build — sem isso, a ausência do pacote vira erro de compilação
    // em vez do aviso legível que queremos.
    const moduleName = "pdfjs-dist";
    pdfjs = (await import(/* webpackIgnore: true */ moduleName)) as unknown as PdfJsModule;
  } catch {
    throw new PdfSupportError();
  }

  try {
    // O worker roda em thread separada; sem apontá-lo o pdf.js cai para o modo
    // síncrono e trava a interface em documentos grandes.
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  } catch {
    // Versões sem `GlobalWorkerOptions` seguem no modo padrão.
  }

  const buffer = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(itemsToLines(content.items as TextItem[]).join("\n"));
  }

  return pages.join("\n");
}

/**
 * Lê o arquivo escolhido, seja PDF ou texto.
 *
 * `.txt` existe porque é a saída de `pdftotext` e de qualquer extração que a
 * pessoa já tenha feito — e porque é o caminho que funciona hoje, sem instalar
 * nada.
 */
export async function readCnisFile(file: File): Promise<string> {
  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) return extractPdfText(file);
  return file.text();
}
