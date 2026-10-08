/**
 * O relógio do escritório: que dia é **lá**, não no computador de quem abre.
 *
 * Espelha o `OfficeClock` do backend (`America/Sao_Paulo`). Existe porque as
 * respostas do servidor que falam em "hoje" — o `daysUntil` dos
 * aniversariantes, por exemplo — contam no fuso do escritório. Se a tela
 * contasse no fuso do navegador, quem abre a Home de outro fuso (ou com o
 * relógio do sistema em UTC) veria a virada do dia horas antes ou depois do
 * servidor, e as duas contas discordariam perto da meia-noite.
 *
 * Fixo, pelo mesmo motivo do backend: o escritório é um só. Quando houver
 * outro fuso, ele vem do tenant e muda aqui, num lugar só.
 */
export const OFFICE_TIME_ZONE = "America/Sao_Paulo";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Folga depois da meia-noite antes de reler o dia. Um timer pode disparar
 * alguns milissegundos antes do previsto; sem a folga, ele leria ainda o dia
 * anterior e só agendaria a próxima leitura para dali a 24 horas.
 */
const ROLLOVER_MARGIN_MS = 1_000;

/**
 * Um formatador só: criar `Intl.DateTimeFormat` é caro, e este é chamado a
 * cada virada de dia e a cada volta à aba. `hourCycle: "h23"` porque alguns
 * motores escrevem a meia-noite como "24" com `hour12: false`.
 */
const officeParts = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsOf(now: Date) {
  const parts: Record<string, string> = {};
  for (const { type, value } of officeParts.formatToParts(now)) parts[type] = value;
  return parts;
}

/** Hoje no escritório, em ISO (`yyyy-MM-dd`). */
export function officeToday(now: Date = new Date()): string {
  const { year, month, day } = partsOf(now);
  return `${year}-${month}-${day}`;
}

/**
 * Quanto falta para o próximo dia começar no escritório, mais a folga de
 * `ROLLOVER_MARGIN_MS` — o atraso certo para um `setTimeout` que precisa
 * acordar já no dia novo.
 */
export function msUntilNextOfficeDay(now: Date = new Date()): number {
  const { hour, minute, second } = partsOf(now);
  const elapsed =
    ((Number(hour) * 60 + Number(minute)) * 60 + Number(second)) * 1000 +
    now.getMilliseconds();
  return Math.max(DAY_MS - elapsed, 0) + ROLLOVER_MARGIN_MS;
}
