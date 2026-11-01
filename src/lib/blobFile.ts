/**
 * Arquivo que veio pela API (blob) entregue ao navegador: aberto numa aba ou
 * salvo com o nome original.
 *
 * O endereço é local (`URL.createObjectURL`) e da origem do app — por isso só
 * abre numa aba o que o navegador mostra sem executar nada (PDF e imagem). O
 * resto é salvo: um HTML aberto daqui rodaria com o acesso do app.
 */

/** O que dá para mostrar numa aba com segurança. */
const VIEWABLE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);

/** Tempo para a aba (ou o download) ler o endereço antes de ele ser liberado. */
const REVOKE_AFTER_MS = 60_000;

function objectUrlOf(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
  return url;
}

/** Salva o arquivo com o nome dado ("salvar como" do navegador). */
export async function saveBlob(load: () => Promise<Blob>, filename: string): Promise<void> {
  const link = document.createElement("a");
  link.href = objectUrlOf(await load());
  link.download = filename;
  link.click();
}

/**
 * Abre o arquivo numa aba nova — ou salva, se não for PDF nem imagem.
 *
 * A aba é pedida **antes** da requisição: depois de um `await` o clique já não
 * conta como gesto do usuário, e o bloqueador de pop-up (o do Safari,
 * sobretudo) barraria a aba. Falhando a requisição, a aba em branco fecha.
 */
export async function openBlob(load: () => Promise<Blob>, filename: string): Promise<void> {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const blob = await load();
    if (!VIEWABLE_TYPES.has(blob.type)) {
      tab?.close();
      await saveBlob(() => Promise.resolve(blob), filename);
      return;
    }
    const url = objectUrlOf(blob);
    if (tab) tab.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    tab?.close();
    throw error;
  }
}

/** O iframe da última impressão e o endereço dele: um por vez, trocado a cada pedido. */
let printing: { frame: HTMLIFrameElement; url: string } | null = null;

/**
 * Abre o diálogo de impressão do navegador com o arquivo, sem sair da tela.
 *
 * O PDF carrega num iframe fora de vista, e a impressão é pedida a ele quando
 * termina de carregar. O iframe (e o endereço) ficam até a próxima impressão:
 * tirá-los logo depois do `print()` cancelaria o diálogo, que no Chrome não
 * espera. Fora de PDF e imagem, salva — a mesma regra de `openBlob`.
 */
export async function printBlob(load: () => Promise<Blob>, filename: string): Promise<void> {
  const blob = await load();
  if (!VIEWABLE_TYPES.has(blob.type)) {
    await saveBlob(() => Promise.resolve(blob), filename);
    return;
  }
  if (printing) {
    printing.frame.remove();
    URL.revokeObjectURL(printing.url);
  }
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.title = filename;
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.onload = () => frame.contentWindow?.print();
  frame.src = url;
  document.body.appendChild(frame);
  printing = { frame, url };
}
