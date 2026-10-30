import type { ClientListItem } from "@/interfaces/client/Client.interface";
import type { ListPage } from "./pagination";
import { createSessionCache } from "./requestCache";

/**
 * As páginas da listagem de clientes, guardadas pela sessão inteira: voltar à
 * lista — ou a uma página e um filtro já vistos — não relê nem pisca o
 * carregando. Some quando os dados mudam (criar, editar, excluir) e no
 * logout, como qualquer `createSessionCache`.
 *
 * Mora fora da tela porque o cadastro também precisa limpá-la, e sem
 * depender de axios/authService — o que criaria um import circular.
 */
export const clientsListCache = createSessionCache<ListPage<ClientListItem>>();

/** Criar, editar ou excluir cliente deixa a listagem velha. */
export const clearClientsCache = () => clientsListCache.invalidate();

/**
 * As leituras da ficha de um cliente (dados, endereços, entrevistas, arquivos,
 * trilhas, deficiência, financeiro), por cliente e rota: reabrir a ficha do
 * mesmo cliente não relê nada.
 *
 * Some inteira a cada gravação bem-sucedida (`axiosService`), porque qualquer
 * POST/PUT/PATCH/DELETE pode ter mudado o que a ficha mostra, inclusive o
 * PATCH de situação ou de etapa no INSS feito na própria lista. E some no
 * logout. Erro não fica guardado: a próxima abertura tenta de novo.
 */
const clientSheetReads = createSessionCache<unknown>(200);

export const sheetRead = <T,>(key: string, fetcher: () => Promise<T>): Promise<T> =>
  clientSheetReads.load(key, fetcher) as Promise<T>;

export const clearClientSheets = () => clientSheetReads.invalidate();
