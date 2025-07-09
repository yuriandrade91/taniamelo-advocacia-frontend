const API_BASE_PATH_V1 = "/api/v1";

const endpoints = {
  AUTH: {
    POST_LOGIN: `${API_BASE_PATH_V1}/login`,
  },
  CLIENTS: {
    GET_CLIENTS: `${API_BASE_PATH_V1}/clients`,
    POST_CLIENTS: `${API_BASE_PATH_V1}/clients`,
    GET_CLIENT_BY_ID: (id: string | number) => `${API_BASE_PATH_V1}/clients/${id}`,
    PUT_CLIENT_BY_ID: (id: string | number) => `${API_BASE_PATH_V1}/clients/${id}`,
    DELETE_CLIENT_BY_ID: (id: string | number) => `${API_BASE_PATH_V1}/clients/${id}`,
  }
};

export default endpoints;
