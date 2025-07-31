// Validadores reutilizáveis para formulários
// Cada função retorna uma string de erro ou null se válido

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim() === "") {
    return `O campo ${fieldName} é obrigatório.`;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) return null;
  const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailRegex.test(value)
    ? null
    : "E-mail inválido.";
}

export function validateCPF(value: string): string | null {
  if (!value) return null;
  // Remove non-digits
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11) return "CPF deve ter 11 dígitos.";
  // Validação básica de CPF
  let sum = 0;
  let rest;
  if (/^(\d)\1+$/.test(cpf)) return "CPF inválido.";
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return "CPF inválido.";
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return "CPF inválido.";
  return null;
}

export function validateRG(value: string): string | null {
  if (!value) return null;
  // RG geralmente tem de 7 a 9 dígitos
  const rg = value.replace(/\D/g, "");
  if (rg.length < 7 || rg.length > 9) return "RG inválido.";
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value) return null;
  const phone = value.replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 11) return "Telefone inválido.";
  return null;
}

export function validateNIT(value: string): string | null {
  if (!value) return null;
  const nit = value.replace(/\D/g, "");
  if (nit.length !== 11) return "NIT/PIS deve ter 11 dígitos.";
  return null;
}

export function validateCTPS(value: string): string | null {
  if (!value) return null;
  const ctps = value.replace(/\D/g, "");
  if (ctps.length < 7 || ctps.length > 8) return "CTPS inválida.";
  return null;
}

export function validateDate(value: string): string | null {
  if (!value) return null;
  // Aceita yyyy-mm-dd ou dd/mm/yyyy
  const dateRegex = /^(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})$/;
  return dateRegex.test(value) ? null : "Data inválida.";
}

export function validateSwitch(value: boolean, fieldName: string): string | null {
  if (typeof value !== "boolean") {
    return `O campo ${fieldName} deve ser verdadeiro ou falso.`;
  }
  return null;
}
