import axios from 'axios';

// URL pública da API. Nunca armazene credenciais em variáveis VITE_*.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function montarUrlArquivo(caminho) {
  if (!caminho) return null;
  if (caminho.startsWith('http')) return caminho;
  return `${API_BASE_URL}${caminho}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// A identidade é comprovada pelo token assinado do servidor, nunca pelo ID do cliente.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
