import api from './api';
export const authService = {
  login: async (codigo_acesso, senha) => (await api.post('/api/login', { codigo_acesso, senha })).data,
  cadastrar: async (dados) => (await api.post('/api/cadastro', dados)).data,
};
