import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// URL base apontando para o servidor Spring Boot
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar o token JWT em todas as requisições
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação (401) globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Se receber 401, desloga o usuário
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
