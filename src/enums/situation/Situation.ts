export enum Situation {
  Age = 1,
  ContributionTime = 2,
  PermanentDisability = 3,
  Special = 4,
  Disability = 5,
  TeacherContributionTime = 6,
  Invalidity = 7,
}

export const SituationText: Record<Situation, string> = {
  [Situation.Age]: "Aposentadoria por idade",
  [Situation.ContributionTime]: "Aposentadoria por tempo de contribuição",
  [Situation.PermanentDisability]: "Aposentadoria por incapacidade permanente",
  [Situation.Special]: "Aposentadoria especial",
  [Situation.Disability]: "Aposentadoria por deficiência",
  [Situation.TeacherContributionTime]: "Aposentadoria por tempo de contribuição do professor",
  [Situation.Invalidity]: "Aposentadoria por invalidez",
};

export const RetirementTypeOptions: { id: Situation; label: string }[] = [
  { id: Situation.Age, label: SituationText[Situation.Age] },
  { id: Situation.ContributionTime, label: SituationText[Situation.ContributionTime] },
  { id: Situation.PermanentDisability, label: SituationText[Situation.PermanentDisability] },
  { id: Situation.Special, label: SituationText[Situation.Special] },
  { id: Situation.Disability, label: SituationText[Situation.Disability] },
  { id: Situation.TeacherContributionTime, label: SituationText[Situation.TeacherContributionTime] },
  { id: Situation.Invalidity, label: SituationText[Situation.Invalidity] },
];
