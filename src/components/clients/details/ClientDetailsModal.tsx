"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { LoadingCircle, RowSkeletons } from "@/components/ui/feedback/Loading";
import { DownloadIcon, PencilIcon, PrinterIcon, TrashIcon } from "@/components/ui/icons/actions";
import { CheckIcon, ClockIcon, WalletIcon } from "@/components/ui/icons/glyphs";
import { GavelIcon } from "@/components/agenda/agendaIcons";
import ModalShell from "@/components/ui/modals/ModalShell";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog";
import { formatValue } from "@/components/ui/form/schema";
import { usePermissions } from "@/hooks/usePermissions";
import { useOfficeAuthors } from "@/hooks/useOfficeAuthors";
import { GenderLabelByKey, type GenderKey } from "@/enums/gender/Gender";
import { deleteClient, patchClient } from "@/services/clientService";
import { deleteFile } from "@/services/clientFileService";
import { plural } from "@/lib/format";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import { InssPasswordField } from "../inss/InssPasswordField";
import type { ClientFiles } from "../form/loadClient";
import { useRecordDelivery } from "./useRecordDelivery";
import { ClientInssPanel } from "../inss/ClientInssPanel";
import {
  ClientDisabilityPanel,
  type ClientDisabilityPanelHandle,
} from "../disability/ClientDisabilityPanel";
import { DISABILITY_BENEFIT } from "../form/genderPrompt";
import {
  AddressIcon,
  DisabilityIcon,
  FilesIcon,
  InterviewIcon,
  PersonIcon,
  ServiceIcon,
  WorkIcon,
} from "../form/tabs/sectionIcons";
import { AddressesSection } from "../form/sections/AddressesSection";
import { InterviewSection } from "../form/sections/InterviewSection";
import { PersonalDataSection } from "../form/sections/PersonalDataSection";
import { ProfessionalDataSection } from "../form/sections/ProfessionalDataSection";
import { ServiceSection } from "../form/sections/ServiceSection";
import { SituationHistorySection } from "../form/sections/SituationHistorySection";
import { DocumentCatalogPanel } from "../form/sections/files/DocumentCatalogPanel";
import { StageChanger } from "../stage/StageChanger";
import { StageMeter } from "../stage/StageMeter";
import { situationChangedMessage } from "../stage/stages";
import { invalidateSituationTrail } from "../stage/stageTrails";
import { FilesUpload } from "../form/sections/files/upload/FilesUpload";
import { uploadStagedFiles } from "../form/sections/files/uploadStaged";
import {
  isDocumentComplete,
  isSimulationComplete,
  type StagedDocument,
  type StagedSimulation,
} from "../form/sections/files/types";
import {
  addressSchema,
  interviewSchema,
  personalSchema,
  professionalSchema,
  serviceSchema,
} from "../form/schemas";
import {
  SheetSidebar,
  SheetSectionCard,
  SheetSectionTabs,
  SidebarTipButton,
  useSectionAnchors,
  type SheetNavItem,
} from "./SheetLayout";
import { sectionFill, sheetProgress } from "./clientSheet";
import { useClientSheet } from "./useClientSheet";
import { optionalText } from "@/lib/formValues";
import { messageOf } from "@/lib/errorMessage";

/** Os pagamentos só carregam (código e dados) quando a seção é aberta. */
const ClientFinancePanel = dynamic(
  () => import("../finance/ClientFinancePanel").then((m) => m.ClientFinancePanel),
  { ssr: false, loading: () => <RowSkeletons count={3} /> },
);
/** A confirmação de exclusão só vem quando alguém pede para excluir. */
const DeleteClientModal = dynamic(() => import("../DeleteClientModal"), { ssr: false });

/**
 * A ficha do cliente: leitura e edição no mesmo desenho, no mesmo lugar.
 *
 * O painel da esquerda (`SheetSidebar`) guarda a identidade, o preenchimento
 * e as ações; a coluna da direita traz as seções do **cadastro** — as mesmas
 * peças, os mesmos schemas, as mesmas máscaras e validações —, uma embaixo da
 * outra, com o painel ancorando a leitura.
 *
 * **Lendo, nada se mexe**: campos travados, deficiência e arquivos sem
 * adicionar nem excluir — só abrir e baixar. "Editar cadastro" (ou o editar da
 * lista, que já abre assim) solta os campos onde eles estão; "Salvar" grava
 * tudo de uma vez, arquivos novos inclusive, e "Cancelar" volta ao gravado.
 *
 * Estado, validação e gravação ficam em `useClientSheet`.
 */

/** Altura útil: o `Modal.Dialog` corta o que passa, então quem rola é a coluna. */
const SHEET_HEIGHT = "max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-9.5rem)]";

type SheetSection = {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** À direita do nome: "6/7", "3 registros". */
  badge?: string;
  /** Tudo preenchido — o ✓ verde no painel, no lugar da contagem. */
  isComplete?: boolean;
  /**
   * Não se aplica ao caso. A seção sai da navegação e da pilha, mas continua
   * **montada** fora de vista: é o painel de deficiência que conta os períodos
   * gravados.
   */
  isHidden?: boolean;
  content: ReactNode;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId: string;
  /** Avisado depois de salvar ou excluir: a lista pode ter mudado. */
  onConfirm?: () => void;
  /** Abre já editando (o "editar" da lista). A página remonta a ficha por alvo. */
  editOnOpen?: boolean;
};

/**
 * Envia os arquivos escolhidos na edição e limpa o que subiu. Diz se não havia
 * nada, se foi tudo ou só uma parte (a outra lista continua para reenviar).
 */
async function sendStagedFiles(
  clientId: string,
  documents: StagedDocument[],
  simulations: StagedSimulation[],
  clear: { clearDocuments: () => void; clearSimulations: () => void },
): Promise<"none" | "all" | "partial"> {
  if (documents.length === 0 && simulations.length === 0) return "none";
  const sent = await uploadStagedFiles(clientId, documents, simulations, { silent: true });
  if (sent.documents) clear.clearDocuments();
  if (sent.simulations) clear.clearSimulations();
  return sent.documents && sent.simulations ? "all" : "partial";
}

/** "3 arquivos" no selo da seção; sem nenhum, não há selo. */
const countBadge = (count: number, one: string, many: string) =>
  count > 0 ? plural(count, one, many) : undefined;

/** Cada arquivo escolhido tem os dados que o envio exige. */
const stagedComplete = (documents: readonly StagedDocument[], simulations: readonly StagedSimulation[]) =>
  documents.every((item) => isDocumentComplete(item)) && simulations.every((item) => isSimulationComplete(item));

/** O selo da seção no menu da ficha: "7/9", e se já está completa. */
function fill(
  schema: Parameters<typeof sectionFill>[0],
  values: Parameters<typeof sectionFill>[1],
  skip?: readonly string[],
) {
  const { filled, total } = sectionFill(schema, values, skip);
  return { badge: `${filled}/${total}`, isComplete: filled === total };
}

export default function ClientDetailsModal({
  isOpen,
  onClose,
  clientName,
  clientId,
  onConfirm,
  editOnOpen = false,
}: Readonly<Props>) {
  const { canDestroy, canSeeFinance } = usePermissions();
  const authors = useOfficeAuthors();
  const sheet = useClientSheet(clientId, isOpen);
  const { service, personal, professional, addresses, interview } = sheet.forms;
  const record = sheet.record;

  const [isEditing, setIsEditing] = useState(editOnOpen);
  const [showDelete, setShowDelete] = useState(false);
  const [actionError, setActionError] = useState("");
  /** Arquivos escolhidos na edição — sobem no "Salvar". */
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [stagedSimulations, setStagedSimulations] = useState<StagedSimulation[]>([]);
  const [filesRevealed, setFilesRevealed] = useState(false);
  /** Arquivo gravado à espera de confirmação para sair do servidor. */
  const [fileRemoval, setFileRemoval] = useState<string | null>(null);
  const [addressTab, setAddressTab] = useState("address-0");
  const addressSlots = addresses.map((form, index) => ({
    key: `address-${index}`,
    label: index === 0 ? "Endereço atual" : `Endereço ${index + 1}`,
    form,
  }));
  const disabilityRef = useRef<ClientDisabilityPanelHandle>(null);
  const [disabilityCount, setDisabilityCount] = useState(0);
  const sections = { service: service.values, personal: personal.values, professional: professional.values };
  const progress = sheetProgress(sections);
  const benefitLabel = formatValue(serviceSchema.benefit, service.values.benefit);
  const showDisability =
    service.values.benefit === DISABILITY_BENEFIT || personal.values.hasDisability === true || disabilityCount > 0;
  /**
   * A seção entra logo depois de quem a trouxe, como no cadastro: pelo
   * benefício, depois de Atendimento; pela chave "pessoa com deficiência" (ou
   * por já ter períodos gravados), depois de Dados pessoais.
   */
  const disabilityPlacement = service.values.benefit === DISABILITY_BENEFIT ? "afterService" : "afterPersonal";
  const error = sheet.error || actionError;
  const currentName = optionalText(record?.client?.fullName) ?? clientName;
  const recordFile = useRecordDelivery(clientId, personal.values.fullName || clientName, setActionError);
  const busy = sheet.isSaving;

  // A ancoragem vem antes das seções porque é ela quem diz quais já
  // apareceram — e Pagamentos só carrega depois de aparecer. A chave só muda
  // quando a lista de seções muda: a carga termina, a deficiência passa a
  // valer ou muda de lugar.
  const { scrollerRef, active, seen, goTo } = useSectionAnchors(
    "atendimento",
    `${sheet.isLoading}|${showDisability}|${disabilityPlacement}`,
  );
  const financeSeen = seen.has("pagamentos");

  /**
   * Arquivos também só carregam quando a seção aparece — rolando até ela ou
   * pelo índice. Quem abre a ficha para ver um telefone não paga as duas
   * listas (paginadas até o fim) que talvez nem veja.
   */
  const filesSeen = seen.has("arquivos");
  const { loadFiles } = sheet;
  const filesPending = Boolean(sheet.record && !sheet.record.files);
  useEffect(() => {
    if (filesSeen && filesPending) void loadFiles();
  }, [filesSeen, filesPending, loadFiles]);

  /** Volta ao que está gravado e à leitura: campos, arquivos escolhidos, erros. */
  const leaveEdit = () => {
    sheet.cancel();
    setStagedDocuments([]);
    setStagedSimulations([]);
    setFilesRevealed(false);
    setActionError("");
    setIsEditing(false);
  };

  const close = () => {
    leaveEdit();
    onClose();
  };

  const save = async () => {
    setFilesRevealed(true);
    const saved = await sheet.save({
      // Todos validam (e revelam os erros) antes de decidir: `&&` pararia no primeiro.
      validateExtra: () =>
        [disabilityRef.current?.validate() ?? true, stagedComplete(stagedDocuments, stagedSimulations)].every(Boolean),
      afterSave: async () => {
        const wroteRecords = (await disabilityRef.current?.save()) ?? false;
        const files = await sendStagedFiles(clientId, stagedDocuments, stagedSimulations, {
          clearDocuments: () => setStagedDocuments([]),
          clearSimulations: () => setStagedSimulations([]),
        });
        if (files === "none") return wroteRecords;
        await sheet.loadFiles();
        if (files === "partial") throw new Error("Nem todos os arquivos foram enviados.");
        return true;
      },
    });
    if (!saved) return;
    setFilesRevealed(false);
    setIsEditing(false);
    onConfirm?.();
  };

  const remove = async () => {
    try {
      await deleteClient(clientId);
      setShowDelete(false);
      onClose();
      onConfirm?.();
    } catch (reason) {
      setActionError(messageOf(reason, fallbackMessages.CLIENTS.DELETE_FAILED));
    }
  };

  const confirmFileRemoval = async () => {
    const fileId = fileRemoval;
    setFileRemoval(null);
    if (!fileId) return;
    try {
      await deleteFile(clientId, fileId);
      await sheet.loadFiles();
    } catch (reason) {
      setActionError(messageOf(reason, fallbackMessages.CLIENTS.UPDATE_FAILED));
    }
  };

  const files = record?.files ?? null;
  const interviewCount = record?.interviewCount ?? 0;

  const disabilitySection: SheetSection = {
    id: "deficiencia",
    title: "Deficiência",
    description: "Grau e tempo em cada grau — mudam o tempo exigido na aposentadoria da pessoa com deficiência.",
    icon: <DisabilityIcon />,
    isHidden: !showDisability,
    badge: countBadge(disabilityCount, "período", "períodos"),
    content: (
      <ClientDisabilityPanel
        ref={isEditing ? disabilityRef : undefined}
        clientId={clientId}
        gender={GenderLabelByKey[personal.values.gender as GenderKey] ?? personal.values.gender}
        isEditing={isEditing}
        canDeleteSaved={canDestroy}
        onSavedCountChange={setDisabilityCount}
      />
    ),
  };

  const sheetSections: SheetSection[] = [
    {
      id: "atendimento",
      title: "Atendimento",
      description: "Benefício pretendido e situação do caso.",
      icon: <ServiceIcon />,
      ...fill(serviceSchema, service.values),
      content: <ServiceSection form={service} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    ...(disabilityPlacement === "afterService" ? [disabilitySection] : []),
    {
      id: "dados-pessoais",
      title: "Dados pessoais",
      description: "Quem é o cliente e como falar com ele.",
      icon: <PersonIcon />,
      ...fill(personalSchema, personal.values),
      content: <PersonalDataSection form={personal} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    ...(disabilityPlacement === "afterPersonal" ? [disabilitySection] : []),
    {
      id: "dados-profissionais",
      title: "Dados profissionais",
      description: "Vida contributiva e o acesso ao Meu INSS.",
      icon: <WorkIcon />,
      // A senha fica de fora da conta: ela nunca volta do servidor (rota
      // auditada), então contá-la deixaria a seção eternamente incompleta.
      ...fill(professionalSchema, professional.values, ["inssPassword"]),
      content: (
        <ProfessionalDataSection
          form={professional}
          isReadOnly={!isEditing}
          isLoading={sheet.isLoading}
          inssPassword={
            <InssPasswordField
              clientId={clientId}
              isEditing={isEditing}
              newPassword={professional.values.inssPassword}
              onNewPasswordChange={(value) => professional.setField("inssPassword", value)}
            />
          }
        />
      ),
    },
    {
      id: "endereco",
      title: "Endereço",
      description: "Os endereços do cliente, o principal primeiro.",
      icon: <AddressIcon />,
      ...fill(addressSchema, addresses[0].values, ["cepLookup"]),
      content: (
        // As abas do cadastro, sem excluir: cada uma lê e edita o seu endereço,
        // e o "Salvar" grava os que mudaram e cria o que foi adicionado.
        <AddressesSection
          slots={addressSlots}
          // A aba de um cliente anterior pode não existir neste: volta à primeira.
          selectedKey={addressSlots.some((slot) => slot.key === addressTab) ? addressTab : "address-0"}
          onSelectionChange={setAddressTab}
          canAddMore={isEditing && sheet.canAddAddress}
          onAddAddress={() => {
            setAddressTab(`address-${addressSlots.length}`);
            sheet.addAddress();
          }}
          onRequestPrimary={(slot) => sheet.setPrimaryAddress(Number(slot.key.replace("address-", "")))}
          isReadOnly={!isEditing}
          isLoading={sheet.isLoading}
        />
      ),
    },
    {
      id: "entrevista",
      title: "Entrevista",
      description: "O relato do atendimento: histórico, pendências e documentos a trazer.",
      icon: <InterviewIcon />,
      ...(interviewCount > 1
        ? { badge: `${interviewCount} registros` }
        : fill(interviewSchema, interview.values)),
      content: <InterviewSection form={interview} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    {
      id: "arquivos",
      title: "Arquivos",
      description: "Documentos e simulações do caso.",
      icon: <FilesIcon />,
      badge: filesBadge(files),
      content: (
        <SheetFiles
          clientId={clientId}
          files={files}
          documents={stagedDocuments}
          simulations={stagedSimulations}
          onDocumentsChange={setStagedDocuments}
          onSimulationsChange={setStagedSimulations}
          showErrors={filesRevealed}
          isEditing={isEditing}
          canDelete={canDestroy}
          onDelete={setFileRemoval}
        />
      ),
    },
    // Dinheiro é de quem vê o financeiro (D3): para os demais a seção nem existe.
    ...(canSeeFinance ? [financeSection(clientId, financeSeen)] : []),
    {
      id: "andamento",
      title: "Andamento do benefício",
      description: "Da mudança de situação mais recente para a mais antiga.",
      icon: <ClockIcon className="h-5 w-5" />,
      badge: countBadge(record?.history.length ?? 0, "mudança", "mudanças"),
      content: sheet.isLoading ? (
        <RowSkeletons count={4} />
      ) : (
        <BenefitProgress
          clientId={clientId}
          clientName={currentName}
          record={record}
          authors={authors}
          onSituationChange={sheet.setSituation}
          onChanged={onConfirm}
        />
      ),
    },
    {
      id: "andamento-inss",
      title: "Andamento no INSS",
      description: "A etapa do requerimento e cada mudança, com a data, quem mudou e a justificativa.",
      icon: <GavelIcon className="h-5 w-5" />,
      badge: record?.client?.requestStage ?? undefined,
      content: sheet.isLoading ? (
        <RowSkeletons count={3} />
      ) : (
        <ClientInssPanel
          clientId={clientId}
          clientName={currentName}
          requestStage={record?.client?.requestStage}
          authors={authors}
          onChanged={(requestStage) => {
            sheet.setRequestStage(requestStage);
            onConfirm?.();
          }}
        />
      ),
    },
  ];

  const visible = sheetSections.filter((section) => !section.isHidden);
  const hidden = sheetSections.filter((section) => section.isHidden);
  const items: SheetNavItem[] = visible.map((section) => ({
    id: section.id,
    label: section.title,
    icon: section.icon,
    badge: section.badge,
    isComplete: section.isComplete,
  }));

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={close}
      isDismissable={!busy}
      backdrop="blur"
      size="cover"
      className="min-h-[80vh] max-w-[1440px] bg-page"
    >
      {/* `data-readonly`: em leitura, o campo travado continua legível
          (`ui/form/formFields.css`). */}
      <div data-readonly={isEditing ? undefined : ""} className={`flex ${SHEET_HEIGHT} flex-col gap-4 py-4 md:flex-row`}>
        <SheetSidebar
          name={personal.values.fullName || clientName}
          benefit={benefitLabel}
          progress={progress}
          isLoading={sheet.isLoading}
          items={items}
          activeId={active}
          onSelect={goTo}
          error={
            error ? (
              <p role="alert" className="rounded-xl bg-danger/25 px-4 py-3 text-sm text-white">
                {error}
              </p>
            ) : null
          }
          actions={
            <SheetActions
              isEditing={isEditing}
              isSaving={busy}
              isLoading={sheet.isLoading}
              isDownloading={recordFile.isDownloading}
              isPrinting={recordFile.isPrinting}
              canDelete={canDestroy}
              onDownload={() => void recordFile.download()}
              onPrint={() => void recordFile.print()}
              onEdit={() => setIsEditing(true)}
              onCancel={leaveEdit}
              onSave={() => void save()}
              onDelete={() => setShowDelete(true)}
            />
          }
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <SheetSectionTabs items={items} activeId={active} onSelect={goTo} />

          {/*
            Quem rola não é quem empilha. Com o `overflow-y-auto` no próprio
            `flex-col`, cada cartão vira item flex de um contêiner de altura
            fixa — e item flex encolhe: os cartões achatavam até sobrar só a
            faixa do cabeçalho.
          */}
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 pb-6">
              {visible.map((section) => (
                <SheetSectionCard
                  key={section.id}
                  id={section.id}
                  label={section.title}
                  blurb={section.description}
                  icon={section.icon}
                  badge={section.badge}
                >
                  {section.content}
                </SheetSectionCard>
              ))}
            </div>
          </div>
        </div>

        {/* Montadas e fora de vista — ver `isHidden`. */}
        {hidden.map((section) => (
          <div key={section.id} hidden>
            {section.content}
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={fileRemoval !== null}
        onClose={() => setFileRemoval(null)}
        onConfirm={() => void confirmFileRemoval()}
        tone="danger"
        heading="Excluir este arquivo?"
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description="O arquivo sai da ficha do cliente, e não há como desfazer."
      />
      <DeleteClientModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        clientName={clientName}
        onConfirm={() => void remove()}
      />
    </ModalShell>
  );
}

/** Sem as listas ainda, nem selo: "Sem arquivos" seria afirmar o que não se sabe. */
const filesBadge = (files: ClientFiles | null) =>
  files
    ? (countBadge(files.documents.length + files.simulations.length, "arquivo", "arquivos") ?? "Sem arquivos")
    : undefined;

const financeSection = (clientId: string, hasAppeared: boolean): SheetSection => ({
  id: "pagamentos",
  title: "Pagamentos",
  description: "Benefício que o INSS paga ao cliente e honorários do escritório.",
  icon: <WalletIcon className="h-5 w-5" />,
  badge: "Só leitura",
  content: hasAppeared ? <ClientFinancePanel clientId={clientId} /> : <RowSkeletons count={3} />,
});

/**
 * O componente do cadastro: lendo, só abrir e baixar o gravado; editando,
 * excluí-lo e escolher novos, que sobem no "Salvar".
 */
function SheetFiles({
  clientId,
  files,
  documents,
  simulations,
  onDocumentsChange,
  onSimulationsChange,
  showErrors,
  isEditing,
  canDelete,
  onDelete,
}: Readonly<{
  clientId: string;
  files: ClientFiles | null;
  documents: StagedDocument[];
  simulations: StagedSimulation[];
  onDocumentsChange: (documents: StagedDocument[]) => void;
  onSimulationsChange: (simulations: StagedSimulation[]) => void;
  showErrors: boolean;
  isEditing: boolean;
  canDelete: boolean;
  onDelete: (fileId: string) => void;
}>) {
  if (!files) return <RowSkeletons count={2} />;
  return (
    <FilesUpload
      documents={documents}
      simulations={simulations}
      onDocumentsChange={onDocumentsChange}
      onSimulationsChange={onSimulationsChange}
      showErrors={showErrors}
      isReadOnly={!isEditing}
      saved={{
        clientId,
        documents: files.documents,
        simulations: files.simulations,
        // Excluir é de quem exclui (o backend recusa os demais com 403).
        onDelete: isEditing && canDelete ? onDelete : undefined,
      }}
      documentsAside={<DocumentCatalogPanel />}
    />
  );
}

/** A etapa do benefício, que muda daqui mesmo, e a história das mudanças. */
function BenefitProgress({
  clientId,
  clientName,
  record,
  authors,
  onSituationChange,
  onChanged,
}: Readonly<{
  clientId: string;
  clientName: string;
  record: ReturnType<typeof useClientSheet>["record"];
  authors: ReturnType<typeof useOfficeAuthors>;
  onSituationChange: ReturnType<typeof useClientSheet>["setSituation"];
  onChanged?: () => void;
}>) {
  return (
    <div className="flex flex-col gap-5">
      {/* Mudar a etapa daqui, como no INSS: o mesmo cartão da lista, gravando na hora. */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-page p-4">
        <div className="min-w-0 flex-1">
          <StageMeter situation={record?.client?.situation} />
        </div>
        <StageChanger
          clientId={clientId}
          triggerClassName="shrink-0 cursor-pointer rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-primary ring-1 ring-black/10 transition outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-secondary/60"
          clientName={clientName}
          situation={record?.client?.situation}
          onConfirm={async (stage) => {
            // "OUTRA" é o selo de uma situação desconhecida, que não se escolhe.
            if (stage.key === "OUTRA") return;
            await patchClient(clientId, { situation: stage.key }, { successMessage: situationChangedMessage(clientName, stage.key) });
            invalidateSituationTrail(clientId);
            await onSituationChange(stage.key);
            onChanged?.();
          }}
        >
          Mudar etapa
        </StageChanger>
      </div>
      <SituationHistorySection
        items={record?.history ?? []}
        hasError={record?.historyFailed ?? false}
        authors={authors}
      />
    </div>
  );
}

/**
 * As ações no pé do painel: "Editar cadastro" na leitura; "Cancelar" e
 * "Salvar" na edição. Excluir é só ícone, com dica — o nome dele não disputa
 * espaço com a ação principal, que é a larga. Fechar fica no canto da ficha.
 */
function SheetActions({
  isEditing,
  isSaving,
  isLoading,
  isDownloading,
  isPrinting,
  canDelete,
  onDownload,
  onPrint,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: Readonly<{
  isEditing: boolean;
  isSaving: boolean;
  /** Sem os dados ainda, não há o que editar nem salvar. */
  isLoading: boolean;
  isDownloading: boolean;
  isPrinting: boolean;
  canDelete: boolean;
  onDownload: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}>) {
  // Excluir é de advogado/admin: o backend recusa os demais com 403.
  const remove = canDelete && (
    <SidebarTipButton label="Excluir cliente" onPress={onDelete} isDisabled={isSaving}>
      <TrashIcon className="h-4 w-4" />
    </SidebarTipButton>
  );

  if (isEditing) {
    return (
      <ActionGroup shape="pill" surface="dark">
        <ActionButton tone="onDark" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </ActionButton>
        <ActionButton
          tone="onDark"
          grow
          className="font-semibold"
          onClick={onSave}
          disabled={isSaving || isLoading}
          aria-busy={isSaving || undefined}
          icon={isSaving ? <LoadingCircle size={16} /> : <CheckIcon className="h-4 w-4" />}
        >
          {isSaving ? "Salvando…" : "Salvar"}
        </ActionButton>
        {remove}
      </ActionGroup>
    );
  }

  // Na leitura, a ficha em papel (imprimir, baixar) fica numa faixa acima das
  // ações do cadastro (editar, excluir): são dois assuntos, e juntos os quatro
  // botões espremiam a ação principal.
  return (
    <>
      <ActionGroup shape="pill" surface="dark">
        <ActionButton
          tone="onDark"
          grow
          aria-label="Imprimir ficha"
          onClick={onPrint}
          disabled={isLoading || isPrinting}
          icon={isPrinting ? <LoadingCircle size={16} /> : <PrinterIcon className="h-4 w-4" />}
        >
          Imprimir
        </ActionButton>
        <ActionButton
          tone="onDark"
          grow
          aria-label="Baixar ficha em PDF"
          onClick={onDownload}
          disabled={isLoading || isDownloading}
          icon={isDownloading ? <LoadingCircle size={16} /> : <DownloadIcon className="h-4 w-4" />}
        >
          Baixar PDF
        </ActionButton>
      </ActionGroup>
      <ActionGroup shape="pill" surface="dark">
        <ActionButton
          tone="onDark"
          grow
          className="font-semibold"
          onClick={onEdit}
          disabled={isLoading || isDownloading || isPrinting}
          icon={<PencilIcon className="h-4 w-4" />}
        >
          Editar cadastro
        </ActionButton>
        {remove}
      </ActionGroup>
    </>
  );
}
