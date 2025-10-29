export enum Benefits {
  FormFilled = 1,
  DocumentAnalysis = 2,
  PlanningInProgress = 3,
  PlanningCompleted = 4,
  FutureBenefit = 5,
  BenefitCompleted = 6,
}

// Labels to show in the form select. Use these for UI.
export const BenefitLabel: Record<Benefits, string> = {
  [Benefits.FormFilled]: "Formulário preenchido",
  [Benefits.DocumentAnalysis]: "Análise documental",
  [Benefits.PlanningInProgress]: "Planejamento em execução",
  [Benefits.PlanningCompleted]: "Planejamento concluído",
  [Benefits.FutureBenefit]: "Benefício futuro",
  [Benefits.BenefitCompleted]: "Benefício concluído",
};

// Options array convenient for mapping into select components.
export const IntendedBenefitOptions: { id: Benefits; label: string }[] = [
  { id: Benefits.FormFilled, label: BenefitLabel[Benefits.FormFilled] },
  { id: Benefits.DocumentAnalysis, label: BenefitLabel[Benefits.DocumentAnalysis] },
  { id: Benefits.PlanningInProgress, label: BenefitLabel[Benefits.PlanningInProgress] },
  { id: Benefits.PlanningCompleted, label: BenefitLabel[Benefits.PlanningCompleted] },
  { id: Benefits.FutureBenefit, label: BenefitLabel[Benefits.FutureBenefit] },
  { id: Benefits.BenefitCompleted, label: BenefitLabel[Benefits.BenefitCompleted] },
];