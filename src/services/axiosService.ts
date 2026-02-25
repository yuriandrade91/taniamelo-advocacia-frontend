import httpMessages from "@/constants/messages/httpMessages";
import { addToast } from "@heroui/toast";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
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
        title: response.data?.message ?? "Cliente atualizado com sucesso!",
        description: "Verifique as informações atualizadas.",
        color: "success",
      });
    } else if (method === "delete") {
      addToast({
        title: response.data?.message ?? "Cliente excluído com sucesso!",
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
      const apiErrors = error.response.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        const first = apiErrors[0];
        const description = apiErrors
          .map((e: any) => `${e.message}`)
          .join("; ");
        addToast({
          title: first?.message ?? "Erro de validação",
          description:
            "Dado(s) inválido(s). Verifique o(s) campo(s) e tente novamente.",
          color: "danger",
          timeout: 7000,
          shouldShowTimeoutProgress: true,
        });
        return Promise.reject(error);
      }
    } else if (error.request) {
      const target =
        error.config?.url ||
        axios.defaults.baseURL ||
        axiosInstance.defaults.baseURL;
      addToast({
        title: "Erro de conexão",
        description: `Não foi possível conectar-se ao servidor.`,
        color: "danger",
        timeout: 7000,
        shouldShowTimeoutProgress: true,
      });
    } else {
      addToast({
        title: "Erro",
        description: error.message ?? "Erro inesperado.",
        color: "danger",
        timeout: 5000,
        shouldShowTimeoutProgress: true,
      });
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
