/**
 * Autenticação — espelha LoginRequestDTO / LoginResponseDTO.
 * O access token vem no corpo; o refresh token fica em cookie httpOnly.
 */

export interface LoginRequest {
  /** Aceita e-mail OU username (o backend resolve os dois). */
  login: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string; // "Bearer"
  expiresInSeconds: number;
  fullName: string;
  email: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}
