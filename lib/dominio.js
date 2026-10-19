/* ==========================================
   REGRAS DE DOMÍNIO (fonte única de verdade para o backend)
========================================== */

const SETORES = ['GERAL', 'ELETRICA', 'HIDRAULICA', 'ALVENARIA'];
const URGENCIAS = ['BAIXA', 'MEDIA', 'ALTA'];
const STATUS = ['PENDENTE', 'ATRIBUIDA', 'EM_ANDAMENTO', 'IMPEDIMENTO', 'CONCLUIDA'];
const TIPOS_USUARIO = ['MORADOR', 'OPERARIO', 'ADMINISTRADOR'];

// Perfis que o administrador pode liberar pela tela. ADMINISTRADOR só via seed/banco.
const TIPOS_LIBERAVEIS_PELA_TELA = ['MORADOR', 'OPERARIO'];

// Prazos de SLA (em horas) por urgência real definida na triagem.
const SLA_HORAS = { ALTA: 24, MEDIA: 72, BAIXA: 168 };

// Transições de status permitidas ao OPERÁRIO responsável. CONCLUIDA é estado final.
const TRANSICOES_OPERARIO = {
  ATRIBUIDA: ['EM_ANDAMENTO', 'CONCLUIDA', 'IMPEDIMENTO'],
  EM_ANDAMENTO: ['CONCLUIDA', 'IMPEDIMENTO'],
  IMPEDIMENTO: ['EM_ANDAMENTO', 'CONCLUIDA'],
};

// Status em que o administrador ainda pode (re)atribuir a demanda.
const STATUS_ATRIBUIVEIS = ['PENDENTE', 'ATRIBUIDA', 'EM_ANDAMENTO', 'IMPEDIMENTO'];

function calcularSlaPrazo(urgenciaReal, agora = Date.now()) {
  const horas = SLA_HORAS[urgenciaReal] || SLA_HORAS.MEDIA;
  return new Date(agora + horas * 3600 * 1000);
}

const transicaoPermitida = (de, para) => Boolean(TRANSICOES_OPERARIO[de]?.includes(para));

// Campos seguros de usuário (nunca inclui senha_hash, reset_token etc.)
const SELECT_USUARIO_PUBLICO = {
  id: true, nome: true, codigo_acesso: true, telefone: true, email: true,
  tipo_usuario: true, ativo: true, criado_em: true,
};

module.exports = {
  SETORES, URGENCIAS, STATUS, TIPOS_USUARIO, TIPOS_LIBERAVEIS_PELA_TELA, SLA_HORAS,
  TRANSICOES_OPERARIO, STATUS_ATRIBUIVEIS, SELECT_USUARIO_PUBLICO,
  calcularSlaPrazo, transicaoPermitida,
};
