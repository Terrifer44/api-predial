import api from './api';

export const authService = {
  /**
   * Realiza a autenticação do usuário.
   * @param {string} codigo_acesso - Código de acesso ou credencial do usuário.
   * @param {string} senha - Senha do usuário.
   */
  async login(codigo_acesso, senha) {
    const response = await api.post('/login', { codigo_acesso, senha });
    
    // Armazena token e usuário no localStorage se a API retornar
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }
    if (response.data?.usuario) {
      localStorage.setItem('user', JSON.stringify(response.data.usuario));
    }

    return response.data;
  },

  /**
   * Cadastra um novo morador ou usuário no sistema.
   * @param {Object} dados - Objeto contendo as informações de cadastro.
   */
  async cadastrar(dados) {
    const response = await api.post('/cadastro', dados);
    return response.data;
  },

  /**
   * Executa o logout limpando os dados salvos no navegador.
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Retorna os dados do usuário salvos no localStorage.
   */
  getUsuarioAtual() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
};