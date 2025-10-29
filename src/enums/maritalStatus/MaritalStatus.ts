export enum MaritalStatus {
  Single = 1,
  Married = 2,
  Divorced = 3,
  Widowed = 4,
  StableUnion = 5,
}

export const MaritalStatusText: Record<MaritalStatus, string> = {
  [MaritalStatus.Single]: "Solteiro",
  [MaritalStatus.Married]: "Casado",
  [MaritalStatus.Divorced]: "Divorciado",
  [MaritalStatus.Widowed]: "Viúvo",
  [MaritalStatus.StableUnion]: "União Estável",
};

export const MaritalStatusOptions: { id: MaritalStatus; label: string }[] = [
  { id: MaritalStatus.Single, label: MaritalStatusText[MaritalStatus.Single] },
  { id: MaritalStatus.Married, label: MaritalStatusText[MaritalStatus.Married] },
  { id: MaritalStatus.Divorced, label: MaritalStatusText[MaritalStatus.Divorced] },
  { id: MaritalStatus.Widowed, label: MaritalStatusText[MaritalStatus.Widowed] },
  { id: MaritalStatus.StableUnion, label: MaritalStatusText[MaritalStatus.StableUnion] },
];
