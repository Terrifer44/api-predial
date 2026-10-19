import axios from 'axios';
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export function montarUrlArquivo(caminho) {
  if (!caminho) return null;
  if (/^https:\/\//.test(caminho)) return caminho;
  return `${API_BASE_URL}${caminho}`;
}
export function lerSessao() {
  try { return JSON.parse(sessionStorage.getItem('predial.sessao') || 'null'); } catch { return null; }
}
export function salvarSessao(dados) {
  if (dados) sessionStorage.setItem('predial.sessao', JSON.stringify(dados));
  else sessionStorage.removeItem('predial.sessao');
  for (const key of ['usuario', 'user', 'token']) localStorage.removeItem(key);
}
const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });
api.interceptors.request.use((config) => {
  const token = lerSessao()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((r) => r, (error) => {
  if (error.response?.status === 401 && error.config?.headers?.Authorization && !/\/(?:api\/)?login$/.test(error.config.url)) {
    salvarSessao(null);
    window.dispatchEvent(new Event('predial:sessao-expirada'));
  }
  return Promise.reject(error);
});
export default api;
