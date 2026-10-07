"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Drawer, Modal, Skeleton, Tabs, Tooltip } from "@heroui/react";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import { CalendarIcon } from "@/components/ui/icons/CalendarIcon";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import { viewAction, type RowAction } from "@/components/ui/table/RowActions";
import {
  TAB_CLASS,
  TAB_INDICATOR_CLASS,
  TAB_LIST_CLASS,
  TAB_LIST_CONTAINER_CLASS,
} from "@/components/clients/form/tabs/tabStyle";
import { formatWhen, groupByDay, localDayOf } from "@/components/agenda/agendaGrouping";
import {
  AppointmentRow,
  DayHeading,
  appointmentActions,
} from "@/components/agenda/agendaRow";
import { useNow } from "@/hooks/useNow";
import { useAppointmentActions } from "@/components/agenda/useAppointmentActions";
import { useAppointmentEditor } from "@/components/agenda/useAppointmentEditor";
import { MONTH_LABELS } from "@/constants/date/months";
import { usePermissoes } from "@/hooks/usePermissoes";
import { applyPendingOverlay, applyPendingTotal } from "@/lib/pendingActions";
import { getAppointmentSummary, listAppointments } from "@/services/appointmentService";
import type { AppointmentResponse, AppointmentSummary } from "@/interfaces/appointment/Appointment.interface";
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";

/**
 * Card "Agenda" da Home — o resumo compacto: os próximos agendados de cada
 * mês do ano, em abas. A visão completa (todos os status, filtros, por dia) é
 * a página `/agenda`, para onde "Visualizar todos" leva.
 *
 * Formulário e ações são os mesmos da página (`useAppointmentEditor`,
 * `useAppointmentActions`): as duas telas validam, avisam conflito e desfazem
 * igual. As abas vêm de `GET /appointments/summary?year=`; a lista do mês, de
 * `GET /appointments?status=AGENDADO`, com só `COMPACT_LIMIT` itens.
 *
 * ## O desenho é o das outras duas telas, não um terceiro
 *
 * As abas usam o `tabStyle` do cadastro de cliente — o padrão de abas da
 * aplicação: segmentos num contêiner com filete, a ativa em azul. Antes eram
 * as pílulas cruas do HeroUI com um selo vermelho, e a Home virava a única
 * tela com abas de outro tipo.
 *
 * O conteúdo é o da página `/agenda`: os compromissos agrupados por dia, com
 * o cabeçalho do dia e a linha de `agendaRow` em modo `compact` — as MESMAS
 * peças que a sanfona usa. A sanfona não cabe num terço de grade (régua do
 * expediente, paginação por dia), mas a hora, o tipo na rampa de azul, a
 * modalidade, o cliente e o selo de status leem igual nas duas telas.
 */

const COMPACT_LIMIT = 3;

const PENDING_STATUS_LABELS = {
  complete: AppointmentStatusLabelByKey.CONCLUIDO,
  cancel: AppointmentStatusLabelByKey.CANCELADO,
};

type MonthPage = { items: AppointmentResponse[]; total: number };

export default function AppointmentsCard({ className = "" }: { className?: string }) {
  const { podeDestruir } = usePermissoes();
  const now = useNow();
  const [startOfVisit] = useState(() => new Date());
  const year = startOfVisit.getFullYear();
  const currentMonth = startOfVisit.getMonth() + 1;
  /** `yyyy-MM-dd` de hoje — é o que o agrupamento por dia usa como chave. */
  const today = localDayOf(startOfVisit.toISOString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [details, setDetails] = useState<AppointmentResponse | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);

  /** Sobe a cada gravação: abas e listas são relidas (uma edição pode mudar o mês). */
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  const [summary, setSummary] = useState<AppointmentSummary[] | null>(null);
  useEffect(() => {
    let active = true;
    getAppointmentSummary(year)
      .then((envelope) => envelope?.data ?? [], () => [])
      .then((items) => {
        if (active) setSummary(items);
      });
    return () => {
      active = false;
    };
  }, [year, version]);

  /**
   * Uma página por mês e versão: voltar a uma aba já vista não pede de novo;
   * depois de uma gravação, a versão nova pede.
   */
  const [pages, setPages] = useState<Record<string, MonthPage>>({});
  const requested = useRef(new Set<string>());
  const pageKey = `${version}:${selectedMonth}`;
  useEffect(() => {
    if (requested.current.has(pageKey)) return;
    requested.current.add(pageKey);
    listAppointments({ year, month: selectedMonth, status: "AGENDADO", pageNumber: 1, pageSize: COMPACT_LIMIT })
      .then(
        (envelope) => ({ items: envelope?.data ?? [], total: envelope?.pagination?.totalRecords ?? 0 }),
        () => {
          // Falhou: libera para tentar de novo, em vez de guardar o erro como mês vazio.
          requested.current.delete(pageKey);
          return { items: [], total: 0 };
        },
      )
      .then((page) => setPages((current) => ({ ...current, [pageKey]: page })));
  }, [pageKey, year, selectedMonth]);

  // `compact`: o formulário abre num painel lateral, e dois campos lado a
  // lado ali espremeriam os dois.
  const editor = useAppointmentEditor({ onSaved: reload, compact: true });
  const actions = useAppointmentActions({ onSettled: reload });
  const page = pages[pageKey];
  const items = applyPendingOverlay(page?.items ?? [], actions.pending, PENDING_STATUS_LABELS);
  const total = applyPendingTotal(page?.total ?? 0, page?.items ?? [], actions.pending);

  /**
   * Abas: só meses com compromisso, mais o atual e o escolhido (para o vazio
   * ter onde aparecer). A contagem do mês aberto é a exata (agendados); a dos
   * outros é a do resumo, até a pessoa navegar até eles.
   */
  const months = [...new Set([...(summary ?? []).filter((s) => s.count > 0).map((s) => s.month), currentMonth, selectedMonth])]
    .sort((a, b) => a - b)
    .map((month) => ({
      id: String(month),
      label: MONTH_LABELS[month - 1],
      count: month === selectedMonth && page ? total : (summary?.find((s) => s.month === month)?.count ?? 0),
    }));

  /**
   * As mesmas ações da página (`appointmentActions`) — o que o backend
   * permite é igual nas duas telas. "Ver detalhes" é exclusiva do cartão:
   * aqui não há espaço para a descrição, que na página aparece na linha.
   */
  const rowActions: RowAction<AppointmentResponse>[] = [
    {
      ...viewAction<AppointmentResponse>("Ver detalhes", setDetails),
      visible: (a) => Boolean(a.description?.trim()),
    },
    ...appointmentActions({
      onEdit: editor.openEdit,
      onComplete: actions.requestComplete,
      onCancel: actions.requestCancel,
      // Excluir é de advogado/admin: o backend recusa o atendente com 403.
      onDelete: podeDestruir ? actions.requestDelete : undefined,
      onCreate: editor.openCreate,
    }),
  ];

  /** O mês em dias, como na página — o cartão só mostra menos itens. */
  const days = groupByDay(items);

  return (
    <Card className={`flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4">
        <SectionTitle>Agenda</SectionTitle>
        <Tooltip delay={0}>
          <Tooltip.Content showArrow placement="bottom">
            <Tooltip.Arrow />
            <p>Novo compromisso</p>
          </Tooltip.Content>
          <Button
            type="button"
            onClick={editor.openCreate}
            aria-label="Novo compromisso"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/5"
          >
            <CalendarIcon className="h-6 w-6" />
          </Button>
        </Tooltip>
      </header>

      {summary === null ? (
        <CompactSkeleton />
      ) : !summary.some((s) => s.count > 0) && !page?.total ? (
        <p className="mt-4 py-6 text-center text-sm text-gray-100/60">Ainda não há nenhum compromisso agendado.</p>
      ) : (
        <Tabs
          selectedKey={String(selectedMonth)}
          onSelectionChange={(key) => setSelectedMonth(Number(key))}
          className="mt-4 gap-4"
        >
          <Tabs.ListContainer className={TAB_LIST_CONTAINER_CLASS}>
            <Tabs.List aria-label="Meses da agenda" className={TAB_LIST_CLASS}>
              {months.map((month) => (
                <Tabs.Tab
                  key={month.id}
                  id={month.id}
                  className={`${TAB_CLASS} px-3! py-2! text-sm`}
                >
                  {month.label}
                  {month.count > 0 && (
                    <span
                      aria-hidden="true"
                      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-white tabular-nums group-data-[selected=true]:bg-white/20"
                    >
                      {month.count}
                    </span>
                  )}
                  <span className="sr-only">
                    {" "}
                    ({month.count === 1
                      ? "1 compromisso"
                      : `${month.count} compromissos`})
                  </span>
                  <Tabs.Indicator className={TAB_INDICATOR_CLASS} />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id={String(selectedMonth)} className="p-0">
            {!page ? (
              <CompactSkeleton tabs={false} />
            ) : total === 0 ? (
              <p className="py-6 text-sm text-gray-100/60">
                Não há agendamentos para {MONTH_LABELS[selectedMonth - 1]} ainda.
              </p>
            ) : (
              <div className="flex flex-1 flex-col gap-4">
                {days.map((day) => (
                  <section key={day.date}>
                    <header className="flex items-center gap-3 pb-1">
                      <DayHeading day={day} isToday={day.date === today} compact />
                    </header>
                    <ul>
                      {day.items.map((item) => (
                        <AppointmentRow
                          key={item.id}
                          appointment={item}
                          actions={rowActions}
                          now={now}
                          compact
                        />
                      ))}
                    </ul>
                  </section>
                ))}
                {total > COMPACT_LIMIT && (
                  <Link
                    href="/agenda"
                    className="self-center text-sm text-secondary underline-offset-4 hover:text-secondary/70 hover:underline"
                  >
                    Visualizar todos
                  </Link>
                )}
              </div>
            )}
          </Tabs.Panel>
        </Tabs>
      )}

      <Drawer
        isOpen={editor.isOpen}
        onOpenChange={(open) => {
          if (open) return;
          // Fechar com o formulário mexido pede confirmação: o que foi preenchido se perderia.
          if (editor.isDirty) setIsDiscarding(true);
          else editor.close();
        }}
      >
        <Drawer.Backdrop variant="opaque">
          <Drawer.Content placement="right">
            <Drawer.Dialog className="w-auto">
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Heading>{editor.isEditing ? "Editar compromisso" : "Novo compromisso"}</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>
                <form
                  id="appointment-form"
                  className="flex flex-col gap-4"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    editor.submit();
                  }}
                >
                  {editor.fields}
                </form>
              </Drawer.Body>
              <Drawer.Footer className="flex justify-between">
                <Button type="submit" form="appointment-form" isDisabled={editor.isSubmitting || !editor.isValid} className="w-full">
                  {editor.isEditing ? "Salvar" : "Agendar"}
                </Button>
                <Button type="button" slot="close" variant="ghost">
                  Cancelar
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
      {editor.conflictDialog}
      {actions.dialogs}

      <ConfirmDialog
        isOpen={isDiscarding}
        onClose={() => setIsDiscarding(false)}
        tone="danger"
        heading="Descartar compromisso?"
        description="As informações preenchidas serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar preenchendo"
        onConfirm={editor.close}
      />

      <Modal isOpen={details !== null} onOpenChange={(open) => !open && setDetails(null)}>
        <Modal.Backdrop variant="opaque">
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{details?.title}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {details && (
                  <p className="text-xs text-gray-100/60">
                    {[formatWhen(details.startAt), details.type, details.clientName].filter(Boolean).join(" · ")}
                  </p>
                )}
                {/* Texto livre digitado num TextArea: as quebras de linha importam. */}
                <p className="mt-3 text-sm whitespace-pre-line text-gray-100">{details?.description}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button className="w-full" type="button" variant="primary" onClick={() => setDetails(null)}>
                  Fechar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Card>
  );
}

function CompactSkeleton({ tabs = true }: { tabs?: boolean }) {
  return (
    <div className="mt-4 flex flex-col gap-4" aria-hidden="true">
      {tabs && (
        <div className="flex items-center gap-1.5 rounded-2xl p-1.5 ring-1 ring-light-gray">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-xl" />
          ))}
        </div>
      )}
      {/* O cabeçalho do dia e as linhas na forma que vai aparecer: o ladrilho,
          a hora e o texto em skeleton na largura do dado, não do rótulo. */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-2.5 w-40 max-w-full rounded-md" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-black/5 px-1 pb-3 last:border-b-0">
          <Skeleton className="h-7 w-14 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-2/3 rounded-md" />
            <Skeleton className="h-2.5 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
