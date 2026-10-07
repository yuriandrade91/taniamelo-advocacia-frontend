"use client";

import { Button, Modal } from "@heroui/react";
import type { SituationKey } from "@/enums/situation/Situation";
import { stageBg } from "@/components/ui/stageRamp";
import { plural } from "@/lib/format";
import { PipelineBoard, STAGES, type PipelineColumns } from "./pipelineBoard";

/**
 * A esteira inteira — o que o "Ver todos" do cartão abre.
 *
 * O cartão mostra os primeiros de cada coluna porque divide a largura da Home
 * com o resto; aqui não há disputa: as seis colunas aparecem sem corte
 * (`limit={null}`), com rolagem própria, e é o mesmo quadro — mover um cliente
 * aqui já o mostra na etapa nova no cartão atrás, porque o estado é um só
 * (`usePipelineColumns`, na página).
 *
 * Carrega por `next/dynamic` no cartão: a modal só existe depois do clique.
 */
export default function PipelineFullModal({
  isOpen,
  onClose,
  columns,
  total,
  onMove,
}: {
  isOpen: boolean;
  onClose: () => void;
  columns: PipelineColumns;
  total: number;
  /** `moveCard` de `usePipelineColumns` — o mesmo do quadro do cartão. */
  onMove: (cardId: string, situation: SituationKey, index: number) => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="opaque">
        <Modal.Container>
          <Modal.Dialog className="max-w-[1440px]">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading>Esteira do contribuinte</Modal.Heading>
              <p className="mt-1 text-sm text-gray-100/70">
                <span className="font-medium text-primary tabular-nums">
                  {plural(total, "cliente em andamento", "clientes em andamento")}
                </span>{" "}
                — arraste o card ou use o seletor para mudar a etapa.
              </p>
            </Modal.Header>

            {/*
              Teto de altura no corpo, como nos outros modais: sem ele a
              esteira de um escritório cheio empurra o rodapé para fora da
              janela. A rolagem de cada coluna é própria
              (`columnBodyClassName`), então o cabeçalho das seis fica à vista
              enquanto se percorre uma delas.
            */}
            <Modal.Body className="max-h-[70vh] overflow-y-auto">
              <PipelineBoard
                scope="modal"
                columns={columns}
                onMove={onMove}
                limit={null}
                layout="grid"
                columnBodyClassName="max-h-[48vh] overflow-y-auto pr-1 [scrollbar-width:thin]"
              />

              {/* Legenda da rampa: o azul cheio é a primeira etapa, o mais
                  claro a última — a mesma leitura do funil dos Relatórios. */}
              <ol className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-gray-100">
                {STAGES.map((stage) => (
                  <li key={stage.key} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${stageBg(stage.index)}`}
                    />
                    {stage.label}
                    <span className="tabular-nums text-gray-100/60">
                      {columns[stage.key]?.length ?? 0}
                    </span>
                  </li>
                ))}
              </ol>
            </Modal.Body>

            <Modal.Footer className="flex justify-end">
              <Button type="button" variant="ghost" slot="close">
                Fechar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
