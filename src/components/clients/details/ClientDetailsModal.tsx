"use client";

import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { LoadingCircle, RowSkeletons } from "@/components/ui/feedback/Loading";
import { PencilIcon, TrashIcon } from "@/components/ui/icons/actions";
import { CheckIcon, ClockIcon, WalletIcon } from "@/components/ui/icons/glyphs";
import ModalShell from "@/components/ui/modals/ModalShell";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import { formatValue } from "@/components/ui/form/schema";
import { usePermissions } from "@/hooks/usePermissions";
import { useOfficeAuthors } from "@/hooks/useOfficeAuthors";
import { GenderLabelByKey, type GenderKey } from "@/enums/gender/Gender";
import { deleteClient } from "@/services/clientService";
import { deleteFile } from "@/services/clientFileService";
import { plural } from "@/lib/format";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import { InssPasswordField } from "../inss/InssPasswordField";
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
import { AddressSection } from "../form/sections/AddressSection";
import { InterviewSection } from "../form/sections/InterviewSection";
import { PersonalDataSection } from "../form/sections/PersonalDataSection";
import { ProfessionalDataSection } from "../form/sections/ProfessionalDataSection";
import { ServiceSection } from "../form/sections/ServiceSection";
import { SituationHistorySection } from "../form/sections/SituationHistorySection";
import { FilesSection } from "../form/sections/files/FilesSection";
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
import DeleteClientModal from "../DeleteClientModal";
import {
  CompiledHero,
  CompiledSection,
  CompiledTabs,
  HeroTipButton,
  useSectionAnchors,
  type HeroNavItem,
} from "./CompiledHero";
import { sectionFill, sheetProgress } from "./clientSheet";
import { useClientSheet } from "./useClientSheet";

/** Os pagamentos só carregam (código e dados) quando a seção é aberta. */
const ClientFinancePanel = dynamic(
  () => import("../finance/ClientFinancePanel").then((m) => m.ClientFinancePanel),
  { ssr: false, loading: () => <RowSkeletons count={3} /> },
);

/**
 * A ficha do cliente: leitura e edição no mesmo desenho, no mesmo lugar.
 *
 * O painel da esquerda (`CompiledHero`) guarda a identidade, o preenchimento
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
  clientId?: number | string;
  /** Avisado depois de salvar ou excluir: a lista pode ter mudado. */
  onConfirm?: () => void;
  /** Abre já editando (o "editar" da lista). A página remonta a ficha por alvo. */
  editOnOpen?: boolean;
};

export default function ClientDetailsModal({
  isOpen,
  onClose,
  clientName,
  clientId: rawId,
  onConfirm,
  editOnOpen = false,
}: Props) {
  const clientId = rawId === undefined ? undefined : String(rawId);
  const { canDestroy, canSeeFinance } = usePermissions();
  const authors = useOfficeAuthors();
  const sheet = useClientSheet(clientId, isOpen);
  const { service, personal, professional, address, interview } = sheet.forms;
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
  const disabilityRef = useRef<ClientDisabilityPanelHandle>(null);
  const [disabilityCount, setDisabilityCount] = useState(0);
  /**
   * Pagamentos já foi visitada. A visita é descoberta durante a renderização
   * (a rolagem acendeu a seção no painel), então o estado é ajustado ali
   * mesmo, uma vez — e não volta atrás.
   */
  const [financeSeen, setFinanceSeen] = useState(false);

  const sections = { service: service.values, personal: personal.values, professional: professional.values };
  const progress = sheetProgress(sections);
  const benefitLabel = formatValue(serviceSchema.benefit, service.values.benefit);
  const showDisability = service.values.benefit === DISABILITY_BENEFIT || disabilityCount > 0;
  const error = sheet.error || actionError;
  const busy = sheet.isSaving;

  // A ancoragem vem antes das seções porque é ela quem diz qual está em foco —
  // e é esse foco que acende os Pagamentos pela primeira vez. A chave só muda
  // quando a lista de seções muda: a carga termina ou a deficiência passa a
  // valer.
  const { scrollerRef, active, goTo } = useSectionAnchors(
    "atendimento",
    `${sheet.isLoading}|${showDisability}`,
  );
  if (active === "pagamentos" && !financeSeen) setFinanceSeen(true);

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

  const filesComplete = () =>
    stagedDocuments.every(isDocumentComplete) && stagedSimulations.every(isSimulationComplete);

  const save = async () => {
    setFilesRevealed(true);
    const saved = await sheet.save({
      validateExtra: () => (disabilityRef.current?.validate() ?? true) && filesComplete(),
      afterSave: async () => {
        await disabilityRef.current?.save();
        if (!clientId || (stagedDocuments.length === 0 && stagedSimulations.length === 0)) return;
        const sent = await uploadStagedFiles(clientId, stagedDocuments, stagedSimulations);
        if (sent.documents) setStagedDocuments([]);
        if (sent.simulations) setStagedSimulations([]);
        await sheet.refreshFiles();
        if (!sent.documents || !sent.simulations) throw new Error("Nem todos os arquivos foram enviados.");
      },
    });
    if (!saved) return;
    setFilesRevealed(false);
    setIsEditing(false);
    onConfirm?.();
  };

  const remove = async () => {
    if (!clientId) return;
    try {
      await deleteClient(clientId);
      setShowDelete(false);
      onClose();
      onConfirm?.();
    } catch (reason) {
      setActionError((reason as Error)?.message || fallbackMessages.CLIENTS.DELETE_FAILED);
    }
  };

  const confirmFileRemoval = async () => {
    const fileId = fileRemoval;
    setFileRemoval(null);
    if (!fileId || !clientId) return;
    try {
      await deleteFile(clientId, fileId);
      await sheet.refreshFiles();
    } catch {
      setActionError(fallbackMessages.CLIENTS.UPDATE_FAILED);
    }
  };

  const fill = (
    schema: Parameters<typeof sectionFill>[0],
    values: Parameters<typeof sectionFill>[1],
    skip?: readonly string[],
  ) => {
    const { filled, total } = sectionFill(schema, values, skip);
    return { badge: `${filled}/${total}`, isComplete: filled === total };
  };

  const fileCount = (record?.documents.length ?? 0) + (record?.simulations.length ?? 0);
  const interviewCount = record?.interviewCount ?? 0;

  const sheetSections: SheetSection[] = [
    {
      id: "atendimento",
      title: "Atendimento",
      description: "Benefício pretendido e situação do caso.",
      icon: <ServiceIcon />,
      ...fill(serviceSchema, service.values),
      content: <ServiceSection form={service} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    {
      id: "dados-pessoais",
      title: "Dados pessoais",
      description: "Quem é o cliente e como falar com ele.",
      icon: <PersonIcon />,
      ...fill(personalSchema, personal.values),
      content: <PersonalDataSection form={personal} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
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
              clientId={clientId ?? ""}
              isEditing={isEditing}
              newPassword={professional.values.inssPassword}
              onNewPasswordChange={(value) => professional.setField("inssPassword", value)}
            />
          }
        />
      ),
    },
    {
      id: "deficiencia",
      title: "Deficiência",
      description: "Grau e tempo em cada grau — mudam o tempo exigido na aposentadoria da pessoa com deficiência.",
      icon: <DisabilityIcon />,
      isHidden: !showDisability,
      badge: disabilityCount > 0 ? plural(disabilityCount, "período", "períodos") : undefined,
      content: clientId ? (
        <ClientDisabilityPanel
          ref={isEditing ? disabilityRef : undefined}
          clientId={clientId}
          gender={GenderLabelByKey[personal.values.gender as GenderKey] ?? personal.values.gender}
          isEditing={isEditing}
          canDeleteSaved={canDestroy}
          onSavedCountChange={setDisabilityCount}
        />
      ) : null,
    },
    {
      id: "endereco",
      title: "Endereço",
      description: "O endereço principal do cliente.",
      icon: <AddressIcon />,
      ...fill(addressSchema, address.values, ["cepLookup"]),
      content: <AddressSection form={address} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
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
      badge: fileCount ? plural(fileCount, "arquivo", "arquivos") : "Sem arquivos",
      content: sheet.isLoading ? (
        <RowSkeletons count={2} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Lendo, só abrir e baixar; editando, excluir o gravado e
              escolher novos — no mesmo desenho do cadastro. */}
          <FilesSection
            documents={record?.documents ?? []}
            simulations={record?.simulations ?? []}
            onDelete={isEditing ? (_kind, fileId) => setFileRemoval(fileId) : undefined}
          />
          {isEditing && (
            <FilesUpload
              documents={stagedDocuments}
              simulations={stagedSimulations}
              onDocumentsChange={setStagedDocuments}
              onSimulationsChange={setStagedSimulations}
              showErrors={filesRevealed}
            />
          )}
        </div>
      ),
    },
    // Dinheiro é de quem vê o financeiro (D3): para os demais a seção nem existe.
    ...(canSeeFinance && clientId
      ? [
          {
            id: "pagamentos",
            title: "Pagamentos",
            description: "Benefício que o INSS paga ao cliente e honorários do escritório.",
            icon: <WalletIcon className="h-5 w-5" />,
            badge: "Só leitura",
            content: financeSeen ? <ClientFinancePanel clientId={clientId} /> : <RowSkeletons count={3} />,
          } satisfies SheetSection,
        ]
      : []),
    {
      id: "andamento",
      title: "Andamento do benefício",
      description: "Da mudança de situação mais recente para a mais antiga.",
      icon: <ClockIcon className="h-5 w-5" />,
      badge: record?.history.length ? plural(record.history.length, "mudança", "mudanças") : undefined,
      content: sheet.isLoading ? (
        <RowSkeletons count={4} />
      ) : (
        <SituationHistorySection
          items={record?.history ?? []}
          hasError={record?.historyFailed ?? false}
          authors={authors}
        />
      ),
    },
  ];

  const visible = sheetSections.filter((section) => !section.isHidden);
  const hidden = sheetSections.filter((section) => section.isHidden);
  const items: HeroNavItem[] = visible.map((section) => ({
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
      className="min-h-[80vh] max-w-[1440px] bg-[#F4F4F5]"
    >
      {/* `data-readonly`: em leitura, o campo travado continua legível
          (`ui/form/formFields.css`). */}
      <div data-readonly={isEditing ? undefined : ""} className={`flex ${SHEET_HEIGHT} flex-col gap-4 py-4 md:flex-row`}>
        <CompiledHero
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
              canDelete={canDestroy}
              onEdit={() => setIsEditing(true)}
              onCancel={leaveEdit}
              onSave={() => void save()}
              onDelete={() => setShowDelete(true)}
            />
          }
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <CompiledTabs items={items} activeId={active} onSelect={goTo} />

          {/*
            Quem rola não é quem empilha. Com o `overflow-y-auto` no próprio
            `flex-col`, cada cartão vira item flex de um contêiner de altura
            fixa — e item flex encolhe: os cartões achatavam até sobrar só a
            faixa do cabeçalho.
          */}
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 pb-6">
              {visible.map((section) => (
                <CompiledSection
                  key={section.id}
                  id={section.id}
                  label={section.title}
                  blurb={section.description}
                  icon={section.icon}
                  badge={section.badge}
                >
                  {section.content}
                </CompiledSection>
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

/**
 * As ações no pé do painel: "Editar cadastro" na leitura; "Cancelar" e
 * "Salvar" na edição. Excluir é só ícone, com dica — o nome dele não disputa
 * espaço com a ação principal, que é a larga. Fechar fica no canto da ficha.
 */
function SheetActions({
  isEditing,
  isSaving,
  isLoading,
  canDelete,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  isEditing: boolean;
  isSaving: boolean;
  /** Sem os dados ainda, não há o que editar nem salvar. */
  isLoading: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <ActionGroup shape="pill" surface="dark">
      {isEditing ? (
        <>
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
        </>
      ) : (
        <ActionButton
          tone="onDark"
          grow
          className="font-semibold"
          onClick={onEdit}
          disabled={isLoading}
          icon={<PencilIcon className="h-4 w-4" />}
        >
          Editar cadastro
        </ActionButton>
      )}
      {/* Excluir é de advogado/admin: o backend recusa os demais com 403. */}
      {canDelete && (
        <HeroTipButton label="Excluir cliente" onPress={onDelete} isDisabled={isSaving}>
          <TrashIcon className="h-4 w-4" />
        </HeroTipButton>
      )}
    </ActionGroup>
  );
}
