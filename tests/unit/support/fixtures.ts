import type { ClientDetails, ClientListItem, ClientRequestStageHistory, ClientSituationHistory, UpcomingBirthdayResponse } from "@/interfaces/client/Client.interface";
import type {
  ClientAddressResponse,
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
  ClientInterviewResponse,
  ClientPaymentResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import type { OfficeExpenseResponse } from "@/interfaces/finance/OfficeExpense.interface";
import type { OfficeRevenueResponse } from "@/interfaces/finance/OfficeRevenue.interface";
import { officeToday } from "@/lib/officeClock";
import { todayIso } from "@/lib/period";

/**
 * Dados de exemplo no formato que a API devolve (rótulos PT-BR nos enums).
 * Cada fábrica aceita `overrides` — o teste muda só o que importa para ele.
 */

function shiftDay(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` a `days` dias de hoje (negativo = passado), no fuso da máquina. */
export function isoDay(days: number): string {
  return shiftDay(todayIso(), days);
}

/**
 * Como `isoDay`, mas no dia do escritório (`America/Sao_Paulo`): é o "hoje" da
 * API (o `daysUntil` dos aniversariantes, por exemplo) e o que a tela lê por
 * `useOfficeToday`. Com a máquina em UTC (o CI), entre 21h e meia-noite em
 * Brasília os dois dias diferem, e o fixture de "hoje" virava "amanhã".
 */
export function officeDay(days: number): string {
  return shiftDay(officeToday(), days);
}

/** Instante ISO a `days` dias e na hora `hour` (UTC). */
export const isoInstant = (days: number, hour = 13) => `${isoDay(days)}T${String(hour).padStart(2, "0")}:00:00Z`;

export const client = (overrides: Partial<ClientDetails> = {}): ClientDetails => ({
  id: "c1",
  fullName: "Maria Aparecida da Silva",
  birthDate: "1965-05-20",
  age: 60,
  cpf: "39053344705",
  motherName: "Ana Rosa da Silva",
  mobilePhone: "31988887777",
  gender: "Feminino",
  rg: "MG1234567",
  rgIssuer: "SSP",
  rgIssueDate: "2000-01-10",
  email: "maria@exemplo.com",
  maritalStatus: "Casado(a)",
  benefit: "Aposentadoria por idade",
  situation: "Análise documental",
  requestStage: "Requerimento",
  nitPis: "12345678901",
  profession: "Costureira",
  contributionYears: 20,
  contributionMonths: 3,
  contributionDays: 5,
  nationality: "Brasileira",
  isWhatsapp: true,
  hasDisability: false,
  notes: "Cliente indicada.",
  clientType: "Verificado",
  notBillable: false,
  createdAt: `${isoDay(-30)}T10:00:00Z`,
  updatedAt: `${isoDay(-1)}T10:00:00Z`,
  createdBy: "u1",
  updatedBy: "u1",
  ...overrides,
});

export const clientRow = (overrides: Partial<ClientListItem> = {}): ClientListItem => ({
  id: "c1",
  fullName: "Maria Aparecida da Silva",
  cpf: "39053344705",
  mobilePhone: "31988887777",
  benefit: "Aposentadoria por idade",
  situation: "Análise documental",
  requestStage: "Requerimento",
  clientType: "Verificado",
  notBillable: false,
  createdAt: `${isoDay(-30)}T10:00:00Z`,
  ...overrides,
});

export const address = (overrides: Partial<ClientAddressResponse> = {}): ClientAddressResponse => ({
  id: "a1",
  addressType: "Residencial",
  street: "Rua das Flores",
  addressNumber: "120",
  complement: "Apto 3",
  neighborhood: "Centro",
  city: "Belo Horizonte",
  state: "MG",
  zipCode: "30140000",
  isPrimary: true,
  ...overrides,
});

export const interview = (overrides: Partial<ClientInterviewResponse> = {}): ClientInterviewResponse => ({
  id: "i1",
  occurredAt: `${isoDay(-3)}T14:00:00Z`,
  durationMinutes: 45,
  content: "<p>Conversa inicial sobre o tempo de contribuição.</p>",
  ...overrides,
});

export const document = (overrides: Partial<ClientFileDocumentResponse> = {}): ClientFileDocumentResponse => ({
  id: "d1",
  documentType: "Documentos médicos",
  originalFilename: "laudo.pdf",
  mimeType: "application/pdf",
  fileSizeBytes: 120_000,
  notes: "Laudo de 2024",
  uploadedBy: "u1",
  uploadedAt: `${isoDay(-2)}T10:00:00Z`,
  ...overrides,
});

export const simulation = (overrides: Partial<ClientFileSimulationResponse> = {}): ClientFileSimulationResponse => ({
  id: "s1",
  originalFilename: "simulacao-v1.pdf",
  mimeType: "application/pdf",
  fileSizeBytes: 80_000,
  simulationDate: isoDay(-5),
  version: "v1",
  vinculos: 3,
  isPrincipal: true,
  notes: "Primeira simulação",
  uploadedAt: `${isoDay(-5)}T10:00:00Z`,
  ...overrides,
});

export const clientPayment = (overrides: Partial<ClientPaymentResponse> = {}): ClientPaymentResponse => ({
  id: "p1",
  description: "Honorários parcela 1/3",
  amount: 1500,
  installmentNumber: 1,
  installmentTotal: 3,
  dueDate: isoDay(10),
  status: "Pendente",
  paymentMethod: "Pix",
  overdue: false,
  ...overrides,
});

export const officePayment = (overrides: Partial<OfficePaymentResponse> = {}): OfficePaymentResponse => ({
  ...clientPayment(),
  clientId: "c1",
  clientName: "Maria Aparecida da Silva",
  ...overrides,
});

export const appointment = (overrides: Partial<AppointmentResponse> = {}): AppointmentResponse => ({
  id: "ap1",
  title: "Entrevista inicial",
  type: "Entrevista",
  startAt: isoInstant(1, 13),
  endAt: isoInstant(1, 14),
  modality: "Presencial",
  location: "Escritório",
  meetingUrl: null,
  description: "Levar documentos",
  status: "Agendado",
  clientId: "c1",
  clientName: "Maria Aparecida da Silva",
  createdBy: "u1",
  createdAt: `${isoDay(-1)}T10:00:00Z`,
  ...overrides,
});

export const expense = (overrides: Partial<OfficeExpenseResponse> = {}): OfficeExpenseResponse => ({
  id: "e1",
  description: "Aluguel da sala",
  amount: 2500,
  category: "Aluguel e condomínio",
  status: "Pendente",
  paymentMethod: "Boleto",
  dueDate: isoDay(5),
  overdue: false,
  supplier: "Imobiliária Centro",
  notes: "Vence todo dia 5",
  ...overrides,
});

export const revenue = (overrides: Partial<OfficeRevenueResponse> = {}): OfficeRevenueResponse => ({
  id: "r1",
  description: "Honorários de consulta",
  amount: 800,
  status: "Pago",
  paymentMethod: "Pix",
  dueDate: isoDay(-2),
  paidDate: isoDay(-2),
  overdue: false,
  clientId: "c1",
  clientName: "Maria Aparecida da Silva",
  ...overrides,
});

export const situationEntry = (overrides: Partial<ClientSituationHistory> = {}): ClientSituationHistory => ({
  id: "h1",
  currentSituation: "Análise documental",
  previousSituation: "Formulário preenchido",
  changedAt: `${isoDay(-4)}T10:00:00Z`,
  changedByUserId: "u1",
  ...overrides,
});

export const stageEntry = (overrides: Partial<ClientRequestStageHistory> = {}): ClientRequestStageHistory => ({
  id: "rs1",
  currentStage: "Requerimento",
  previousStage: null,
  changedAt: `${isoDay(-4)}T10:00:00Z`,
  changedByUserId: "u1",
  diasNaEtapaAnterior: null,
  justification: null,
  ...overrides,
});

export const birthday = (overrides: Partial<UpcomingBirthdayResponse> = {}): UpcomingBirthdayResponse => ({
  clientId: "c1",
  fullName: "Maria Aparecida da Silva",
  birthDate: "1965-05-20",
  nextBirthday: officeDay(3),
  daysUntil: 3,
  turningAge: 61,
  mobilePhone: "31988887777",
  isWhatsapp: true,
  ...overrides,
});

export const users = [
  { id: "u1", fullName: "Tânia Melo", username: "tania", role: "ADMIN", active: true },
  { id: "u2", fullName: "João Atendente", username: "joao", role: "STAFF", active: true },
];

export const summary = (overrides: Record<string, number> = {}) => ({
  overdueAmount: 300,
  overdueCount: 1,
  upcomingAmount: 1500,
  upcomingCount: 2,
  paidAmount: 4200,
  paidCount: 5,
  totalAmount: 6000,
  ...overrides,
});
