export interface Clients {
  id?: string;
  age?: number;
  benefit: string;
  beneficiaryNumber: string;
  birthDate: string;
  contributionTime: number;
  cpf: string;
  createdAt?: string;
  createdBy?: string | null;
  ctps: string;
  ctpsSeries: string;
  email: string;
  firstName?: string;
  fullName: string;
  gender: string;
  inssPassword: string;
  lastName?: string;
  maritalStatus: string;
  mobilePhone: string;
  motherName: string;
  nitPis: string;
  notBillable: boolean;
  profession: string;
  referencePhone: string;
  referenceResponsible: string;
  rg: string;
  situation: string;
  updatedAt?: string;
}

export interface ClientFilterOptions {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  benefitType?: string[];
  situation?: string[];
  createdFrom?: string;
  createdTo?: string;
}