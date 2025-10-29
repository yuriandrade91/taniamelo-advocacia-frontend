export interface ClientRequest {
  full_name: string;
  birth_date: string;
  marital_status_id: number;
  cpf: string;
  rg: string;
  mother_name: string;
  email: string;
  mobile_phone: string;
  reference_phone: string;
  reference_responsible: string;
  benefit_id: number;
  situation_id: number;
  benefit_number: string;
  nit_pis: string;
  profession: string;
  ctps: string;
  ctps_series: string;
  inss_password: string;
  contribution_time: number;
  created_by?: number;
  non_billable: boolean;
}
