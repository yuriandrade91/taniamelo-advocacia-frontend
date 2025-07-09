export enum RetirementType {
  Age = 1, // Aposentadoria por idade
  ContributionTime = 2, // Aposentadoria por tempo de contribuição
  PermanentDisability = 3, // Aposentadoria por incapacidade permanente
  Special = 4, // Aposentadoria especial
  Disability = 5, // Aposentadoria por deficiência
  TeacherContributionTime = 6, // Aposentadoria por tempo de contribuição do professor
  Invalidity = 7, // Aposentadoria por invalidez
}

export const RetirementTypeText: Record<RetirementType, string> = {
  [RetirementType.Age]: "Aposentadoria por idade",
  [RetirementType.ContributionTime]: "Aposentadoria por tempo de contribuição",
  [RetirementType.PermanentDisability]: "Aposentadoria por incapacidade permanente",
  [RetirementType.Special]: "Aposentadoria especial",
  [RetirementType.Disability]: "Aposentadoria por deficiência",
  [RetirementType.TeacherContributionTime]: "Aposentadoria por tempo de contribuição do professor",
  [RetirementType.Invalidity]: "Aposentadoria por invalidez",
};
