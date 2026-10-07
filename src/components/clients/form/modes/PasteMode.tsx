"use client";

import { useMemo, useState } from "react";
import { ChipButton } from "@/components/ui/actions/ActionGroup";
import { ExtractionPanel } from "./ExtractionPanel";
import type { FillModeProps } from "./shared";
import { extractClientData } from "./smartFill";

const EXAMPLE = `Boa tarde, doutora! Seguem os dados da minha mãe:
Nome: MARIA APARECIDA DA SILVA
CPF 390.533.447-05 — nascida em 20/05/1965
mãe: Ana Rosa da Silva
cel (31) 98888-7777 · maria.silva@gmail.com
Rua das Flores, 123 - bairro Centro, Belo Horizonte/MG CEP 30110-012
casada, trabalha como costureira, NIT 123.45678.90-1
Ela quer dar entrada na aposentadoria por idade.`;

/**
 * Modo "Colar e preencher": o cliente manda os dados pelo WhatsApp, a
 * pessoa cola a mensagem e o cadastro se preenche. A leitura acontece
 * enquanto se digita (`extractClientData`, função pura com testes), e nada
 * entra no cadastro sem confirmação.
 */
export function PasteMode(props: FillModeProps) {
  const [text, setText] = useState("");
  const fields = useMemo(() => extractClientData(text), [text]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-light-gray">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-primary">
              Cole a mensagem do cliente
            </h3>
            <p className="text-sm text-gray-100">
              WhatsApp, e-mail, anotação — do jeito que veio.
            </p>
          </div>
          <div className="flex gap-2">
            <ChipButton tone="primary" onClick={() => setText(EXAMPLE)}>
              Usar exemplo
            </ChipButton>
            {text && (
              <ChipButton tone="danger" onClick={() => setText("")}>
                Limpar
              </ChipButton>
            )}
          </div>
        </div>
        <textarea
          aria-label="Texto com os dados do cliente"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"Nome: …\nCPF …\nnascida em …\ncel …"}
          className="min-h-80 flex-1 resize-y rounded-2xl bg-page px-5 py-4 font-mono text-sm leading-relaxed text-primary outline-none placeholder:text-gray-100/40 focus:bg-floral focus:ring-2 focus:ring-secondary/40"
        />
      </section>

      <ExtractionPanel fields={fields} forms={props} />
    </div>
  );
}
