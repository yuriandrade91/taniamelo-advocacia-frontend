import endpoints from "@/constants/endpoints/endpoints";
import axios from "axios";

export const clients = async () => {
  const response = await axios.get(endpoints.CLIENTS.URL_CLIENTS);
  return response.data;
};

export const clientById = async (clientId: string | number) => {
  const response = await axios.get(
    `${endpoints.CLIENTS.URL_CLIENTS}/${clientId}`
  );
  return response.data;
};
