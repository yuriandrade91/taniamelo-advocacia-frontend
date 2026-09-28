"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

import { TextAreaField, Field } from "@/components/ui/form/Field";
import {
  clearFatores,
  parseFatorTable,
  saveFatores,
  type StoredFatores,
} from "@/lib/cnis/atualizacao";
import { notificationCenter } from "@/services/notificationService";

/**
 * Importação da tabela de atualização monetária.
 *
 * O porquê de esta tela existir está em `atualizacao.ts`: a tabela oficial não
 * está disponível de forma aberta, e derivá-la por aproximação produziria um
 * valor errado com cara de certo. Então ela é dado de entrada — colada uma vez.
 *
 * O campo "referência" não é burocracia: a tabela corrige salários **para uma
 * data**. Usar em setembro uma tabela de referência de março subestima a média
 * em toda a inflação do intervalo, e nada na tela denunciaria isso se a
 * referência não estivesse escrita ao lado do resultado.
 */

export type CnisFatoresProps = {
  stored: StoredFatores | null;
  onChange: (stored: StoredFatores | null) => void;
};

export function CnisFatores({ stored, onChange }: CnisFatoresProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [referencia, setReferencia] = useState("");
  const [fonte, setFonte] = useState("");

  const total = stored ? Object.keys(stored.fatores).length : 0;

  const handleImport = () => {
    const { fatores, ignoradas } = parseFatorTable(text);
    const count = Object.keys(fatores).length;

    if (count === 0) {
      notificationCenter.warning(
        "Nenhuma linha reconhecida. O formato esperado é uma competência e um fator por linha, como `07/1994 9,276961`.",
      );
      return;
    }

    const next: StoredFatores = {
      meta: {
        referencia: referencia.trim() || undefined,
        fonte: fonte.trim() || undefined,
        importadaEm: new Date().toISOString(),
      },
      fatores,
    };

    const persisted = saveFatores(next);
    onChange(next);
    setIsOpen(false);
    setText("");

    // Duas mensagens diferentes: guardar no navegador pode falhar (aba
    // anônima, armazenamento bloqueado), e nesse caso a tabela vale só até
    // recarregar a página. Deixar isso implícito seria perder o trabalho sem
    // aviso.
    notificationCenter.success(
      persisted
        ? `${count} fatores importados${ignoradas.length ? `, ${ignoradas.length} linhas ignoradas` : ""}.`
        : `${count} fatores carregados, mas não foi possível guardá-los neste navegador — valem só nesta sessão.`,
    );
  };

  return (
    <div className="rounded-xl border border-black/5 bg-light-gray/30 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">
            Tabela de atualização monetária
          </p>
          {total > 0 ? (
            <p className="mt-0.5 text-xs text-gray-100">
              {total} competências carregadas
              {stored?.meta.referencia && ` · referência ${stored.meta.referencia}`}
              {stored?.meta.fonte && ` · ${stored.meta.fonte}`}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-100">
              Sem a tabela, o tempo e as regras funcionam normalmente — só a RMI
              fica de fora. Ela não é estimada.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {total > 0 && (
            <Button
              type="button"
              variant="ghost"
              onPress={() => {
                clearFatores();
                onChange(null);
              }}
            >
              Remover
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onPress={() => setIsOpen((current) => !current)}
          >
            {total > 0 ? "Substituir" : "Colar tabela"}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Competência de referência"
              value={referencia}
              onChange={(event) => setReferencia(event.target.value)}
              placeholder="09/2026"
            />
            <Field
              label="Fonte"
              value={fonte}
              onChange={(event) => setFonte(event.target.value)}
              placeholder="Portaria MPS nº ___"
            />
          </div>
          <TextAreaField
            label="Tabela"
            value={text}
            onChange={setText}
            rows={8}
            placeholder={"07/1994  9,276961\n08/1994  9,100000\n09/1994  8,900000"}
          />
          <p className="text-xs text-gray-100">
            Uma competência e um fator por linha. Espaço, ponto e vírgula ou
            tabulação servem de separador. A vírgula é lida como decimal.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onPress={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onPress={handleImport}>
              Importar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
