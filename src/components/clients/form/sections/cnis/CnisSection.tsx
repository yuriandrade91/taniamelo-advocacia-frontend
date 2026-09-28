"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";

import { DatePickerField, SelectField, TextAreaField } from "@/components/ui/form/Field";
import { loadFatores, type StoredFatores } from "@/lib/cnis/atualizacao";
import { parseCnis } from "@/lib/cnis/parseCnis";
import { RENDA_POR_REGRA, calcularMedia, calcularRmi, type RmiResult } from "@/lib/cnis/rmi";
import { avaliarRegras, DATA_EC103, temDireitoAdquirido } from "@/lib/cnis/rules";
import { computeTempo, tempoAte } from "@/lib/cnis/tempoContribuicao";
import type { CnisDocument, Sexo } from "@/lib/cnis/types";
import { formatBRL } from "@/lib/format";
import { todayIso } from "@/lib/period";
import { notificationCenter } from "@/services/notificationService";

import { CnisFatores } from "./CnisFatores";
import { CnisRegras } from "./CnisRegras";
import { CnisResumo } from "./CnisResumo";
import { PdfSupportError, readCnisFile } from "./extractPdfText";

/**
 * Análise do CNIS.
 *
 * ## O que esta seção é
 *
 * Uma ferramenta de triagem: lê o extrato, conta o tempo, e mostra em qual das
 * regras da EC 103 o cliente se enquadra e quanto falta nas outras. Adianta a
 * parte mecânica do trabalho — a que hoje é feita à mão, somando períodos numa
 * planilha, que é onde o erro nasce.
 *
 * ## O que ela não é
 *
 * Não é laudo, e a tela diz isso. Não trata tempo especial, rural, professor,
 * deficiência nem servidor público; não decide indicador de pendência; e não
 * inventa fator de atualização quando ele falta. Cada uma dessas omissões é
 * deliberada: são pontos onde uma resposta automática seria uma opinião
 * jurídica disfarçada de número.
 *
 * ## Por que fica no cadastro do cliente
 *
 * Porque a idade e o sexo, que quatro das cinco regras exigem, já estão ali. E
 * porque o CNIS é o documento a partir do qual o atendimento inteiro é
 * decidido — analisá-lo em outra tela seria separar o dado da decisão.
 *
 * Nada disto é enviado ao servidor: **o backend ainda não tem onde guardar uma
 * análise de CNIS**. É cálculo de tela, refeito a cada importação.
 */

export type CnisSectionProps = {
  /** Data de nascimento vinda dos dados pessoais, quando já preenchida. */
  birthDate?: string;
  /** Gênero do cadastro, usado como palpite inicial do sexo previdenciário. */
  gender?: string;
};

const SEXO_OPTIONS = [
  { id: "F", label: "Feminino — 30 anos de tempo mínimo" },
  { id: "M", label: "Masculino — 35 anos de tempo mínimo" },
];

/** "Feminino" / "FEMININO" → "F". Qualquer outra coisa fica em branco. */
const sexoFromGender = (gender?: string): Sexo | "" => {
  if (!gender) return "";
  const normalized = gender.toUpperCase();
  if (normalized.startsWith("F")) return "F";
  if (normalized.startsWith("M")) return "M";
  return "";
};

export function CnisSection({ birthDate, gender }: CnisSectionProps) {
  const [text, setText] = useState("");
  const [document, setDocument] = useState<CnisDocument | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [fatores, setFatores] = useState<StoredFatores | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [sexo, setSexo] = useState<Sexo | "">(() => sexoFromGender(gender));
  const [nascimento, setNascimento] = useState(birthDate ?? "");
  const [dataBase, setDataBase] = useState(todayIso);

  // `localStorage` só existe no cliente; ler no efeito evita divergência
  // entre o HTML do servidor e o primeiro render.
  useEffect(() => setFatores(loadFatores()), []);

  // O cadastro é a fonte da verdade enquanto a pessoa não mexer aqui.
  useEffect(() => {
    if (birthDate) setNascimento(birthDate);
  }, [birthDate]);
  useEffect(() => {
    const derived = sexoFromGender(gender);
    if (derived) setSexo(derived);
  }, [gender]);

  const analisar = (source: string) => {
    const parsed = parseCnis(source);
    setDocument(parsed);

    // O CNIS traz a data de nascimento; ela vale mais que o palpite do
    // cadastro, mas só preenche o que estiver vazio — sobrescrever o que a
    // pessoa digitou seria trocar a decisão dela pela do documento.
    if (parsed.dataNascimento && !nascimento) setNascimento(parsed.dataNascimento);

    const erros = parsed.issues.filter((issue) => issue.severity === "error");
    if (erros.length > 0) notificationCenter.warning(erros[0].message);
  };

  const handleFile = async (file: File) => {
    setIsReading(true);
    try {
      const extracted = await readCnisFile(file);
      setText(extracted);
      analisar(extracted);
    } catch (error) {
      if (error instanceof PdfSupportError) {
        notificationCenter.warning(error.message);
      } else {
        notificationCenter.danger(
          "Não foi possível ler o arquivo. Se o PDF veio de digitalização, ele não tem camada de texto.",
        );
      }
    } finally {
      setIsReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const tempo = useMemo(
    () => (document ? computeTempo(document, dataBase) : null),
    [document, dataBase],
  );

  const analise = useMemo(() => {
    if (!document || !tempo || !sexo || !nascimento) return null;

    const input = {
      sexo,
      dataNascimento: nascimento,
      dataBase,
      diasContribuicao: tempo.tempo.totalDias,
      diasEm13112019: tempoAte(document, DATA_EC103).totalDias,
      carencia: tempo.carencia,
    };

    return {
      regras: avaliarRegras(input),
      direitoAdquirido: temDireitoAdquirido(input),
    };
  }, [document, tempo, sexo, nascimento, dataBase]);

  /**
   * A RMI só entra quando **todas** as competências têm fator. Calcular a
   * média com as que têm daria um número menor e plausível — exatamente o tipo
   * de erro que ninguém pega olhando a tela.
   */
  const media = useMemo(() => {
    if (!document || !fatores) return null;
    return calcularMedia(document, fatores.fatores);
  }, [document, fatores]);

  const rendaPorRegra = useMemo(() => {
    if (!media || media.faltando.length > 0 || media.salarios.length === 0) return undefined;
    if (!analise || !sexo || !tempo) return undefined;

    const anos = tempo.tempo.totalDias / 365;
    const result: Record<string, RmiResult> = {};
    for (const regra of analise.regras) {
      result[regra.id] = calcularRmi(
        media.media,
        anos,
        sexo,
        RENDA_POR_REGRA[regra.id] ?? "coeficiente",
      );
    }
    return result;
  }, [media, analise, sexo, tempo]);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-secondary/40 bg-light-secondary px-4 py-3 text-sm">
        <p className="font-medium text-primary">Ferramenta de triagem</p>
        <p className="mt-1 text-gray-100">
          Lê o extrato e adianta a contagem. Não trata tempo especial, rural,
          professor, deficiência nem servidor público, e não decide indicador de
          pendência — esses dependem de prova, não de conta. Confira os vínculos
          contra o PDF antes de usar o resultado.
        </p>
      </div>

      {/* ── Entrada ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            onPress={() => fileInput.current?.click()}
            isDisabled={isReading}
          >
            {isReading ? "Lendo..." : "Enviar CNIS (PDF)"}
          </Button>
          <p className="text-xs text-gray-100">
            Use a versão com <strong>Relações Previdenciárias e Remunerações</strong>,
            baixada do Meu INSS. O extrato simples não traz as datas dos vínculos.
          </p>
        </div>

        <TextAreaField
          label="Ou cole o texto do extrato"
          value={text}
          onChange={setText}
          rows={5}
          placeholder="Abra o PDF, selecione tudo (Ctrl+A), copie e cole aqui."
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onPress={() => analisar(text)}
            isDisabled={!text.trim()}
          >
            Analisar texto
          </Button>
        </div>
      </div>

      {document && (
        <>
          {document.issues.length > 0 && (
            <ul className="flex flex-col gap-2">
              {document.issues.map((issue, index) => (
                <li
                  key={index}
                  className={`rounded-xl px-4 py-3 text-sm ${
                    issue.severity === "error"
                      ? "border border-danger/30 bg-danger/5 text-primary"
                      : "border border-black/5 bg-light-gray/40 text-gray-100"
                  }`}
                >
                  {issue.message}
                  {issue.excerpt && (
                    <code className="mt-1 block truncate text-xs text-gray-100/70">
                      {issue.excerpt}
                    </code>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* ── Parâmetros do cálculo ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField
              label="Sexo (para o tempo mínimo)"
              options={SEXO_OPTIONS}
              selectedKey={sexo || null}
              onSelectionChange={(key) => setSexo(key as Sexo)}
              placeholder="Selecione"
              isRequired
            />
            <DatePickerField
              label="Data de nascimento"
              value={nascimento}
              onChange={setNascimento}
              isRequired
            />
            <DatePickerField
              label="Data do cálculo (DER)"
              value={dataBase}
              onChange={setDataBase}
              allowFuture
            />
          </div>

          {tempo && <CnisResumo document={document} tempo={tempo} />}

          {analise ? (
            <CnisRegras
              regras={analise.regras}
              direitoAdquirido={analise.direitoAdquirido}
              rendaPorRegra={rendaPorRegra}
            />
          ) : (
            <p className="rounded-xl border border-black/5 bg-light-gray/40 px-4 py-3 text-sm text-gray-100">
              Informe sexo e data de nascimento para avaliar as regras — quatro
              das cinco dependem da idade.
            </p>
          )}

          {/* ── RMI ── */}
          <div className="flex flex-col gap-3">
            <CnisFatores stored={fatores} onChange={setFatores} />

            {media && media.faltando.length > 0 && (
              <div className="rounded-xl border border-black/5 bg-light-gray/40 px-4 py-3 text-sm">
                <p className="font-medium text-primary">
                  A RMI não foi calculada
                </p>
                <p className="mt-1 text-gray-100">
                  Faltam fatores de atualização para {media.faltando.length}{" "}
                  competências ({media.faltando.slice(0, 6).join(", ")}
                  {media.faltando.length > 6 && "…"}). Calcular só com as que
                  existem daria uma média menor e de aparência correta.
                </p>
              </div>
            )}

            {media && media.faltando.length === 0 && media.salarios.length > 0 && (
              <div className="rounded-xl border border-black/5 bg-white px-4 py-3 text-sm">
                <p className="text-primary">
                  Média de {media.salarios.length} salários corrigidos:{" "}
                  <strong className="font-medium">{formatBRL(media.media)}</strong>
                </p>
                {media.descartadasAnteriores > 0 && (
                  <p className="mt-1 text-xs text-gray-100">
                    {media.descartadasAnteriores} competências anteriores a
                    07/1994 ficaram de fora, como manda a EC 103.
                  </p>
                )}
                {fatores?.meta.referencia && (
                  <p className="mt-1 text-xs text-gray-100">
                    Valores corrigidos para {fatores.meta.referencia}.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
