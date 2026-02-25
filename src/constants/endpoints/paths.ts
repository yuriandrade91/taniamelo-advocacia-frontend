// prefer NEXT_PUBLIC_API_URL (defined in .env); provide a safe fallback for local dev
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_BASE_PATH_V1 = "v1";

const endpoints = {
  AUTH: {
    POST_LOGIN: `${API_BASE_URL}/login`,
  },
  URL_CLIENTS: {
    CLIENT: `${API_BASE_URL}/${API_BASE_PATH_V1}/clients`,
    BY_ID: (client_id: string) =>
      `${API_BASE_URL}/${API_BASE_PATH_V1}/clients/${client_id}`,
    SITUATION_HISTORY: (client_id: string) =>
      `${API_BASE_URL}/${API_BASE_PATH_V1}/clients/${client_id}/history`,
  },
};

export default endpoints;
