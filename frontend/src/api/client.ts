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

// Interceptor para injetar o token JWT e mapear para a API versionada (/api/v1)
apiClient.interceptors.request.use(
  (config) => {
    // Reescreve rotas de /api/... para /api/v1/... caso necessário
    if (config.url && config.url.startsWith('/api/') && !config.url.startsWith('/api/v1/')) {
      config.url = config.url.replace('/api/', '/api/v1/');
    }
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

// Interceptor para tratar respostas paginadas e erros de autenticação globalmente
apiClient.interceptors.response.use(
  (response) => {
    // Se a resposta for um objeto paginado do Spring (contendo 'content' e 'pageable'),
    // desembrulhamos o array, mas mantemos compatibilidade com chamadas que buscam .content
    if (response.data && typeof response.data === 'object' && 'content' in response.data && 'pageable' in response.data) {
      const contentArray = response.data.content || [];
      Object.defineProperty(contentArray, 'content', {
        value: contentArray,
        writable: true,
        enumerable: false,
        configurable: true
      });
      response.data = contentArray;
    }
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Se receber 401 ou 403, a sessão está expirada/inválida, desloga o usuário
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
