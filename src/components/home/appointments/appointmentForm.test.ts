import {
  CalendarDateTime,
  getLocalTimeZone,
} from "@internationalized/date";
import { describe, expect, it } from "vitest";
import {
  EMPTY_APPOINTMENT_FORM,
  type AppointmentFormValues,
  isStartInPast,
  shiftAfter,
  toRequest,
  validateAppointmentForm,
} from "./appointmentForm";

/**
 * Estes testes travam o contrato com o backend: cada regra aqui espelha uma
 * constraint de `AppointmentRequestDTO` ou uma validação do
 * `AppointmentService`. Se o backend mudar, é aqui que deve quebrar primeiro.
 */

const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new CalendarDateTime(y, m, d, h, min);

/** Formulário mínimo válido, com datas no futuro. */
const validForm = (over: Partial<AppointmentFormValues> = {}) => {
  const nextYear = new Date().getFullYear() + 1;
  return {
    ...EMPTY_APPOINTMENT_FORM,
    title: "Entrevista com Yuri",
    type: "ENTREVISTA",
    startAt: at(nextYear, 8, 20, 14, 30),
    endAt: at(nextYear, 8, 20, 15, 30),
    clientName: "Yuri Andrade",
    ...over,
  } satisfies AppointmentFormValues;
};

describe("validateAppointmentForm — campos obrigatórios do backend", () => {
  it("aceita o formulário mínimo válido", () => {
    expect(validateAppointmentForm(validForm(), { isEditing: false })).toEqual(
      {},
    );
  });

  it("exige título (@NotBlank)", () => {
    const errors = validateAppointmentForm(validForm({ title: "   " }), {
      isEditing: false,
    });
    expect(errors.title).toBeDefined();
  });

  it("exige tipo (@NotNull)", () => {
    const errors = validateAppointmentForm(validForm({ type: "" }), {
      isEditing: false,
    });
    expect(errors.type).toBeDefined();
  });

  it("exige início e término (@NotNull)", () => {
    const errors = validateAppointmentForm(
      validForm({ startAt: null, endAt: null }),
      { isEditing: false },
    );
    expect(errors.startAt).toBeDefined();
    expect(errors.endAt).toBeDefined();
  });

  it("rejeita término anterior ou igual ao início (@AssertTrue)", () => {
    const nextYear = new Date().getFullYear() + 1;
    const errors = validateAppointmentForm(
      validForm({
        startAt: at(nextYear, 8, 20, 15, 0),
        endAt: at(nextYear, 8, 20, 14, 0),
      }),
      { isEditing: false },
    );
    expect(errors.endAt).toBeDefined();
  });
});

describe("validateAppointmentForm — regras do frontend", () => {
  it("exige justificativa apenas na edição", () => {
    const form = validForm({ justification: "" });
    expect(
      validateAppointmentForm(form, { isEditing: false }).justification,
    ).toBeUndefined();
    expect(
      validateAppointmentForm(form, { isEditing: true }).justification,
    ).toBeDefined();
  });

  it("exige cliente por vínculo ou por nome livre", () => {
    expect(
      validateAppointmentForm(validForm({ clientName: "" }), {
        isEditing: false,
      }).clientName,
    ).toBeDefined();

    // Com clientId vinculado, o nome livre deixa de ser exigido.
    expect(
      validateAppointmentForm(
        validForm({ clientName: "", clientId: "uuid-1" }),
        { isEditing: false },
      ).clientName,
    ).toBeUndefined();
  });

  it("rejeita URL de reunião malformada", () => {
    expect(
      validateAppointmentForm(validForm({ meetingUrl: "meet.google" }), {
        isEditing: false,
      }).meetingUrl,
    ).toBeDefined();

    expect(
      validateAppointmentForm(
        validForm({ meetingUrl: "https://meet.google.com/abc" }),
        { isEditing: false },
      ).meetingUrl,
    ).toBeUndefined();
  });
});

describe("isStartInPast", () => {
  it("detecta início no passado", () => {
    expect(isStartInPast(validForm({ startAt: at(2020, 1, 1, 10) }))).toBe(true);
  });

  it("não acusa início no futuro", () => {
    expect(isStartInPast(validForm())).toBe(false);
  });

  it("é falso quando não há início", () => {
    expect(isStartInPast(validForm({ startAt: null }))).toBe(false);
  });
});

describe("toRequest", () => {
  it("omite campos opcionais vazios do JSON em vez de mandar string vazia", () => {
    // Importa porque o PUT é substituição completa: `location: ""` apagaria
    // o valor gravado no backend.
    //
    // A asserção é sobre o JSON serializado, não sobre a presença da chave no
    // objeto: `{ location: undefined }` ainda "tem" a propriedade em JS, mas
    // `JSON.stringify` a descarta — e é isso que trafega na requisição.
    const body = toRequest(validForm(), { isEditing: false });
    const serialized = JSON.parse(JSON.stringify(body));

    expect(serialized).not.toHaveProperty("location");
    expect(serialized).not.toHaveProperty("meetingUrl");
    expect(serialized).not.toHaveProperty("description");
    expect(serialized.title).toBe("Entrevista com Yuri");
  });

  it("envia startAt/endAt em ISO-8601", () => {
    const body = toRequest(validForm(), { isEditing: false });
    expect(body.startAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.endAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(body.endAt).getTime()).toBeGreaterThan(
      new Date(body.startAt).getTime(),
    );
  });

  it("não envia clientName quando há clientId (o backend ignoraria)", () => {
    const body = toRequest(
      validForm({ clientId: "uuid-1", clientName: "Fulano" }),
      { isEditing: false },
    );
    expect(body.clientId).toBe("uuid-1");
    expect(body.clientName).toBeUndefined();
  });

  it("só envia justificativa na edição", () => {
    const form = validForm({ justification: "Cliente remarcou" });
    expect(
      toRequest(form, { isEditing: false }).justification,
    ).toBeUndefined();
    expect(toRequest(form, { isEditing: true }).justification).toBe(
      "Cliente remarcou",
    );
  });

  it("falha alto quando chamado com formulário inválido", () => {
    // Contrato: validar antes. Chamar sem validar é erro de programação.
    expect(() =>
      toRequest(validForm({ startAt: null }), { isEditing: false }),
    ).toThrow();
  });
});

describe("shiftAfter — reagendar logo após o conflito", () => {
  /**
   * ISO gerado a partir do horário local, e não uma string fixa em Z: o que
   * `shiftAfter` recebe é o `endAt` que o backend devolveu (um `Instant`), e a
   * asserção precisa valer em qualquer fuso onde a suíte rodar.
   */
  const isoOf = (dt: CalendarDateTime) =>
    dt.toDate(getLocalTimeZone()).toISOString();

  const nextYear = new Date().getFullYear() + 1;

  it("move o início para o fim do conflito preservando a duração", () => {
    // 14:30 -> 15:30 (1h); conflito termina 16:00.
    const form = validForm({
      startAt: at(nextYear, 8, 20, 14, 30),
      endAt: at(nextYear, 8, 20, 15, 30),
    });

    const moved = shiftAfter(form, isoOf(at(nextYear, 8, 20, 16, 0)));

    expect(moved.startAt?.toString()).toBe(at(nextYear, 8, 20, 16, 0).toString());
    expect(moved.endAt?.toString()).toBe(at(nextYear, 8, 20, 17, 0).toString());
  });

  it("preserva a duração mesmo quando o compromisso cruza a meia-noite", () => {
    // 23:00 -> 23:45 (45min); conflito termina 23:50 -> vira 23:50 -> 00:35 do dia seguinte.
    const form = validForm({
      startAt: at(nextYear, 8, 20, 23, 0),
      endAt: at(nextYear, 8, 20, 23, 45),
    });

    const moved = shiftAfter(form, isoOf(at(nextYear, 8, 20, 23, 50)));

    expect(moved.startAt?.toString()).toBe(at(nextYear, 8, 20, 23, 50).toString());
    expect(moved.endAt?.toString()).toBe(at(nextYear, 8, 21, 0, 35).toString());
  });

  it("não mexe nos demais campos do formulário", () => {
    const form = validForm({ title: "Perícia", clientId: "uuid-1" });
    const moved = shiftAfter(form, isoOf(at(nextYear, 8, 20, 16, 0)));

    expect(moved.title).toBe("Perícia");
    expect(moved.clientId).toBe("uuid-1");
    expect(moved.type).toBe(form.type);
  });

  it("é no-op quando falta início ou término", () => {
    const iso = isoOf(at(nextYear, 8, 20, 16, 0));
    const semInicio = validForm({ startAt: null });
    const semFim = validForm({ endAt: null });

    expect(shiftAfter(semInicio, iso)).toBe(semInicio);
    expect(shiftAfter(semFim, iso)).toBe(semFim);
  });

  it("é no-op quando a duração não é positiva", () => {
    // Formulário inconsistente (o usuário ainda não corrigiu o término):
    // deslocar aqui produziria um intervalo invertido em outro horário.
    const invertido = validForm({
      startAt: at(nextYear, 8, 20, 15, 0),
      endAt: at(nextYear, 8, 20, 14, 0),
    });

    expect(shiftAfter(invertido, isoOf(at(nextYear, 8, 20, 16, 0)))).toBe(
      invertido,
    );
  });

  it("é no-op quando o ISO do conflito é inválido ou vazio", () => {
    const form = validForm();

    expect(shiftAfter(form, "")).toBe(form);
    expect(shiftAfter(form, "amanhã de manhã")).toBe(form);
  });
});
