import axios from 'axios';

// Base URL do backend. Usada também para montar links de arquivos estáticos
// (ex: fotos enviadas nas demandas), já que o frontend roda em outra porta/origem.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Monta a URL completa de um arquivo salvo no backend (ex: "/uploads/demanda-1.jpg").
export function montarUrlArquivo(caminho) {
  if (!caminho) return null;
  if (caminho.startsWith('http')) return caminho;
  return `${API_BASE_URL}${caminho}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Requisição: identifica o usuário logado em toda chamada.
// O backend usa esse cabeçalho para verificar (no servidor, não só na tela)
// se quem está chamando realmente existe, está ativo e tem o perfil
// necessário para a ação — ver "identificarUsuario"/"exigirPerfil" no server.js.
api.interceptors.request.use(
  (config) => {
    try {
      const usuarioSalvo = localStorage.getItem('usuario');
      if (usuarioSalvo) {
        const usuario = JSON.parse(usuarioSalvo);
        const id = usuario?.usuario_id || usuario?.id;
        if (id) {
          config.headers['x-usuario-id'] = id;
        }
      }
    } catch (e) {
      // localStorage corrompido: segue sem o cabeçalho, o backend vai recusar como não autenticado.
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta: trata sessão inválida (401) ou sem permissão (403).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
