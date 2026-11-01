import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";

/** GET /clients/{clientId}/record — a ficha completa do cliente em PDF. */
export const downloadClientRecord = async (clientId: string): Promise<Blob> => {
  const { data } = await axiosInstance.get<Blob>(endpoints.CLIENT_RECORD.DOWNLOAD(clientId), {
    responseType: "blob",
  });
  return data;
};
