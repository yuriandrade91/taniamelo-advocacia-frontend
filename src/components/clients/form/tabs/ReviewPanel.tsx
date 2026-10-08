"use client";

import { useState, type ReactNode } from "react";
import { ChipButton } from "@/components/ui/actions/ActionGroup";
import { PencilIcon } from "@/components/ui/icons/actions";
import type {
  ReviewGroup,
  ReviewItem,
  ReviewSection,
  ReviewSectionKey,
} from "../review";
import { splitBlankOptional, totalMissing } from "../review";
import { Segmented } from "@/components/ui/filters/FilterBar";

type Filter = "all" | "missing";

const cardId = (key: ReviewSectionKey) => `revisao-card-${key}`;

/**
 * "N faltando" ou "Nada pendente" — só texto, sem ícone. Não "Completo":
 * endereço em branco não tem pendência, mas também não está completo.
 */
function SectionState({ missing }: { missing: number }) {
  return missing > 0 ? (
    <span className="shrink-0 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger tabular-nums">
      {missing} faltando
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-light-green px-2.5 py-1 text-xs font-medium text-success">
      Nada pendente
    </span>
  );
}

/**
 * Um campo da revisão: bloco com rótulo em caixa alta e o valor embaixo —
 * o mesmo desenho dos blocos do painel da Carteira, sem sombra.
 *
 * Obrigatório vazio vira um bloco tracejado em vermelho, e o "Não preenchido"
 * é um botão: leva direto à aba onde o campo está.
 */
function Field({ entry, onFill }: { entry: ReviewItem; onFill: () => void }) {
  const span = entry.wide ? "sm:col-span-2 lg:col-span-4" : "";

  if (entry.state === "missing") {
    return (
      <div
        className={`rounded-xl border border-dashed border-danger/50 bg-danger/5 px-3.5 py-3 ${span}`}
      >
        <dt className="truncate text-[11px] font-medium tracking-wide text-danger/80 uppercase">
          {entry.label}
        </dt>
        <dd className="mt-1">
          <button
            type="button"
            onClick={onFill}
            aria-label={`Preencher ${entry.label}`}
            className="group flex items-center gap-1.5 text-sm font-semibold text-danger"
          >
            Não preenchido
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </dd>
      </div>
    );
  }

  const isEmpty = entry.state === "empty";
  return (
    <div
      className={`rounded-xl px-3.5 py-3 ring-1 ring-light-gray/70 ${
        isEmpty ? "bg-white" : "bg-page/80"
      } ${span}`}
    >
      <dt className="truncate text-[11px] tracking-wide text-gray-100/70 uppercase">
        {entry.label}
      </dt>
      <dd
        className={`mt-1 text-sm break-words ${
          isEmpty
            ? "text-gray-100/40"
            : `font-medium text-primary ${entry.wide ? "whitespace-pre-line" : ""}`
        }`}
      >
        {isEmpty ? "—" : entry.value}
      </dd>
    </div>
  );
}

/** Subtítulo de grupo — o mesmo rótulo com filete do `FormGroup`. */
function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h3 className="shrink-0 text-xs font-semibold tracking-wider text-gray-100 uppercase">
        {children}
      </h3>
      <span aria-hidden="true" className="h-px flex-1 bg-light-gray" />
    </div>
  );
}

/** No filtro "Só pendências", só os grupos com algo faltando. */
const visibleGroups = (groups: ReviewGroup[], filter: Filter) =>
  filter === "all"
    ? groups
    : groups
        .map((group) => ({
          ...group,
          items: group.items.filter((entry) => entry.state === "missing"),
        }))
        .filter((group) => group.items.length > 0);

/**
 * Um campo na visualização **Documento**: rótulo e valor, sem bloco e sem
 * linha. Opcional em branco não chega aqui — vira a linha "Em branco: …" do
 * grupo (`splitBlankOptional`).
 */
function DocumentField({
  entry,
  onFill,
}: {
  entry: ReviewItem;
  onFill: () => void;
}) {
  const span = entry.wide ? "sm:col-span-2 lg:col-span-4" : "";
  return (
    <div className={span}>
      <dt
        className={`text-xs ${
          entry.state === "missing" ? "text-danger" : "text-gray-100/80"
        }`}
      >
        {entry.label}
      </dt>
      {entry.state === "missing" ? (
        <dd className="mt-0.5">
          <button
            type="button"
            onClick={onFill}
            aria-label={`Preencher ${entry.label}`}
            className="group flex items-center gap-1.5 text-sm font-semibold text-danger"
          >
            Não preenchido
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </dd>
      ) : (
        <dd
          className={`mt-0.5 text-sm font-medium break-words text-primary ${
            entry.wide ? "whitespace-pre-line" : ""
          }`}
        >
          {entry.value}
        </dd>
      )}
    </div>
  );
}

type View = "document" | "blocks";

/** Cabeçalho de uma seção: título, estado e "Editar". Igual nas duas vistas. */
function SectionHeader({
  section,
  onEdit,
}: {
  section: ReviewSection;
  onEdit: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <h2
        id={`revisao-${section.key}`}
        className="min-w-0 flex-1 truncate text-lg font-semibold text-primary"
      >
        {section.title}
      </h2>
      <SectionState missing={section.missing} />
      <ChipButton
        shape="pill"
        icon={<PencilIcon className="h-3.5 w-3.5" />}
        onClick={onEdit}
        aria-label={`Editar ${section.title}`}
      >
        Editar
      </ChipButton>
    </div>
  );
}

function EmptyGroup({
  children,
  dashed,
}: {
  children: ReactNode;
  dashed: boolean;
}) {
  return dashed ? (
    <p className="rounded-xl border border-dashed border-light-gray px-4 py-3 text-sm text-gray-100/70">
      {children}
    </p>
  ) : (
    <p className="text-sm text-gray-100/70">{children}</p>
  );
}

/**
 * A aba "Revisão": todos os campos do formulário, só leitura.
 *
 * - **Resumo** no topo: quanto falta, o filtro "Tudo / Só pendências" e a
 *   escolha da visualização.
 * - Duas visualizações, para comparar (abre em **Blocos**):
 *   - **Documento**: a revisão inteira num cartão só; cada seção abre com
 *     uma faixa creme (a divisão, sem linhas), campos em 4 colunas e os
 *     opcionais em branco resumidos numa linha ("Em branco: RG · …");
 *   - **Blocos**: um cartão por seção, cada campo num bloco (opcional vazio
 *     aparece apagado, com "—").
 * - Obrigatório vazio é "Não preenchido →" em vermelho e leva à aba.
 *   "Editar" em cada seção leva à aba dela.
 *
 * Sem ícones nem sombras. O conteúdo vem pronto de `buildClientReview`; aqui
 * só se desenha.
 */
export function ReviewPanel({
  sections,
  onEdit,
}: {
  sections: readonly ReviewSection[];
  onEdit: (key: ReviewSectionKey) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("blocks");
  const missing = totalMissing(sections);
  const isReady = missing === 0;
  // Sem pendência, o filtro não tem o que mostrar: volta para "Tudo".
  const effectiveFilter: Filter = isReady ? "all" : filter;
  const shown =
    effectiveFilter === "all"
      ? sections
      : sections.filter((section) => section.missing > 0);

  const groupsOf = (section: ReviewSection) =>
    visibleGroups(section.groups, effectiveFilter);

  // O resumo: no Documento é o topo do próprio cartão; nos Blocos, um
  // cartão à parte, como as seções.
  const summary = (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div role="status">
          <p
            className={`text-lg font-semibold ${
              isReady ? "text-success" : "text-primary"
            }`}
          >
            {isReady
              ? "Tudo pronto para salvar"
              : `${missing} obrigatório${missing === 1 ? "" : "s"} sem resposta`}
          </p>
          <p className="text-sm text-gray-100">
            {isReady
              ? "Confira os dados abaixo e clique em “Salvar cliente”."
              : "Clique num campo pendente para ir direto a ele."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Mostrar na revisão"
            mode="radio"
            shape="pill"
            onPress={(id) => setFilter(id as typeof effectiveFilter)}
            segments={[
              { id: "all", label: "Tudo", active: effectiveFilter === "all" },
              {
                id: "missing",
                label: "Só pendências",
                active: effectiveFilter === "missing",
                isDisabled: isReady,
              },
            ]}
          />
          <Segmented
            label="Visualização da revisão"
            mode="radio"
            shape="pill"
            onPress={(id) => setView(id as View)}
            segments={[
              { id: "blocks", label: "Blocos", active: view === "blocks" },
              { id: "document", label: "Documento", active: view === "document" },
            ]}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ── seções ── */}
      {view === "document" ? (
        // Documento: um cartão só. Cada seção abre com uma faixa creme
        // (`bg-floral`, a mesma do cabeçalho dos cartões das abas) — é ela
        // que divide, sem linha nenhuma. Campos em 4 colunas; opcionais em
        // branco numa linha só, para a revisão não virar uma lista de "—".
        <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-light-gray">
          <div className="px-6 py-6 sm:px-8">{summary}</div>
          {shown.map((section) => (
            <section
              key={section.key}
              id={cardId(section.key)}
              aria-labelledby={`revisao-${section.key}`}
              className="scroll-mt-24"
            >
              <div className="flex flex-wrap items-center gap-3 bg-floral px-6 py-3.5 sm:px-8">
                <h2
                  id={`revisao-${section.key}`}
                  className="min-w-0 flex-1 truncate text-base font-semibold text-primary"
                >
                  {section.title}
                </h2>
                <SectionState missing={section.missing} />
                <ChipButton
                  shape="pill"
                  icon={<PencilIcon className="h-3.5 w-3.5" />}
                  onClick={() => onEdit(section.key)}
                  aria-label={`Editar ${section.title}`}
                >
                  Editar
                </ChipButton>
              </div>

              <div className="flex flex-col gap-6 px-6 py-6 sm:px-8">
                {groupsOf(section).map((group, index) => {
                  const { shown: fields, blank } = splitBlankOptional(
                    group.items,
                  );
                  return (
                    <div key={group.title ?? index}>
                      {group.title && (
                        <h3 className="mb-3 text-[11px] font-semibold tracking-wider text-gray-100/60 uppercase">
                          {group.title}
                        </h3>
                      )}
                      {group.items.length === 0 ? (
                        <EmptyGroup dashed={false}>
                          {group.emptyMessage}
                        </EmptyGroup>
                      ) : (
                        <>
                          {fields.length > 0 && (
                            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                              {fields.map((entry, i) => (
                                <DocumentField
                                  key={`${entry.label}-${i}`}
                                  entry={entry}
                                  onFill={() => onEdit(section.key)}
                                />
                              ))}
                            </dl>
                          )}
                          {blank.length > 0 && (
                            <p
                              className={`text-xs text-gray-100/60 ${
                                fields.length > 0 ? "mt-3" : ""
                              }`}
                            >
                              <span className="font-medium text-gray-100/80">
                                Em branco:
                              </span>{" "}
                              {blank.join(" · ")}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        // Blocos: o resumo e cada seção em cartões próprios.
        <>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-light-gray sm:p-8">
            {summary}
          </div>
          {shown.map((section) => (
            <section
              key={section.key}
              id={cardId(section.key)}
              aria-labelledby={`revisao-${section.key}`}
              className="scroll-mt-24 rounded-3xl bg-white p-6 ring-1 ring-light-gray sm:p-8"
            >
              <SectionHeader
                section={section}
                onEdit={() => onEdit(section.key)}
              />
              <div className="flex flex-col gap-6">
                {groupsOf(section).map((group, index) => (
                  <div key={group.title ?? index}>
                    {group.title && <GroupTitle>{group.title}</GroupTitle>}
                    {group.items.length === 0 ? (
                      <EmptyGroup dashed>{group.emptyMessage}</EmptyGroup>
                    ) : (
                      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {group.items.map((entry, i) => (
                          <Field
                            key={`${entry.label}-${i}`}
                            entry={entry}
                            onFill={() => onEdit(section.key)}
                          />
                        ))}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
