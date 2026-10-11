"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Tabs, Tooltip } from "@heroui/react";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import Drawer from "@/components/ui/drawer/Drawer";
import { RowSkeletons } from "@/components/ui/feedback/Loading";
import { CountBadge, TabBar, TabBarSkeleton, TabItem } from "@/components/ui/tabs/SegmentedTabs";
import { isScheduled } from "@/components/agenda/agendaGrouping";
import { AppointmentLine, appointmentActions } from "@/components/agenda/agendaRow";
import { useAppointmentActions } from "@/components/agenda/useAppointmentActions";
import { useAppointmentEditor } from "@/components/agenda/useAppointmentEditor";
import { MONTH_LABELS } from "@/constants/date/months";
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";
import { useNow } from "@/hooks/useNow";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { settledValue, useSettled } from "@/hooks/useSettled";
import { pageFromEnvelope } from "@/lib/pagination";
import { applyPendingOverlay } from "@/lib/pendingActions";
import { getAppointmentSummary, listAppointments } from "@/services/appointmentService";
import { CalendarIcon } from "@/components/ui/icons/glyphs";

/**
 * O cartão "Agenda" da Home — o que vem por aí, mês a mês.
 *
 * É o resumo; a página `/agenda` é a visão completa (todos os status, busca,
 * outros meses), e "Visualizar todos" leva para lá. As duas telas usam as
 * mesmas peças: a linha curta (`AppointmentLine`), as ações com
 * janela de desfazer (`useAppointmentActions`) e o formulário
 * (`useAppointmentEditor`). O cartão só escolhe o recorte e a moldura.
 *
 * - **Abas por mês** de `GET /appointments/summary?year=`: só os meses com
 *   compromisso, mais o atual e o aberto — um mês que acabou de zerar não
 *   some debaixo de quem está nele.
 * - **A lista do mês** são os próximos `COMPACT_LIMIT` agendados
 *   (`status=AGENDADO`): concluído e cancelado saem do cartão assim que mudam,
 *   já na janela de desfazer.
 * - **O formulário é um painel lateral** (`Drawer`), e não a modal da página:
 *   agendar daqui é um aparte, e a lista do mês continua visível atrás.
 */

/** Itens visíveis por mês — o resto fica na página `/agenda`. */
const COMPACT_LIMIT = 3;

/** A API trabalha com o rótulo (`@JsonValue`); o overlay escreve rótulo. */
const PENDING_STATUS_LABELS = {
  complete: AppointmentStatusLabelByKey.CONCLUIDO,
  cancel: AppointmentStatusLabelByKey.CANCELADO,
};

export default function AppointmentsCard({ className = "" }: { className?: string }) {
  const { canDestroy } = usePermissions();
  const now = useNow();
  const year = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  /** Muda depois de gravar: relê o resumo das abas. */
  const [summaryVersion, setSummaryVersion] = useState(0);
  const summaryResults = useSettled(
    String(year),
    () => Promise.allSettled([getAppointmentSummary(year)]),
    summaryVersion,
  );
  const summary = useMemo(
    () => (summaryResults ? (settledValue(summaryResults[0], { data: [] }).data ?? []) : null),
    [summaryResults],
  );

  const list = usePagedList({
    params: { year, month: selectedMonth, status: "AGENDADO" as const },
    fetchPage: (params) =>
      listAppointments({ ...params, pageNumber: 1, pageSize: COMPACT_LIMIT }).then(pageFromEnvelope),
  });

  const reload = () => {
    list.invalidate();
    setSummaryVersion((v) => v + 1);
  };
  const editor = useAppointmentEditor({ onSaved: reload, compact: true });
  const actions = useAppointmentActions({ onSettled: reload });

  /** Concluído, cancelado ou excluído na janela de desfazer já sai do cartão — e da conta. */
  const visible = applyPendingOverlay(list.items, actions.pending, PENDING_STATUS_LABELS).filter(isScheduled);
  const monthTotal = Math.max(0, list.total - (list.items.length - visible.length));

  const months = useMemo(() => {
    const numbers = new Set((summary ?? []).filter((s) => s.count > 0).map((s) => s.month));
    numbers.add(currentMonth);
    numbers.add(selectedMonth);
    return [...numbers]
      .sort((a, b) => a - b)
      .map((month) => ({
        month,
        // O resumo conta concluídos também; o mês aberto mostra o total exato
        // de agendados, que já veio com a lista.
        count:
          month === selectedMonth && !list.isLoading
            ? monthTotal
            : (summary?.find((s) => s.month === month)?.count ?? 0),
      }));
  }, [summary, currentMonth, selectedMonth, list.isLoading, monthTotal]);

  const hasAnyAppointment = (summary ?? []).some((s) => s.count > 0);
  const rowActions = appointmentActions({
    onViewDetails: actions.requestDetails,
    onEdit: editor.openEdit,
    onComplete: actions.requestComplete,
    onCancel: actions.requestCancel,
    onDelete: canDestroy ? actions.requestDelete : undefined,
    onCreate: editor.openCreate,
  });

  return (
    <Card className={`flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4">
        <SectionTitle>Agenda</SectionTitle>
        {/* O conteúdo vem antes do gatilho, e o gatilho é o `Button` do HeroUI (ver `IconButton`). */}
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
        <div className="mt-4 flex flex-col gap-3">
          <TabBarSkeleton />
          <RowSkeletons count={COMPACT_LIMIT} label="Carregando a agenda" />
        </div>
      ) : !hasAnyAppointment && monthTotal === 0 && !list.isLoading ? (
        <p className="mt-4 py-6 text-center text-sm text-gray-100/60">
          Ainda não há nenhum compromisso agendado.
        </p>
      ) : (
        <Tabs
          selectedKey={String(selectedMonth)}
          onSelectionChange={(key) => setSelectedMonth(Number(key))}
          className="mt-4"
        >
          <TabBar label="Meses da agenda">
            {months.map(({ month, count }) => (
              <TabItem key={month} id={String(month)} className="px-3! py-2! text-sm">
                {MONTH_LABELS[month - 1]}
                {/* O número é decorativo; a contagem vai por extenso para o leitor de tela. */}
                <CountBadge tone="accent" count={count} />
                <span className="sr-only"> ({count === 1 ? "1 compromisso" : `${count} compromissos`})</span>
              </TabItem>
            ))}
          </TabBar>

          <Tabs.Panel id={String(selectedMonth)} className="p-0">
            {list.isLoading ? (
              <RowSkeletons count={COMPACT_LIMIT} label="Carregando os compromissos do mês" className="mt-2 flex flex-col gap-3" />
            ) : visible.length === 0 ? (
              <p className="py-6 text-sm text-gray-100/60">
                Não há agendamentos para {MONTH_LABELS[selectedMonth - 1]} ainda.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visible.map((appointment) => (
                  <AppointmentLine key={appointment.id} appointment={appointment} actions={rowActions} now={now} />
                ))}
              </ul>
            )}

            {monthTotal > COMPACT_LIMIT && (
              <div className="flex justify-center pt-2">
                <Link
                  href="/agenda"
                  className="text-sm text-secondary underline-offset-4 hover:text-secondary/70 hover:underline"
                >
                  Visualizar todos
                </Link>
              </div>
            )}
          </Tabs.Panel>
        </Tabs>
      )}

      <Drawer
        isOpen={editor.isOpen}
        onOpenChange={(open) => !open && editor.requestClose()}
        title={editor.title}
        dialogClassName="w-full sm:w-[520px]"
        actions="pill"
        confirmLabel={editor.confirmLabel}
        onConfirm={editor.submit}
        isConfirmDisabled={!editor.isValid}
        isSubmitting={editor.isSubmitting}
      >
        {editor.fields}
      </Drawer>
      {editor.dialogs}
      {actions.dialogs}
    </Card>
  );
}
