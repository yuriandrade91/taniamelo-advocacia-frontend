import httpMessages from "@/constants/messages/httpMessages";
import { addToast } from "@heroui/toast";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  // withCredentials: true,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
  timeout: 10000,
});

axiosInstance.interceptors.response.use(
  (response) => {
    const status = response.status;
    const method = response.config.method;
    const message = httpMessages[status as keyof typeof httpMessages];
    if (method === "put") {
      addToast({
        title: response.data?.message ?? "Cliente atualizado!",
        description: "Verifique as informações atualizadas.",
        color: "success",
      });
    } else if (method === "delete") {
      addToast({
        title: response.data?.message ?? "Cliente removido!",
        description: "Verifique a lista de clientes.",
        color: "success",
      });
    } else if (message) {
      addToast({
        title: message.title,
        description: message.description,
        color: "success",
        timeout: 5000,
        shouldShowTimeoutProgress: true,
      });
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = httpMessages[status as keyof typeof httpMessages];
      addToast({
        title: message?.title ?? "Erro",
        description:
          message?.description ??
          error.response.data?.message ??
          "Erro inesperado.",
        color: "danger",
        timeout: 5000,
        shouldShowTimeoutProgress: true,
      });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
