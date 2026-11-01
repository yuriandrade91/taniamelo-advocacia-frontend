import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import type { ListPage } from "./pagination";
import { createSessionCache } from "./requestCache";

/**
 * Os meses da Agenda, guardados pela sessão inteira: voltar a um mês e a um
 * filtro já vistos não relê nem pisca o carregando. Some a cada gravação em
 * `/appointments` (`axiosService` — agendar, editar, concluir, cancelar ou
 * excluir, venha da Agenda ou do cartão da Home) e no logout.
 *
 * Mora fora da tela, como `clientsCache`, para o interceptor limpá-la sem
 * importar a página.
 */
export const appointmentsListCache = createSessionCache<ListPage<AppointmentResponse>>();

export const clearAppointmentsCache = () => appointmentsListCache.invalidate();
