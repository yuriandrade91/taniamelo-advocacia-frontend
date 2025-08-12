const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const API_BASE_PATH_V1 = "/v1";

const endpoints = {
  AUTH: {
    POST_LOGIN: `${API_BASE_URL}/login`,
  },
  CLIENTS: {
    URL_CLIENTS: `${API_BASE_URL}${API_BASE_PATH_V1}/client`,
    CLIENT_BY_ID: (client_id: string | number) => `${API_BASE_URL}${API_BASE_PATH_V1}/client/${client_id}`,
  },
};

export default endpoints;