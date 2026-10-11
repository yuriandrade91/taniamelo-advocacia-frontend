import type { ClientListItem } from "@/interfaces/client/Client.interface";
import type { ListPage } from "./pagination";
import { createSessionCache } from "./requestCache";

/**
 * As páginas da listagem de clientes, guardadas pela sessão inteira: voltar à
 * lista — ou a uma página e um filtro já vistos — não relê nem pisca o
 * carregando. Some quando os dados mudam (criar, editar, excluir) e no
 * logout, como todo `createSessionCache`.
 *
 * Mora fora da tela porque o cadastro também precisa limpá-la, e sem
 * depender de axios/authService — o que criaria um import circular.
 */
export const clientsListCache = createSessionCache<ListPage<ClientListItem>>();

/** Criar, editar ou excluir cliente deixa a listagem velha. */
export const clearClientsCache = () => clientsListCache.invalidate();
