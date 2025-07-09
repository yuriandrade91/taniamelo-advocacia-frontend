export enum Role {
  Admin = 1,
  Assistant = 2,
}

export const RoleText: Record<Role, string> = {
  [Role.Admin]: "admin",
  [Role.Assistant]: "assistente",
};
