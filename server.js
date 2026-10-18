require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const { upload, obterUrlArquivoEnviado } = require('./lib/upload');
const { criarNotificacao } = require('./lib/notificacoes');
const {
  notificarInicioServico,
  notificarConclusaoServico,
  notificarImpedimento,
  notificarAtribuicao,
  enviarEmailRedefinicaoSenha,
  verificarConexaoSmtp,
} = require('./lib/email');
const { gerarRelatorioExcel, gerarRelatorioPDF } = require('./lib/relatorios');

const app = express();
const prisma = new PrismaClient();

/* --- MIDDLEWARES GLOBAIS --- */
app.use(cors());
app.use(express.json());

// Torna a pasta de uploads acessível publicamente (ex: /uploads/demanda-123.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ==========================================
   AUTENTICAÇÃO / AUTORIZAÇÃO
   Tokens com HMAC SHA-256; nunca confie em IDs informados
   pelo cliente para autenticar o usuário.
   Configure AUTH_SECRET (32+ caracteres aleatórios) antes
   de iniciar o servidor, inclusive em desenvolvimento.
========================================== */

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
  throw new Error('[SEGURANÇA] Configure AUTH_SECRET com pelo menos 32 caracteres aleatórios.');
}

const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

function assinaturaToken(payload) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
}

function revisaoCredencial(usuario) {
  // Invalida tokens antigos após qualquer troca de senha.
  return crypto.createHash('sha256').update(usuario.senha_hash).digest('hex').slice(0, 24);
}

function criarToken(usuario) {
  const dados = {
    uid: usuario.id,
    exp: Date.now() + DURACAO_SESSAO_MS,
    revisao: revisaoCredencial(usuario),
  };
  const payload = Buffer.from(JSON.stringify(dados), 'utf8').toString('base64url');
  return `${payload}.${assinaturaToken(payload)}`;
}

function validarToken(token) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;

  const [payload, assinaturaRecebida] = partes;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(assinaturaRecebida)) return null;

  const assinaturaEsperada = Buffer.from(assinaturaToken(payload), 'base64url');
  const assinaturaInformada = Buffer.from(assinaturaRecebida, 'base64url');
  if (
    assinaturaEsperada.length !== assinaturaInformada.length ||
    !crypto.timingSafeEqual(assinaturaEsperada, assinaturaInformada)
  ) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      !Number.isSafeInteger(dados.uid) ||
      dados.uid <= 0 ||
      typeof dados.exp !== 'number' ||
      dados.exp <= Date.now() ||
      dados.exp > Date.now() + DURACAO_SESSAO_MS ||
      typeof dados.revisao !== 'string'
    ) return null;
    return dados;
  } catch {
    return null;
  }
}

async function identificarUsuario(req, res, next) {
  req.usuarioAutenticado = null;
  const autorizacao = req.get('authorization') || '';
  const partes = /^Bearer (\S+)$/.exec(autorizacao);
  const sessao = partes ? validarToken(partes[1]) : null;
  if (!sessao) return next();

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: sessao.uid } });
    if (usuario && usuario.ativo && revisaoCredencial(usuario) === sessao.revisao) {
      req.usuarioAutenticado = usuario;
    }
  } catch (error) {
    console.error('[AUTENTICAÇÃO] Não foi possível validar a sessão:', error);
  }
  next();
}

app.use(identificarUsuario);

function exigirAutenticacao(req, res, next) {
  if (!req.usuarioAutenticado) {
    return res.status(401).json({ erro: 'Não autenticado. Faça login novamente.' });
  }
  next();
}

function exigirPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuarioAutenticado) {
      return res.status(401).json({ erro: 'Não autenticado. Faça login novamente.' });
    }
    if (!perfisPermitidos.includes(req.usuarioAutenticado.tipo_usuario)) {
      return res.status(403).json({ erro: 'Você não tem permissão para executar esta ação.' });
    }
    next();
  };
}

const APENAS_ADMIN = exigirPerfil('ADMINISTRADOR');

// Revalida no backend a relação do usuário com a demanda consultada.
async function exigirAcessoDemanda(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'Identificador de demanda inválido.' });
  }

  try {
    const demanda = await prisma.demanda.findUnique({
      where: { id },
      select: { id: true, id_morador: true, id_operario: true },
    });
    if (!demanda) return res.status(404).json({ erro: 'Demanda não encontrada.' });

    const usuario = req.usuarioAutenticado;
    const podeAcessar =
      usuario.tipo_usuario === 'ADMINISTRADOR' ||
      demanda.id_morador === usuario.id ||
      demanda.id_operario === usuario.id;

    if (!podeAcessar) {
      return res.status(403).json({ erro: 'Você não tem acesso a esta demanda.' });
    }
    next();
  } catch (error) {
    console.error('[AUTORIZAÇÃO] Falha ao verificar acesso à demanda:', error);
    return res.status(500).json({ erro: 'Erro ao verificar acesso à demanda.' });
  }
}

/* ==========================================
   PRAZOS DE SLA POR URGÊNCIA (em horas)
   Definido no momento da triagem (urgência real).
========================================== */
const SLA_HORAS = {
  ALTA: 24,
  MEDIA: 72,
  BAIXA: 168, // 7 dias
};

function calcularSlaPrazo(urgenciaReal) {
  const horas = SLA_HORAS[urgenciaReal] || SLA_HORAS.MEDIA;
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}

const TIPOS_USUARIO_VALIDOS = ['MORADOR', 'OPERARIO', 'ADMINISTRADOR'];

// Perfis que um Administrador pode liberar pela TELA (gerar código de acesso).
// ADMINISTRADOR fica de fora por decisão de segurança: nenhum admin deve
// conseguir criar outro admin livremente pela interface. Um novo administrador
// só pode ser criado diretamente no banco (seed ou query manual).
const TIPOS_LIBERAVEIS_PELA_TELA = ['MORADOR', 'OPERARIO'];

/* ==========================================
   AUTENTICAÇÃO E CADASTRO (rotas públicas)
========================================== */

app.post(['/login', '/api/login'], async (req, res) => {
  const { codigo_acesso, senha } = req.body;
  if (typeof codigo_acesso !== 'string' || typeof senha !== 'string' || !codigo_acesso.trim() || !senha) {
    return res.status(400).json({ erro: 'Código de acesso e senha são obrigatórios.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { codigo_acesso },
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Código de acesso inválido ou usuário inativo.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }

    return res.json({
      token: criarToken(usuario),
      usuario_id: usuario.id,
      nome: usuario.nome,
      codigo_acesso: usuario.codigo_acesso,
      tipo_usuario: usuario.tipo_usuario.toLowerCase(),
      telefone: usuario.telefone,
      email: usuario.email,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ erro: 'Erro interno no servidor ao realizar login.' });
  }
});

// Cadastro genérico: o tipo de usuário criado depende do tipo do código de liberação.
// Isso permite tanto cadastrar moradores quanto criar novos operários/administradores
// (síndicos/gestores) a partir de um código gerado no Painel Admin.
app.post(['/cadastro', '/api/cadastro', '/api/cadastrar-morador'], async (req, res) => {
  const { codigo_liberacao, nome, telefone, email, senha } = req.body;

  try {
    const codigoValido = await prisma.codigoLiberacao.findUnique({
      where: { codigo: (codigo_liberacao || '').toUpperCase().trim() },
    });

    if (!codigoValido) {
      return res.status(400).json({ erro: 'Código de liberação inválido ou inexistente.' });
    }

    if (codigoValido.usado) {
      return res.status(400).json({ erro: 'Este código de liberação já foi utilizado.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        telefone,
        email: email || null,
        codigo_acesso: codigoValido.codigo,
        senha_hash,
        tipo_usuario: codigoValido.tipo_usuario,
        ativo: true,
      },
    });

    await prisma.codigoLiberacao.update({
      where: { id: codigoValido.id },
      data: { usado: true },
    });

    return res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso!',
      codigo_acesso: novoUsuario.codigo_acesso,
      tipo_usuario: novoUsuario.tipo_usuario,
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return res.status(500).json({ erro: 'Erro interno ao realizar cadastro.' });
  }
});

/* ==========================================
   RECUPERAÇÃO DE SENHA ("Esqueci minha senha")
========================================== */

app.post('/api/esqueci-senha', async (req, res) => {
  const { codigo_acesso } = req.body;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { codigo_acesso: (codigo_acesso || '').toUpperCase().trim() },
    });

    // Resposta genérica sempre igual, para não revelar quais códigos existem no sistema.
    const respostaGenerica = {
      mensagem: 'Se o código de acesso existir e tiver um e-mail cadastrado, um link de redefinição foi enviado.',
    };

    if (!usuario || !usuario.email) {
      return res.json(respostaGenerica);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { reset_token: token, reset_token_expira: expira },
    });

    const urlFrontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${urlFrontend}/redefinir-senha?token=${token}`;

    // O resultado é só logado no servidor (nunca exposto na resposta): a
    // resposta ao cliente continua genérica de propósito, para não revelar
    // quais códigos de acesso existem no sistema. Se o e-mail falhar, o
    // motivo aparece aqui no log do Render para diagnóstico.
    const resultadoEnvio = await enviarEmailRedefinicaoSenha(usuario, link);
    if (!resultadoEnvio.enviado) {
      console.warn(`[ESQUECI-SENHA] E-mail de redefinição não foi entregue para o usuário ${usuario.codigo_acesso}: ${resultadoEnvio.motivo}`);
    }

    return res.json(respostaGenerica);
  } catch (error) {
    console.error('Erro ao solicitar recuperação de senha:', error);
    return res.status(500).json({ erro: 'Erro interno ao solicitar recuperação de senha.' });
  }
});

app.post('/api/redefinir-senha', async (req, res) => {
  const { token, nova_senha } = req.body;

  if (!token || !nova_senha) {
    return res.status(400).json({ erro: 'Token e nova senha são obrigatórios.' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { reset_token: token } });

    if (!usuario || !usuario.reset_token_expira || usuario.reset_token_expira < new Date()) {
      return res.status(400).json({ erro: 'Link de redefinição inválido ou expirado. Solicite um novo.' });
    }

    const senha_hash = await bcrypt.hash(nova_senha, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha_hash, reset_token: null, reset_token_expira: null },
    });

    return res.json({ mensagem: 'Senha redefinida com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ erro: 'Erro interno ao redefinir senha.' });
  }
});

/* ==========================================
   GERENCIAMENTO DE CÓDIGOS DE LIBERAÇÃO
   (somente Administrador)
========================================== */

app.get(['/codigos-liberacao', '/api/codigos-liberacao'], APENAS_ADMIN, async (req, res) => {
  try {
    const codigos = await prisma.codigoLiberacao.findMany({
      orderBy: { id: 'desc' },
    });
    return res.json(codigos);
  } catch (error) {
    console.error('Erro ao buscar códigos:', error);
    return res.status(500).json({ erro: 'Erro ao buscar códigos de liberação.' });
  }
});

app.post('/api/codigos-liberacao', APENAS_ADMIN, async (req, res) => {
  const codigo = (req.body.codigo || '').toUpperCase().trim();
  const tipo_usuario = (req.body.tipo_usuario || '').toUpperCase().trim();

  if (!codigo) {
    return res.status(400).json({ erro: 'Informe um código.' });
  }

  // Valida explicitamente o tipo de perfil: se vier vazio ou um valor
  // desconhecido, a rota agora RECUSA a criação em vez de deixar o Prisma
  // decidir silenciosamente (isso evita qualquer código ser criado com um
  // tipo diferente do que o administrador selecionou na tela).
  //
  // ADMINISTRADOR é bloqueado aqui de propósito (mesmo que alguém chame a
  // API diretamente, sem passar pela tela) — ver TIPOS_LIBERAVEIS_PELA_TELA.
  if (!TIPOS_LIBERAVEIS_PELA_TELA.includes(tipo_usuario)) {
    if (tipo_usuario === 'ADMINISTRADOR') {
      return res.status(400).json({
        erro: 'Por segurança, não é possível gerar códigos de Administrador pela tela. Novos administradores só podem ser criados diretamente no banco de dados.',
      });
    }
    return res.status(400).json({
      erro: `Tipo de perfil inválido: "${req.body.tipo_usuario}". Use um destes: ${TIPOS_LIBERAVEIS_PELA_TELA.join(', ')}.`,
    });
  }

  try {
    const novoCodigo = await prisma.codigoLiberacao.create({
      data: { codigo, tipo_usuario, usado: false },
    });

    console.log(`[ADMIN] Código "${novoCodigo.codigo}" criado com perfil ${novoCodigo.tipo_usuario}.`);
    return res.status(201).json(novoCodigo);
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ erro: 'Este código já existe. Escolha outro.' });
    }
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

app.delete(['/codigos-liberacao/:id', '/api/codigos-liberacao/:id'], APENAS_ADMIN, async (req, res) => {
  const { id } = req.params;
  const idCodigo = Number(id);

  try {
    const codigo = await prisma.codigoLiberacao.findUnique({ where: { id: idCodigo } });
    if (!codigo) {
      return res.status(404).json({ erro: 'Código de liberação não encontrado.' });
    }

    // BUG CONFIRMADO (corrigido aqui): excluir o código não excluía o
    // usuário cadastrado com ele. Agora os dois saem juntos — a menos que o
    // usuário já tenha demandas/comentários/histórico vinculado, caso em que
    // o banco não deixa excluir (violaria integridade referencial) e o
    // usuário é desativado em vez de excluído, para não perder esse
    // histórico.
    const usuarioVinculado = await prisma.usuario.findUnique({ where: { codigo_acesso: codigo.codigo } });

    let statusUsuario = 'nenhum_vinculado';

    if (usuarioVinculado) {
      try {
        await prisma.usuario.delete({ where: { id: usuarioVinculado.id } });
        statusUsuario = 'excluido';
      } catch (erroUsuario) {
        if (erroUsuario.code === 'P2003') {
          await prisma.usuario.update({
            where: { id: usuarioVinculado.id },
            data: { ativo: false },
          });
          statusUsuario = 'desativado';
        } else {
          throw erroUsuario;
        }
      }
    }

    await prisma.codigoLiberacao.delete({ where: { id: idCodigo } });

    console.log(`[ADMIN] Código de liberação #${idCodigo} excluído. Usuário vinculado: ${statusUsuario}.`);

    const MENSAGENS_USUARIO_VINCULADO = {
      nenhum_vinculado: 'Código de liberação removido com sucesso.',
      excluido: 'Código de liberação e o usuário vinculado foram removidos com sucesso.',
      desativado: 'Código de liberação removido. O usuário vinculado já tinha demandas ou histórico no sistema, então foi desativado em vez de excluído (para não perder esse histórico).',
    };

    return res.json({
      mensagem: MENSAGENS_USUARIO_VINCULADO[statusUsuario],
      usuario_vinculado: statusUsuario,
    });
  } catch (error) {
    console.error('Erro ao excluir código:', error);
    return res.status(500).json({ erro: 'Erro interno ao tentar excluir o código.' });
  }
});


/* ==========================================
   GERENCIAMENTO DE USUÁRIOS E OPERÁRIOS
   (somente Administrador)
========================================== */

app.get('/api/usuarios', APENAS_ADMIN, async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        tipo_usuario: {
          in: ['MORADOR', 'OPERARIO']
        }
      },
      orderBy: { nome: 'asc' },
    });
    return res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ erro: 'Erro ao buscar usuários.' });
  }
});

app.put('/api/usuarios/:id/status', APENAS_ADMIN, async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  try {
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { ativo },
    });
    return res.json(usuarioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    return res.status(500).json({ erro: 'Erro ao alterar status do usuário.' });
  }
});

app.get('/api/operarios', APENAS_ADMIN, async (req, res) => {
  try {
    const operarios = await prisma.usuario.findMany({
      where: { tipo_usuario: 'OPERARIO', ativo: true },
      select: { id: true, nome: true },
    });
    return res.json(operarios);
  } catch (error) {
    console.error('Erro ao buscar operários:', error);
    return res.status(500).json({ erro: 'Erro ao buscar operários.' });
  }
});


/* ==========================================
   GESTÃO DE DEMANDAS
========================================== */

// Somente MORADOR pode abrir uma demanda, e sempre em nome de si mesmo
// (id_morador vem do usuário autenticado, nunca do que o cliente mandar no body).
app.post('/api/demandas', exigirPerfil('MORADOR'), upload.single('foto'), async (req, res) => {
  const { setor, descricao, urgencia_morador } = req.body;
  const id_morador = req.usuarioAutenticado.id;

  try {
    const foto_url = obterUrlArquivoEnviado(req.file);

    const novaDemanda = await prisma.demanda.create({
      data: {
        setor,
        descricao,
        urgencia_morador,
        id_morador,
        status: 'PENDENTE',
        foto_url,
      },
    });

    await prisma.historicoStatus.create({
      data: {
        id_demanda: novaDemanda.id,
        id_usuario_modificador: id_morador,
        status_novo: 'PENDENTE',
        comentario: 'Solicitação aberta pelo morador.',
      },
    });

    return res.status(201).json(novaDemanda);
  } catch (error) {
    console.error('Erro ao criar demanda:', error);
    return res.status(500).json({ erro: 'Não foi possível cadastrar a demanda.' });
  }
});

// Listagem completa: somente Administrador (central de triagem).
app.get('/api/demandas', APENAS_ADMIN, async (req, res) => {
  try {
    const demandas = await prisma.demanda.findMany({
      include: {
        morador: { select: { id: true, nome: true, telefone: true } },
        operario: { select: { id: true, nome: true } },
      },
      orderBy: { criado_em: 'desc' },
    });
    return res.json(demandas);
  } catch (error) {
    console.error('Erro ao listar demandas:', error);
    return res.status(500).json({ erro: 'Erro ao listar todas as demandas.' });
  }
});

// Um morador só pode listar as PRÓPRIAS demandas (Admin pode consultar qualquer uma).
app.get('/api/demandas/morador/:idMorador', exigirPerfil('MORADOR', 'ADMINISTRADOR'), async (req, res) => {
  const idMorador = Number(req.params.idMorador);
  const solicitante = req.usuarioAutenticado;

  if (solicitante.tipo_usuario === 'MORADOR' && solicitante.id !== idMorador) {
    return res.status(403).json({ erro: 'Você só pode consultar as suas próprias demandas.' });
  }

  try {
    const demandas = await prisma.demanda.findMany({
      where: { id_morador: idMorador },
      include: {
        operario: { select: { nome: true } },
      },
      orderBy: { criado_em: 'desc' },
    });
    return res.json(demandas);
  } catch (error) {
    console.error('Erro ao buscar demandas do morador:', error);
    return res.status(500).json({ erro: 'Erro ao buscar solicitações do morador.' });
  }
});

// Um operário só pode listar as PRÓPRIAS tarefas (Admin pode consultar qualquer uma).
app.get('/api/demandas/operario/:idOperario', exigirPerfil('OPERARIO', 'ADMINISTRADOR'), async (req, res) => {
  const idOperario = Number(req.params.idOperario);
  const solicitante = req.usuarioAutenticado;

  if (solicitante.tipo_usuario === 'OPERARIO' && solicitante.id !== idOperario) {
    return res.status(403).json({ erro: 'Você só pode consultar as suas próprias tarefas.' });
  }

  try {
    const tarefas = await prisma.demanda.findMany({
      where: { id_operario: idOperario },
      include: {
        morador: { select: { nome: true, telefone: true } },
      },
      orderBy: { criado_em: 'desc' },
    });
    return res.json(tarefas);
  } catch (error) {
    console.error('Erro ao buscar tarefas do operário:', error);
    return res.status(500).json({ erro: 'Erro ao buscar tarefas do operário.' });
  }
});

// Triagem: somente Administrador.
app.put('/api/demandas/:id/atribuir', APENAS_ADMIN, async (req, res) => {
  const { id } = req.params;
  const { id_operario, urgencia_real } = req.body;
  const id_admin = req.usuarioAutenticado.id;

  try {
    const sla_prazo = calcularSlaPrazo(urgencia_real);

    const demandaAtualizada = await prisma.demanda.update({
      where: { id: Number(id) },
      data: {
        id_operario: Number(id_operario),
        urgencia_real,
        status: 'ATRIBUIDA',
        sla_prazo,
      },
      include: {
        morador: { select: { nome: true, email: true } },
        operario: { select: { nome: true } },
      },
    });

    await prisma.historicoStatus.create({
      data: {
        id_demanda: Number(id),
        id_usuario_modificador: id_admin,
        status_anterior: 'PENDENTE',
        status_novo: 'ATRIBUIDA',
        comentario: `Triagem concluída: Definido operário ID ${id_operario} e urgência ${urgencia_real}.`,
      },
    });

    // Notificação interna + e-mail para o morador
    await criarNotificacao(prisma, {
      id_usuario: demandaAtualizada.id_morador,
      id_demanda: demandaAtualizada.id,
      titulo: 'Demanda atribuída a um operário',
      mensagem: `Sua demanda #${demandaAtualizada.id} (${demandaAtualizada.setor}) já está na fila de atendimento.`,
    });
    notificarAtribuicao(demandaAtualizada.morador, demandaAtualizada).catch(() => {});

    return res.json(demandaAtualizada);
  } catch (error) {
    console.error('Erro ao atribuir demanda:', error);
    return res.status(500).json({ erro: 'Erro ao atribuir demanda.' });
  }
});

// Atualização de status: somente o OPERÁRIO dono da tarefa.
app.put('/api/demandas/:id/status-operario', exigirPerfil('OPERARIO'), async (req, res) => {
  const { id } = req.params;
  const { novo_status, motivo_impedimento } = req.body;
  const id_usuario = req.usuarioAutenticado.id;

  try {
    const demandaAtual = await prisma.demanda.findUnique({
      where: { id: Number(id) },
    });

    if (!demandaAtual) {
      return res.status(404).json({ erro: 'Demanda não encontrada.' });
    }

    if (demandaAtual.id_operario !== id_usuario) {
      return res.status(403).json({ erro: 'Esta demanda não está atribuída a você.' });
    }

    const demandaAtualizada = await prisma.demanda.update({
      where: { id: Number(id) },
      data: {
        status: novo_status,
        motivo_impedimento: novo_status === 'IMPEDIMENTO' ? motivo_impedimento : null,
      },
      include: {
        morador: { select: { nome: true, email: true } },
      },
    });

    await prisma.historicoStatus.create({
      data: {
        id_demanda: Number(id),
        id_usuario_modificador: id_usuario,
        status_anterior: demandaAtual.status,
        status_novo: novo_status,
        comentario: motivo_impedimento || `Status alterado para ${novo_status}`,
      },
    });

    // Sistema de notificações: avisa o morador quando o operário inicia ou conclui o serviço
    const morador = demandaAtualizada.morador;
    if (novo_status === 'EM_ANDAMENTO') {
      await criarNotificacao(prisma, {
        id_usuario: demandaAtualizada.id_morador,
        id_demanda: demandaAtualizada.id,
        titulo: 'Serviço iniciado',
        mensagem: `O operário iniciou o atendimento da sua demanda #${demandaAtualizada.id}.`,
      });
      notificarInicioServico(morador, demandaAtualizada).catch(() => {});
    } else if (novo_status === 'CONCLUIDA') {
      await criarNotificacao(prisma, {
        id_usuario: demandaAtualizada.id_morador,
        id_demanda: demandaAtualizada.id,
        titulo: 'Serviço concluído',
        mensagem: `Sua demanda #${demandaAtualizada.id} foi concluída.`,
      });
      notificarConclusaoServico(morador, demandaAtualizada).catch(() => {});
    } else if (novo_status === 'IMPEDIMENTO') {
      await criarNotificacao(prisma, {
        id_usuario: demandaAtualizada.id_morador,
        id_demanda: demandaAtualizada.id,
        titulo: 'Impedimento no atendimento',
        mensagem: `Houve um impedimento na sua demanda #${demandaAtualizada.id}: ${motivo_impedimento || 'motivo não informado'}.`,
      });
      notificarImpedimento(morador, demandaAtualizada).catch(() => {});
    }

    return res.json(demandaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar status da demanda:', error);
    return res.status(500).json({ erro: 'Erro ao atualizar status.' });
  }
});

// Exclusão definitiva: somente Administrador.
app.delete('/api/demandas/:id', APENAS_ADMIN, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.demanda.delete({ where: { id: Number(id) } });
    return res.json({ mensagem: 'Demanda removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir demanda:', error);
    return res.status(500).json({ erro: 'Erro ao excluir demanda.' });
  }
});


/* ==========================================
   HISTÓRICO (qualquer usuário autenticado)
========================================== */

app.get('/api/demandas/:id/historico', exigirAutenticacao, exigirAcessoDemanda, async (req, res) => {
  const { id } = req.params;

  try {
    const historico = await prisma.historicoStatus.findMany({
      where: { id_demanda: Number(id) },
      include: {
        usuario: { select: { nome: true, tipo_usuario: true } },
      },
      orderBy: { criado_em: 'desc' },
    });
    return res.json(historico);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});


/* ==========================================
   CHAT / COMENTÁRIOS NA DEMANDA
   Mini-chat entre morador e operário dentro do chamado
   (ex: "Posso ir às 14h?"). Qualquer usuário autenticado
   pode ler/escrever (a tela só é alcançável por quem tem
   acesso à demanda em questão).
========================================== */

app.get('/api/demandas/:id/comentarios', exigirAutenticacao, exigirAcessoDemanda, async (req, res) => {
  const { id } = req.params;

  try {
    const comentarios = await prisma.comentarioDemanda.findMany({
      where: { id_demanda: Number(id) },
      include: {
        usuario: { select: { id: true, nome: true, tipo_usuario: true } },
      },
      orderBy: { criado_em: 'asc' },
    });
    return res.json(comentarios);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return res.status(500).json({ erro: 'Erro ao buscar comentários da demanda.' });
  }
});

app.post('/api/demandas/:id/comentarios', exigirAutenticacao, exigirAcessoDemanda, async (req, res) => {
  const { id } = req.params;
  const { mensagem } = req.body;
  const id_usuario = req.usuarioAutenticado.id;

  if (!mensagem || !mensagem.trim()) {
    return res.status(400).json({ erro: 'A mensagem não pode estar vazia.' });
  }

  try {
    const novoComentario = await prisma.comentarioDemanda.create({
      data: {
        id_demanda: Number(id),
        id_usuario,
        mensagem: mensagem.trim(),
      },
      include: {
        usuario: { select: { id: true, nome: true, tipo_usuario: true } },
      },
    });

    return res.status(201).json(novoComentario);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return res.status(500).json({ erro: 'Erro ao enviar mensagem.' });
  }
});


/* ==========================================
   NOTIFICAÇÕES INTERNAS (sino no cabeçalho)
   Um usuário só pode ver/alterar as PRÓPRIAS notificações
   (Admin pode consultar qualquer uma).
========================================== */

app.get('/api/notificacoes/:idUsuario', exigirAutenticacao, async (req, res) => {
  const idUsuario = Number(req.params.idUsuario);
  const solicitante = req.usuarioAutenticado;

  if (solicitante.tipo_usuario !== 'ADMINISTRADOR' && solicitante.id !== idUsuario) {
    return res.status(403).json({ erro: 'Você só pode consultar as suas próprias notificações.' });
  }

  try {
    const notificacoes = await prisma.notificacao.findMany({
      where: { id_usuario: idUsuario },
      orderBy: { criado_em: 'desc' },
      take: 30,
    });
    return res.json(notificacoes);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return res.status(500).json({ erro: 'Erro ao buscar notificações.' });
  }
});

app.put('/api/notificacoes/:id/lida', exigirAutenticacao, async (req, res) => {
  const { id } = req.params;

  try {
    const notificacao = await prisma.notificacao.findUnique({ where: { id: Number(id) } });
    if (!notificacao) {
      return res.status(404).json({ erro: 'Notificação não encontrada.' });
    }
    if (req.usuarioAutenticado.tipo_usuario !== 'ADMINISTRADOR' && notificacao.id_usuario !== req.usuarioAutenticado.id) {
      return res.status(403).json({ erro: 'Esta notificação não pertence a você.' });
    }

    const atualizada = await prisma.notificacao.update({
      where: { id: Number(id) },
      data: { lida: true },
    });
    return res.json(atualizada);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return res.status(500).json({ erro: 'Erro ao marcar notificação como lida.' });
  }
});

app.put('/api/notificacoes/:idUsuario/marcar-todas', exigirAutenticacao, async (req, res) => {
  const idUsuario = Number(req.params.idUsuario);
  const solicitante = req.usuarioAutenticado;

  if (solicitante.tipo_usuario !== 'ADMINISTRADOR' && solicitante.id !== idUsuario) {
    return res.status(403).json({ erro: 'Você só pode alterar as suas próprias notificações.' });
  }

  try {
    await prisma.notificacao.updateMany({
      where: { id_usuario: idUsuario, lida: false },
      data: { lida: true },
    });
    return res.json({ mensagem: 'Notificações marcadas como lidas.' });
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
    return res.status(500).json({ erro: 'Erro ao marcar notificações como lidas.' });
  }
});


/* ==========================================
   RELATÓRIOS AVANÇADOS (Excel / PDF)
   Somente Administrador. Query params opcionais:
   ?mes=1-12&ano=2026&status=CONCLUIDA
========================================== */

function montarFiltroRelatorio(req) {
  const { mes, ano, status } = req.query;
  const filtro = {};

  if (status) {
    filtro.status = status;
  }

  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1);
    const fim = new Date(Number(ano), Number(mes), 1);
    filtro.criado_em = { gte: inicio, lt: fim };
  } else if (ano) {
    const inicio = new Date(Number(ano), 0, 1);
    const fim = new Date(Number(ano) + 1, 0, 1);
    filtro.criado_em = { gte: inicio, lt: fim };
  }

  return filtro;
}

app.get('/api/relatorios/excel', APENAS_ADMIN, async (req, res) => {
  try {
    const where = montarFiltroRelatorio(req);
    const demandas = await prisma.demanda.findMany({
      where,
      include: {
        morador: { select: { nome: true } },
        operario: { select: { nome: true } },
      },
      orderBy: { criado_em: 'desc' },
    });

    await gerarRelatorioExcel(res, demandas, { titulo: 'Relatorio_Manutencoes' });
  } catch (error) {
    console.error('Erro ao gerar relatório Excel:', error);
    res.status(500).json({ erro: 'Erro ao gerar relatório em Excel.' });
  }
});

app.get('/api/relatorios/pdf', APENAS_ADMIN, async (req, res) => {
  try {
    const where = montarFiltroRelatorio(req);
    const demandas = await prisma.demanda.findMany({
      where,
      include: {
        morador: { select: { nome: true } },
        operario: { select: { nome: true } },
      },
      orderBy: { criado_em: 'desc' },
    });

    gerarRelatorioPDF(res, demandas, { titulo: 'Relatorio_Manutencoes' });
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    res.status(500).json({ erro: 'Erro ao gerar relatório em PDF.' });
  }
});

// =====================================================
// TRATAMENTO GLOBAL DE ERROS
// =====================================================
app.use((err, req, res, next) => {
  console.error('========================================');
  console.error('[ERRO GLOBAL]');
  console.error('URL:', req.method, req.originalUrl);
  console.error('Mensagem:', err?.message);
  console.error('Nome:', err?.name);
  console.error('Código:', err?.code);
  console.error('Stack:', err?.stack);
  console.error('========================================');

  res.status(500).json({
    erro: 'Erro interno do servidor',
    mensagem: err?.message || 'Erro desconhecido'
  });
});
/* ==========================================
   INICIALIZAÇÃO DO SERVIDOR
========================================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SERVER] Servidor backend rodando na porta ${PORT}`);
  // Testa a conexão SMTP assim que o servidor sobe, e imprime um resultado
  // claro no log (sucesso, "não configurado", ou o motivo exato da falha
  // com uma dica) — em vez de só descobrir que está quebrado quando alguém
  // usa "esqueci minha senha" e o e-mail simplesmente não chega.
  verificarConexaoSmtp();
});
