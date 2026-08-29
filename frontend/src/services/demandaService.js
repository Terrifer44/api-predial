import api from './api';

export const demandaService = {
  // ==========================================
  // MORADOR
  // ==========================================
  criarDemanda: async (dados) => {
    // Se vier um arquivo de foto, envia como multipart/form-data.
    // Caso contrário, mantém o envio padrão em JSON.
    if (dados instanceof FormData) {
      const res = await api.post('/api/demandas', dados, {
        headers: { 'Content-Type': undefined },
      });
      return res.data;
    }

    const res = await api.post('/api/demandas', dados);
    return res.data;
  },

  buscarDemandasMorador: async (idMorador) => {
    const res = await api.get(`/api/demandas/morador/${idMorador}`);
    return res.data;
  },

  cadastrarMorador: async (dados) => {
    // dados: { codigo_liberacao, nome, telefone, email, senha }
    const res = await api.post('/api/cadastrar-morador', dados);
    return res.data;
  },

  // ==========================================
  // OPERÁRIO
  // ==========================================
  buscarDemandasOperario: async (idOperario) => {
    const res = await api.get(`/api/demandas/operario/${idOperario}`);
    return res.data;
  },

  atualizarStatusOperario: async (idDemanda, dados) => {
    // dados: { novo_status, motivo_impedimento, id_usuario }
    const res = await api.put(`/api/demandas/${idDemanda}/status-operario`, dados);
    return res.data;
  },

  // ==========================================
  // ADMIN / TRIAGEM
  // ==========================================
  buscarDemandas: async () => {
    const res = await api.get('/api/demandas');
    return res.data;
  },

  buscarOperarios: async () => {
    const res = await api.get('/api/operarios');
    return res.data;
  },

  atribuirDemanda: async (idDemanda, dados) => {
    // dados: { id_operario, urgencia_real, id_admin }
    const res = await api.put(`/api/demandas/${idDemanda}/atribuir`, dados);
    return res.data;
  },

  excluirDemanda: async (idDemanda) => {
    const res = await api.delete(`/api/demandas/${idDemanda}`);
    return res.data;
  },

  buscarHistorico: async (idDemanda) => {
    const res = await api.get(`/api/demandas/${idDemanda}/historico`);
    return res.data;
  },

  // ==========================================
  // CHAT / COMENTÁRIOS DA DEMANDA
  // ==========================================
  buscarComentarios: async (idDemanda) => {
    const res = await api.get(`/api/demandas/${idDemanda}/comentarios`);
    return res.data;
  },

  enviarComentario: async (idDemanda, dados) => {
    // dados: { id_usuario, mensagem }
    const res = await api.post(`/api/demandas/${idDemanda}/comentarios`, dados);
    return res.data;
  },

  // ==========================================
  // NOTIFICAÇÕES INTERNAS
  // ==========================================
  buscarNotificacoes: async (idUsuario) => {
    const res = await api.get(`/api/notificacoes/${idUsuario}`);
    return res.data;
  },

  marcarNotificacaoLida: async (idNotificacao) => {
    const res = await api.put(`/api/notificacoes/${idNotificacao}/lida`);
    return res.data;
  },

  marcarTodasNotificacoesLidas: async (idUsuario) => {
    const res = await api.put(`/api/notificacoes/${idUsuario}/marcar-todas`);
    return res.data;
  },

  // ==========================================
  // RECUPERAÇÃO DE SENHA
  // ==========================================
  esqueciSenha: async (codigo_acesso) => {
    const res = await api.post('/api/esqueci-senha', { codigo_acesso });
    return res.data;
  },

  redefinirSenha: async (token, nova_senha) => {
    const res = await api.post('/api/redefinir-senha', { token, nova_senha });
    return res.data;
  },

  // ==========================================
  // RELATÓRIOS AVANÇADOS (EXCEL / PDF)
  // ==========================================
  baixarRelatorio: async (formato, filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const res = await api.get(`/api/relatorios/${formato}?${params}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    const extensao = formato === 'excel' ? 'xlsx' : 'pdf';
    link.setAttribute('download', `relatorio_manutencoes.${extensao}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // GERENCIAMENTO DE CÓDIGOS DE LIBERAÇÃO
  // ==========================================
  buscarCodigosLiberacao: async () => {
    const res = await api.get('/api/codigos-liberacao');
    return res.data;
  },

  gerarCodigoLiberacao: async (codigo, tipo_usuario) => {
    const res = await api.post('/api/codigos-liberacao', { codigo, tipo_usuario });
    return res.data;
  },

  excluirCodigoLiberacao: async (idCodigo) => {
    const res = await api.delete(`/api/codigos-liberacao/${idCodigo}`);
    return res.data;
  },

  // ==========================================
  // GERENCIAMENTO DE USUÁRIOS
  // ==========================================
  buscarUsuarios: async () => {
    const res = await api.get('/api/usuarios');
    return res.data;
  },

  alterarStatusUsuario: async (id, ativo) => {
    const res = await api.put(`/api/usuarios/${id}/status`, { ativo });
    return res.data;
  }
};
