export enum MaritalStatus {
  Single = 1,      // Solteiro
  Married = 2,     // Casado
  Divorced = 3,    // Divorciado
  Widowed = 4,     // Viúvo
  StableUnion = 5, // União Estável
}

export const MaritalStatusText: Record<MaritalStatus, string> = {
  [MaritalStatus.Single]: "Solteiro",
  [MaritalStatus.Married]: "Casado",
  [MaritalStatus.Divorced]: "Divorciado",
  [MaritalStatus.Widowed]: "Viúvo",
  [MaritalStatus.StableUnion]: "União Estável",
};
