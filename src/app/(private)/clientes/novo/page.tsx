"use client";

import { Accordion, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { ProgressRing } from "@/components/clients/form/ProgressRing";
import { FormSection } from "@/components/clients/form/FormSection";
import {
  REQUIRED_CREATE_KEYS,
  computeProgress,
} from "@/components/clients/form/progress";
import {
  AddressesSection,
  type AddressSlot,
} from "@/components/clients/form/sections/AddressesSection";
import {
  addressInitial,
  addressRules,
  hasAddressInput,
  type AddressValues,
} from "@/components/clients/form/sections/AddressSection";
import { CnisSection } from "@/components/clients/form/sections/cnis/CnisSection";
import { FilesSection } from "@/components/clients/form/sections/files/FilesSection";
import FileUploadModal from "@/components/clients/form/sections/files/FileUploadModal";
import type {
  FileKind,
  StagedDocument,
  StagedSimulation,
} from "@/components/clients/form/sections/files/types";
import { isDocumentReady } from "@/components/clients/form/sections/files/types";
import {
  InterviewSection,
  hasInterviewInput,
  interviewInitial,
  interviewRules,
  type InterviewValues,
} from "@/components/clients/form/sections/InterviewSection";
import {
  PersonalDataSection,
  personalInitial,
  personalRules,
  type PersonalValues,
} from "@/components/clients/form/sections/PersonalDataSection";
import {
  ProfessionalDataSection,
  professionalInitial,
  professionalRules,
  type ProfessionalValues,
} from "@/components/clients/form/sections/ProfessionalDataSection";
import {
  ServiceSection,
  serviceInitial,
  serviceRules,
  type ServiceValues,
} from "@/components/clients/form/sections/ServiceSection";

import {
  buildDocumentsFormData,
  buildSimulationsFormData,
} from "@/components/clients/form/documentsFormData";
import {
  toAddressRequest,
  toCreateRequest,
  toInterviewRequest,
  toPatchRequest,
  toPersonalDataRequest,
  toProfessionalDataRequest,
} from "@/components/clients/form/payloads";
import {
  findPrimaryIndex,
  indexAfterRemoval,
  isValidPrimarySelection,
  nextSelectedIndex,
  casarIdsDeEndereco,
  removeSlotAt,
  withPrimaryAt,
} from "@/components/clients/form/primaryAddress";
import PrimaryAddressPicker from "@/components/clients/form/PrimaryAddressPicker";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import { useSectionForm } from "@/hooks/useSectionForm";
import { clearClientsCache } from "@/lib/clientsCache";
import {
  createAddress,
  createAddresses,
  deleteAddress,
  updateAddress,
} from "@/services/clientAddressService";
import {
  updatePersonalData,
  updateProfessionalData,
} from "@/services/clientDataService";
import {
  uploadDocuments,
  uploadSimulations,
} from "@/services/clientFileService";
import { createInterview } from "@/services/clientInterviewService";
import { createClient, patchClient } from "@/services/clientService";
import { notificationCenter } from "@/services/notificationService";

/**
 * Cadastro de cliente — página, não modal.
 *
 * ## Por que duas fases
 *
 * Só "Atendimento", "Dados pessoais" e "Dados profissionais" cabem no
 * `POST /clients`. Endereço, entrevista e documentos são **sub-recursos**
 * (`/clients/{id}/...`) e, por definição, precisam de um cliente que já exista
 * — o próprio `ClientCreateRequestDTO` documenta que endereço não entra no
 * payload.
 *
 * Então o fluxo é: preencher as três primeiras seções → "Salvar cliente" →
 * com o id em mãos, as três últimas destravam e cada uma grava por conta
 * própria. Nenhuma escrita parcial fica pendurada: ou o cliente existe, ou
 * nada foi enviado.
 *
 * ## Por que o estado mora aqui
 *
 * As seções são componentes de apresentação: recebem o formulário e desenham.
 * Quem conhece service, id e ordem de gravação é esta página. É o contrário do
 * que o `REVISAO_ARQUITETURA_2026` aponta em `AppointmentFormFields`, que abre
 * conexão HTTP de dentro de um componente de campo.
 */

const SECTION_KEYS = {
  service: "atendimento",
  personal: "dados-pessoais",
  address: "endereco",
  professional: "dados-profissionais",
  interview: "entrevista",
  documents: "documentos",
  cnis: "cnis",
} as const;

/** Ícone genérico de seção — o mesmo do print, um cartão com linhas. */
function SectionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect
        x="2"
        y="4"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5 8h4M5 11h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function NewClientPage() {
  const router = useRouter();

  const service = useSectionForm<ServiceValues>({
    initial: serviceInitial,
    rules: serviceRules,
  });
  const personal = useSectionForm<PersonalValues>({
    initial: personalInitial,
    rules: personalRules,
  });
  const professional = useSectionForm<ProfessionalValues>({
    initial: professionalInitial,
    rules: professionalRules,
  });
  /**
   * Três `useSectionForm` fixos, não um array dinâmico — hooks não podem
   * nascer dentro de um loop, e o limite de 3 abas (o atual + até 2 extras)
   * já é regra de negócio fixa, então não perde generalidade.
   */
  const address1 = useSectionForm<AddressValues>({
    initial: addressInitial,
    rules: addressRules,
  });
  const address2 = useSectionForm<AddressValues>({
    initial: { ...addressInitial, isPrimary: false },
    rules: addressRules,
  });
  const address3 = useSectionForm<AddressValues>({
    initial: { ...addressInitial, isPrimary: false },
    rules: addressRules,
  });
  const addressForms = [address1, address2, address3] as const;

  /** Quantas abas de endereço estão visíveis — de 1 (só o atual) a 3. */
  const [addressCount, setAddressCount] = useState(1);
  const [selectedAddressKey, setSelectedAddressKey] = useState("address-0");
  /** `id` do backend por posição; `null` até o primeiro salvamento daquela aba. */
  const [addressIds, setAddressIds] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  /**
   * Abas visíveis. Derivado de `addressCount`, não estado próprio — duas
   * fontes para a mesma verdade é como uma aba aparece sem formulário atrás.
   */
  const addressSlots: AddressSlot[] = addressForms
    .slice(0, addressCount)
    .map((form, index) => ({
      key: `address-${index}`,
      label: index === 0 ? "Endereço atual" : `Endereço ${index + 1}`,
      form,
    }));

  /**
   * Aba que pediu para virar a principal, aguardando confirmação.
   * `null` quando não há troca pendente.
   */
  const [primaryRequest, setPrimaryRequest] = useState<number | null>(null);
  /**
   * Aba cuja exclusão espera a escolha do próximo principal.
   * `null` quando não há exclusão pendente.
   */
  const [removeRequest, setRemoveRequest] = useState<number | null>(null);

  /** Índice da aba principal hoje, ou `-1` se nenhuma está marcada. */
  const currentPrimaryIndex = findPrimaryIndex(
    addressSlots.map((slot) => slot.form.values),
  );

  /**
   * Pedido de troca vindo de uma aba.
   *
   * Sem outro principal marcado, não há o que confirmar — promove direto.
   * Havendo, a troca é uma decisão sobre um endereço que o usuário já
   * escolheu antes, então ela é dita em voz alta antes de acontecer: era isso
   * que o backend fazia calado ao desmarcar o anterior a cada POST.
   */
  const handleRequestPrimary = (slot: AddressSlot) => {
    const index = Number(slot.key.replace("address-", ""));
    if (currentPrimaryIndex === -1 || currentPrimaryIndex === index) {
      promotePrimary(index);
      return;
    }
    setPrimaryRequest(index);
  };

  /**
   * Aplica a escolha: exatamente **um** principal no formulário inteiro.
   *
   * É aqui que a invariante é garantida — o que sai daqui para a API já vem
   * com um só principal, e a recusa com 400 no backend fica como rede de
   * segurança para chamadas fora desta tela, não como a defesa principal.
   */
  const promotePrimary = (index: number) => {
    const next = withPrimaryAt(
      addressForms.map((form) => form.values),
      index,
    );
    addressForms.forEach((form, i) => {
      form.setField("isPrimary", next[i].isPrimary);
    });
  };

  /**
   * Aplica a remoção de uma aba.
   *
   * `nextPrimary` vem na numeração **anterior** à remoção — é o que o diálogo
   * conhece. A reindexação acontece aqui, depois do `removeSlotAt`, porque
   * promover pelo índice antigo escolheria o endereço errado sem erro nenhum.
   */
  const applyRemoveAddress = async (index: number, nextPrimary?: number) => {
    const savedId = addressIds[index];

    // Aba já gravada precisa sair do servidor também; aba só aberta na tela
    // some sem nenhuma requisição.
    if (savedId && clientId) {
      try {
        await deleteAddress(clientId, savedId);
      } catch (error) {
        console.error("Erro ao excluir endereço:", error);
        return;
      }
    }

    const removed = removeSlotAt(
      addressForms.map((form) => form.values),
      addressIds,
      index,
      { ...addressInitial, isPrimary: false },
    );

    const promoteAt =
      nextPrimary === undefined ? -1 : indexAfterRemoval(nextPrimary, index);

    const finalValues =
      promoteAt >= 0
        ? withPrimaryAt(removed.values, promoteAt)
        : removed.values;

    addressForms.forEach((form, i) => form.setValues(finalValues[i]));
    setAddressIds(removed.ids);

    const remaining = Math.max(1, addressCount - 1);
    setAddressCount(remaining);

    const selectedIndex = Number(selectedAddressKey.replace("address-", ""));
    setSelectedAddressKey(
      `address-${nextSelectedIndex(index, selectedIndex, remaining)}`,
    );

    notificationCenter.success("Endereço removido.");
  };

  /**
   * Pedido de exclusão vindo de uma aba.
   *
   * Excluir o principal e escolher o sucessor são a mesma decisão: sem
   * principal, o backend recusa e a listagem (ordenada por `isPrimary desc`)
   * não teria como ordenar. Por isso o diálogo, em vez de apagar e promover
   * alguém por conta própria.
   */
  const handleRemoveAddress = (index: number) => {
    const isPrimarySlot = addressForms[index]?.values.isPrimary;
    if (isPrimarySlot && addressCount > 1) {
      setRemoveRequest(index);
      return;
    }
    void applyRemoveAddress(index);
  };

  const handleAddAddress = () => {
    if (addressCount >= addressForms.length) return;
    const nextIndex = addressCount;
    setAddressCount(nextIndex + 1);
    // Já leva o foco para a aba nova: adicionar e continuar na antiga faria o
    // clique parecer sem efeito.
    setSelectedAddressKey(`address-${nextIndex}`);
  };

  const interview = useSectionForm<InterviewValues>({
    initial: interviewInitial,
    rules: interviewRules,
  });

  /**
   * `null` enquanto o cliente não existe. Depois de preenchido, cada seção
   * passa a salvar sozinha; antes disso, o salvamento é um só.
   */
  const [clientId, setClientId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /**
   * Arquivos escolhidos. Moram aqui, e não dentro da seção, porque quem decide
   * se o upload é disparado é o orquestrador — e ele precisa enxergar a lista.
   */
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [stagedSimulations, setStagedSimulations] = useState<
    StagedSimulation[]
  >([]);
  const [uploadKind, setUploadKind] = useState<FileKind | null>(null);
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());
  /**
   * `Set<string>` e não `Set<Key>`: o `Key` do React inclui `bigint`, que o
   * DisclosureGroup do React Aria não aceita — e `Set<string>` satisfaz o
   * `Iterable<Key>` que ele pede, sem importar tipo de pacote transitivo.
   */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    new Set([SECTION_KEYS.service, SECTION_KEYS.personal]),
  );

  const isCreated = clientId !== null;

  const progress = useMemo(
    () =>
      computeProgress(
        { ...service.values, ...personal.values, ...professional.values },
        REQUIRED_CREATE_KEYS,
      ),
    [service.values, personal.values, professional.values],
  );

  const canCreate =
    service.isValid && personal.isValid && professional.isValid && !isCreating;

  /** Marca uma seção como gravada — alimenta o selo do cabeçalho do accordion. */
  const markSaved = (key: string) =>
    setSavedSections((current) => new Set(current).add(key));

  /**
   * Salvamento único da criação.
   *
   * As seis seções ficam abertas desde o começo. O que decide o que vai para a
   * API é o **preenchimento**, não um destravamento: só as seções com conteúdo
   * viram requisição.
   *
   * A ordem não é escolha de estilo — `POST /clients` precisa vir primeiro
   * porque é ele que produz o id que as três rotas de sub-recurso carregam no
   * caminho. Daí em diante é sequência simples.
   *
   * O que essa separação por endpoint resolve é **edição** (trocar um endereço
   * sem mandar um `PUT` do cliente inteiro por cima do que outra pessoa mexeu).
   * Na criação não há concorrência nem estado anterior — tratá-la como se
   * houvesse era transformar restrição de URL em regra de negócio.
   */
  const handleSaveAll = async () => {
    // Guarda contra duplicata: com o cliente já criado, este botão não existe
    // mais, mas um duplo clique na fração de segundo entre o POST e o
    // `setClientId` criaria um segundo cliente.
    if (clientId || isCreating) return;

    // Sempre obrigatórias (compõem o POST /clients).
    const requiredOk = [
      service.revealErrors(),
      personal.revealErrors(),
      professional.revealErrors(),
    ].every(Boolean);

    // Opcionais: só são validadas se o usuário mexeu nelas. Uma seção em
    // branco não pode reprovar um cadastro que está completo.
    // Cada aba de endereço é um POST independente; só as preenchidas contam.
    const filledAddresses = addressSlots.filter((slot) =>
      hasAddressInput(slot.form.values),
    );
    const interviewTouched = hasInterviewInput(interview.values);
    const documentsTouched =
      stagedDocuments.length > 0 || stagedSimulations.length > 0;

    const optionalOk =
      filledAddresses.every((slot) => slot.form.revealErrors()) &&
      (!interviewTouched || interview.revealErrors());

    if (!requiredOk || !optionalOk) {
      notificationCenter.warning("Revise os campos destacados.", {
        description: "Há campos obrigatórios pendentes.",
      });
      return;
    }

    if (interviewTouched && !interview.values.content.trim()) {
      notificationCenter.warning("A entrevista precisa de conteúdo.");
      setExpandedKeys(new Set([SECTION_KEYS.interview]));
      return;
    }

    // Rede de segurança do nosso lado: a interface já impede dois principais,
    // então cair aqui significa bug de estado — melhor descobrir antes do 400.
    if (
      !isValidPrimarySelection(filledAddresses.map((slot) => slot.form.values))
    ) {
      notificationCenter.warning("Escolha um único endereço principal.");
      setExpandedKeys(new Set([SECTION_KEYS.address]));
      return;
    }

    // Simulação não tem metadado obrigatório; documento tem (`documentType`).
    if (stagedDocuments.length > 0 && !stagedDocuments.every(isDocumentReady)) {
      notificationCenter.warning("Escolha o tipo de cada documento.");
      setExpandedKeys(new Set([SECTION_KEYS.documents]));
      return;
    }

    setIsCreating(true);
    try {
      const envelope = await createClient(
        toCreateRequest(service.values, personal.values, professional.values),
      );
      const newId = envelope?.data?.id;
      if (!newId) {
        // 2xx sem id é falha de contrato: sem id não há como gravar o resto.
        notificationCenter.warning("Cliente criado, mas sem identificador.", {
          description: "Confira a listagem antes de tentar de novo.",
        });
        return;
      }

      // A listagem cacheia por combinação de filtros; sem limpar, o cliente
      // novo não aparece até o próximo logout.
      clearClientsCache();
      setClientId(newId);
      markSaved(SECTION_KEYS.service);
      markSaved(SECTION_KEYS.personal);
      markSaved(SECTION_KEYS.professional);

      /**
       * Daqui para baixo o cliente **já existe**. Uma falha não desfaz a
       * criação — só deixa aquela seção por gravar. Por isso cada passo é
       * isolado: um endereço que falha não impede a entrevista de entrar, e a
       * seção que falhou continua editável, com o botão próprio de salvar.
       */
      const failed: string[] = [];

      /**
       * Os endereços vão numa requisição só (`/addresses/batch`), e não num
       * POST por aba.
       *
       * Com um POST por aba, cada um tinha transação própria: o segundo
       * falhando deixava o primeiro gravado e a ficha pela metade, com a tela
       * dizendo que "endereço 2" falhou e nada explicando por que o 1 ficou.
       * No lote, ou entram todos ou não entra nenhum — e a aba inteira volta
       * a ficar por gravar, que é um estado que a pessoa entende e consegue
       * repetir pelo botão de salvar da seção.
       *
       * O backend devolve os criados **na ordem enviada**, o que é o que
       * permite casar cada resposta com a aba que a originou e guardar o id —
       * sem ele, uma edição posterior viraria um endereço novo em vez de PUT.
       */
      if (filledAddresses.length > 0) {
        try {
          const saved = await createAddresses(
            newId,
            filledAddresses.map((slot) => toAddressRequest(slot.form.values)),
          );
          const criados = saved?.data ?? [];
          const enviados = filledAddresses.map((slot) =>
            Number(slot.key.replace("address-", "")),
          );
          setAddressIds((current) =>
            casarIdsDeEndereco(current, enviados, criados),
          );
          markSaved(SECTION_KEYS.address);
        } catch (error) {
          console.error("Erro ao salvar endereços:", error);
          failed.push(
            filledAddresses.length > 1 ? "endereços" : "endereço",
          );
        }
      }

      if (interviewTouched) {
        try {
          await createInterview(newId, toInterviewRequest(interview.values));
          markSaved(SECTION_KEYS.interview);
        } catch (error) {
          console.error("Erro ao salvar entrevista:", error);
          failed.push("entrevista");
        }
      }

      if (stagedDocuments.length > 0) {
        try {
          await uploadDocuments(newId, buildDocumentsFormData(stagedDocuments));
          setStagedDocuments([]);
          markSaved(SECTION_KEYS.documents);
        } catch (error) {
          console.error("Erro ao enviar documentos:", error);
          failed.push("documentos");
        }
      }

      if (stagedSimulations.length > 0) {
        try {
          await uploadSimulations(
            newId,
            buildSimulationsFormData(
              stagedSimulations.map((item) => ({
                file: item.file,
                simulationDate: item.simulationDate,
                version: item.version,
                vinculos: item.vinculos ? Number(item.vinculos) : undefined,
                notes: item.notes,
              })),
            ),
          );
          setStagedSimulations([]);
          markSaved(SECTION_KEYS.documents);
        } catch (error) {
          console.error("Erro ao enviar simulações:", error);
          failed.push("simulações");
        }
      }

      if (failed.length > 0) {
        notificationCenter.warning("Cliente criado, com pendências.", {
          description: `Não foi possível salvar: ${failed.join(", ")}. Use o botão da própria seção para tentar de novo.`,
        });
        setExpandedKeys(
          new Set([SECTION_KEYS.address, SECTION_KEYS.interview]),
        );
        return;
      }

      notificationCenter.success("Cliente cadastrado.");
      router.push("/clientes");
    } catch (error) {
      // O toast de erro já vem do interceptor do axiosService.
      console.error("Erro ao criar cliente:", error);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Os handlers abaixo servem à fase 2: com o cliente criado, cada seção grava
   * sozinha na sua rota — que é onde a separação por endpoint tem valor real,
   * porque salvar o endereço não escreve por cima de um campo profissional.
   */
  const handleSaveService = async () => {
    if (!clientId || !service.revealErrors()) return;
    try {
      await patchClient(clientId, toPatchRequest(service.values));
      markSaved(SECTION_KEYS.service);
      notificationCenter.success("Atendimento atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar atendimento:", error);
    }
  };

  const handleSavePersonal = async () => {
    if (!clientId || !personal.revealErrors()) return;
    try {
      await updatePersonalData(
        clientId,
        toPersonalDataRequest(personal.values),
      );
      markSaved(SECTION_KEYS.personal);
      notificationCenter.success("Dados pessoais salvos.");
    } catch (error) {
      console.error("Erro ao salvar dados pessoais:", error);
    }
  };

  const handleSaveProfessional = async () => {
    if (!clientId || !professional.revealErrors()) return;
    try {
      await updateProfessionalData(
        clientId,
        toProfessionalDataRequest(professional.values),
      );
      markSaved(SECTION_KEYS.professional);
      notificationCenter.success("Dados profissionais salvos.");
    } catch (error) {
      console.error("Erro ao salvar dados profissionais:", error);
    }
  };

  /**
   * Salva uma aba de endereço na fase 2.
   *
   * `POST` na primeira vez, `PUT` daí em diante — sem guardar o id, clicar
   * "salvar" duas vezes criaria dois endereços para o mesmo cliente.
   */
  const handleSaveAddress = async (index: number) => {
    const form = addressForms[index];
    if (!clientId || !form || !form.revealErrors()) return;

    const body = toAddressRequest(form.values);
    const existingId = addressIds[index];
    try {
      if (existingId) {
        await updateAddress(clientId, existingId, body);
        notificationCenter.success("Endereço atualizado.");
      } else {
        const saved = await createAddress(clientId, body);
        const addressId = saved?.data?.id;
        if (addressId) {
          setAddressIds((current) =>
            current.map((value, i) => (i === index ? addressId : value)),
          );
        }
        notificationCenter.success("Endereço salvo.");
      }
      markSaved(SECTION_KEYS.address);
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
    }
  };

  const handleSaveInterview = async () => {
    if (!clientId) return;
    if (!hasInterviewInput(interview.values)) {
      notificationCenter.info("Nada para salvar na entrevista.");
      return;
    }
    if (!interview.revealErrors()) return;
    if (!interview.values.content.trim()) {
      notificationCenter.warning("A entrevista precisa de conteúdo.");
      return;
    }
    try {
      await createInterview(clientId, toInterviewRequest(interview.values));
      markSaved(SECTION_KEYS.interview);
      notificationCenter.success("Entrevista salva.");
    } catch (error) {
      console.error("Erro ao salvar entrevista:", error);
    }
  };

  /**
   * Nenhuma seção fica travada. O que define o que vai para a API é o
   * preenchimento — seção em branco simplesmente não vira requisição.
   */
  const statusOf = (key: string, isValid: boolean) => {
    if (savedSections.has(key))
      return { status: "saved" as const, label: "Salvo" };
    return isValid
      ? { status: "ready" as const, label: "Pronto" }
      : { status: "pending" as const, label: "Pendente" };
  };

  return (
    <div className="flex flex-col gap-4 pb-16">
      {/*
        `onPress` em vez de `href`: HeroUI v3 não tem `RouterProvider` — sem
        ele, `href` navegaria com reload de página inteira em vez do router do
        Next. O último item fica sem handler: react-aria já o marca como
        `isCurrent` (é o filho final da lista) e não desenha o separador.
      */}

      <PageHeader
        title="Cadastro de Cliente"
        actions={
          /*
            O anel de progresso, e não "Salvar cliente".
            
            O `ProgressRing` foi feito para este lugar — "aro verde sobre o azul
            da marca", diz o próprio componente — e o valor já era calculado
            aqui sem nunca ser mostrado. Salvar fica no rodapé porque é lá que
            a pessoa está quando termina de preencher oito seções; duplicá-lo
            no topo criaria dois botões que fazem a mesma coisa, e um deles
            sempre longe demais.
          */
          <ProgressRing
            value={progress}
            size={72}
            label="Preenchimento dos campos obrigatórios"
          />
        }
      />
      {/*
        `hideSeparator` + `client-form-accordion`: cada seção vira um cartão
        próprio, com respiro entre elas, como no protótipo — em vez do cartão
        único com filetes que a variante `surface` desenha por padrão.
      */}
      <Accordion
        variant="surface"
        className="client-form-accordion"
        hideSeparator
        allowsMultipleExpanded
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) =>
          setExpandedKeys(new Set(Array.from(keys, String)))
        }
      >
        <FormSection
          id={SECTION_KEYS.service}
          title="Atendimento"
          icon={<SectionIcon />}
          {...toSectionProps(statusOf(SECTION_KEYS.service, service.isValid))}
        >
          <div className="flex flex-col gap-2">
            <ServiceSection form={service} />
            <SectionActions
              isVisible={isCreated}
              onSave={handleSaveService}
              label="Salvar atendimento"
            />
          </div>
        </FormSection>

        <FormSection
          id={SECTION_KEYS.personal}
          title="Dados pessoais"
          icon={<SectionIcon />}
          {...toSectionProps(statusOf(SECTION_KEYS.personal, personal.isValid))}
        >
          <div className="flex flex-col gap-2">
            <PersonalDataSection form={personal} />
            <SectionActions
              isVisible={isCreated}
              onSave={handleSavePersonal}
              label="Salvar dados pessoais"
            />
          </div>
        </FormSection>

        <FormSection
          id={SECTION_KEYS.professional}
          title="Dados profissionais"
          icon={<SectionIcon />}
          {...toSectionProps(
            statusOf(SECTION_KEYS.professional, professional.isValid),
          )}
        >
          <div className="flex flex-col gap-2">
            <ProfessionalDataSection form={professional} />
            <SectionActions
              isVisible={isCreated}
              onSave={handleSaveProfessional}
              label="Salvar dados profissionais"
            />
          </div>
        </FormSection>

        <FormSection
          id={SECTION_KEYS.address}
          title="Endereço"
          icon={<SectionIcon />}
          {...toSectionProps(
            statusOf(SECTION_KEYS.address, addressForms[0].isValid),
          )}
        >
          <AddressesSection
            slots={addressSlots}
            selectedKey={selectedAddressKey}
            onSelectionChange={setSelectedAddressKey}
            canAddMore={addressCount < 3}
            onAddAddress={handleAddAddress}
            onRequestPrimary={handleRequestPrimary}
            renderActions={(slot) => {
              const index = Number(slot.key.replace("address-", ""));
              return (
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {addressCount > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-danger"
                      onClick={() => handleRemoveAddress(index)}
                    >
                      Excluir endereço
                    </Button>
                  )}
                  <SectionActions
                    isVisible={isCreated}
                    onSave={() => handleSaveAddress(index)}
                    label={
                      addressIds[index]
                        ? "Atualizar endereço"
                        : "Salvar endereço"
                    }
                  />
                </div>
              );
            }}
          />
        </FormSection>

        <FormSection
          id={SECTION_KEYS.interview}
          title="Entrevista"
          icon={<SectionIcon />}
          {...toSectionProps(
            statusOf(SECTION_KEYS.interview, interview.isValid),
          )}
        >
          <div className="flex flex-col gap-4">
            <InterviewSection form={interview} />
            <SectionActions
              isVisible={isCreated}
              onSave={handleSaveInterview}
              label="Salvar entrevista"
            />
          </div>
        </FormSection>

        <FormSection
          id={SECTION_KEYS.documents}
          title="Arquivos"
          icon={<SectionIcon />}
          {...toSectionProps(statusOf(SECTION_KEYS.documents, true))}
        >
          <FilesSection
            documents={[]}
            simulations={[]}
            stagedDocuments={stagedDocuments}
            stagedSimulations={stagedSimulations}
            onAddFiles={setUploadKind}
            onRemoveStagedDocument={(index) =>
              setStagedDocuments((current) =>
                current.filter((_, i) => i !== index),
              )
            }
            onRemoveStagedSimulation={(index) =>
              setStagedSimulations((current) =>
                current.filter((_, i) => i !== index),
              )
            }
          />
        </FormSection>

        {/*
          Fica por último de propósito: é análise, não cadastro. As seções
          acima descrevem o cliente e vão para o servidor; esta lê um documento
          e devolve uma leitura na tela — nada dela é enviado, porque o backend
          ainda não tem onde guardar uma análise de CNIS.

          Por isso também não entra em `computeProgress` nem ganha selo de
          "Pronto": não há o que salvar, e um selo sugeriria que há.
        */}
        <FormSection
          id={SECTION_KEYS.cnis}
          title="Análise do CNIS"
          icon={<SectionIcon />}
          status="pending"
          statusLabel="Ferramenta"
        >
          <CnisSection
            birthDate={personal.values.birthDate}
            gender={personal.values.gender}
          />
        </FormSection>
      </Accordion>

      <PrimaryAddressPicker
        isOpen={removeRequest !== null}
        onClose={() => setRemoveRequest(null)}
        removingLabel={
          removeRequest !== null
            ? (addressSlots[removeRequest]?.label ?? "Este endereço")
            : ""
        }
        options={addressSlots
          .filter(
            (slot) =>
              Number(slot.key.replace("address-", "")) !== removeRequest,
          )
          .map((slot) => {
            const index = Number(slot.key.replace("address-", ""));
            const { street, addressNumber, city } = slot.form.values;
            const hint = [street, addressNumber, city]
              .map((part) => part.trim())
              .filter(Boolean)
              .join(", ");
            return {
              index,
              label: slot.label,
              hint: hint || "Sem dados ainda",
            };
          })}
        onConfirm={(nextPrimaryIndex) => {
          if (removeRequest === null) return;
          void applyRemoveAddress(removeRequest, nextPrimaryIndex);
        }}
      />

      <FileUploadModal
        isOpen={uploadKind !== null}
        initialKind={uploadKind ?? "documents"}
        onClose={() => setUploadKind(null)}
        onConfirm={({ documents: docs, simulations: sims }) => {
          setStagedDocuments((current) => [...current, ...docs]);
          setStagedSimulations((current) => [...current, ...sims]);
        }}
      />

      <ConfirmDialog
        isOpen={primaryRequest !== null}
        onClose={() => setPrimaryRequest(null)}
        onConfirm={() => {
          if (primaryRequest !== null) promotePrimary(primaryRequest);
        }}
        heading="Trocar o endereço principal?"
        confirmLabel="Tornar principal"
        cancelLabel="Manter"
        description={
          primaryRequest !== null && currentPrimaryIndex !== -1 ? (
            <>
              <span className="font-medium">
                {addressSlots[currentPrimaryIndex]?.label}
              </span>{" "}
              deixa de ser o principal e{" "}
              <span className="font-medium">
                {addressSlots[primaryRequest]?.label}
              </span>{" "}
              passa a ser. Só um endereço pode ser o principal.
            </>
          ) : null
        }
      />

      {/* Barra de ação fixa: com seis seções abertas, um botão no fim da
          página ficaria fora de alcance sem rolar tudo de volta. */}
      <div className="bottom-4 flex  flex-col gap-3  p-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/clientes")}
          >
            {isCreated ? "Concluir" : "Cancelar"}
          </Button>
          {!isCreated && (
            <Button
              type="button"
              variant="primary"
              isDisabled={!canCreate}
              onClick={handleSaveAll}
            >
              {isCreating ? "Salvando…" : "Salvar cliente"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Rodapé de uma seção que salva por conta própria.
 *
 * Um componente e não JSX repetido seis vezes: o botão de salvar seção só faz
 * sentido depois que o cliente existe, e essa condição tem que ser a mesma em
 * todas — repetir `{isCreated && ...}` à mão é como uma seção acaba salvando
 * antes da hora.
 */
function SectionActions({
  onSave,
  label,
  isVisible,
}: {
  onSave: () => void;
  label: string;
  isVisible: boolean;
}) {
  if (!isVisible) return null;
  return (
    <div className="flex justify-end pt-2">
      <Button type="button" variant="primary" onClick={onSave}>
        {label}
      </Button>
    </div>
  );
}

function toSectionProps(state: {
  status: "locked" | "pending" | "ready" | "saved";
  label: string;
}) {
  return { status: state.status, statusLabel: state.label };
}
