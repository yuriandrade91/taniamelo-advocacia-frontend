import { envelope, onApi, page } from "./fakeApi";
import * as fx from "./fixtures";

/**
 * Um escritório com dados em todas as rotas de leitura: uma cliente completa,
 * compromissos, parcelas, despesas e receitas. As telas montam cheias, como
 * no uso real; o teste sobrescreve (`onApi` depois daqui) o que quiser mudar.
 *
 * A ordem importa: a rota registrada por último vence quando duas casam, então
 * as genéricas vêm antes das específicas.
 */
export function seedOffice() {
  // ── clientes ──
  onApi("get", "/clients", page([fx.clientRow(), fx.clientRow({ id: "c2", fullName: "José Pereira", clientType: "Potencial", situation: "Formulário preenchido", requestStage: null })], 2));
  onApi("get", /\/clients\/c\d+$/, ({ url }) => envelope(fx.client({ id: url.split("/").pop()! })));
  onApi("get", "/upcoming-birthdays", envelope([fx.birthday(), fx.birthday({ clientId: "c2", fullName: "José Pereira", daysUntil: 0, nextBirthday: fx.isoDay(0), turningAge: 70, isWhatsapp: false })]));
  onApi("get", "/addresses", page([fx.address()]));
  onApi("get", "/interviews", page([fx.interview()]));
  onApi("get", "/disability-periods", envelope([]));
  onApi("get", "/situation-history", page([fx.situationEntry()]));
  onApi("get", "/request-stage-history", page([fx.stageEntry()]));
  onApi("get", "/files/documents", envelope([fx.document()]));
  onApi("get", "/files/simulations", envelope([fx.simulation()]));
  onApi("get", "/inss-password", envelope({ inssPassword: "senha-do-inss" }));

  // ── usuários ──
  onApi("get", "/users", envelope(fx.users));
  onApi("get", "/users/me", envelope({ ...fx.users[0], email: "tania@exemplo.com" }));

  // ── agenda ──
  onApi("get", "/appointments", page([fx.appointment(), fx.appointment({ id: "ap2", title: "Perícia no INSS", type: "Perícia", startAt: fx.isoInstant(2, 15), endAt: fx.isoInstant(2, 16), modality: "Online", meetingUrl: "https://meet.exemplo.com/x" })], 2));
  onApi("get", "/appointments/summary", envelope([{ year: Number(fx.isoDay(0).slice(0, 4)), month: Number(fx.isoDay(0).slice(5, 7)), count: 2 }]));
  onApi("get", "/appointments/timeline", envelope([{ month: fx.isoDay(0).slice(0, 7), totalCount: 4, scheduledCount: 2, completedCount: 1, cancelledCount: 1 }]));
  onApi("get", "/appointments/conflicts", envelope([]));

  // ── financeiro ──
  onApi("get", "/payments", page([fx.officePayment(), fx.officePayment({ id: "p3", status: "Pendente", dueDate: fx.isoDay(-3), overdue: true, installmentNumber: 2 })], 2));
  onApi("get", "/payments/summary", envelope(fx.summary()));
  onApi("get", "/payments/timeline", envelope([{ month: fx.isoDay(0).slice(0, 7), overdueAmount: 300, upcomingAmount: 1500, paidAmount: 4200 }]));
  onApi("get", "/expenses", page([fx.expense(), fx.expense({ id: "e2", description: "Licença do sistema", category: "Software e assinaturas", status: "Pago", paidDate: fx.isoDay(-1), amount: 199 })], 2));
  onApi("get", /\/expenses\/e\d+$/, ({ url }) => envelope(fx.expense({ id: url.split("/").pop()! })));
  onApi("get", "/expenses/summary", envelope({ ...fx.summary(), byCategory: [{ category: "Aluguel e condomínio", amount: 2500 }, { category: "Software e assinaturas", amount: 199 }] }));
  onApi("get", "/expenses/timeline", envelope([{ month: fx.isoDay(0).slice(0, 7), overdueAmount: 0, upcomingAmount: 2500, paidAmount: 199 }]));
  onApi("get", "/revenues", page([fx.revenue(), fx.revenue({ id: "r2", description: "Êxito", status: "Pendente", paidDate: undefined, dueDate: fx.isoDay(7), amount: 3000 })], 2));
  onApi("get", /\/revenues\/r\d+$/, ({ url }) => envelope(fx.revenue({ id: url.split("/").pop()! })));
  onApi("get", "/revenues/summary", envelope(fx.summary()));
  onApi("get", "/revenues/timeline", envelope([{ month: fx.isoDay(0).slice(0, 7), overdueAmount: 0, upcomingAmount: 3000, paidAmount: 800 }]));

  // Por último: `/payments` acima casaria também a rota de parcelas do cliente.
  onApi("get", /\/clients\/c\d+\/payments/, page([fx.clientPayment(), fx.clientPayment({ id: "p2", installmentNumber: 2, status: "Pago", paidDate: fx.isoDay(-1) })]));
  onApi("get", /\/clients\/c\d+\/payments\/p\d+$/, ({ url }) => envelope(fx.clientPayment({ id: url.split("/").pop()! })));
}
