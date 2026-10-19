const { verificarToken } = require('./token');

/**
 * Autenticação/autorização por token assinado (Authorization: Bearer ...).
 * Perfil (tipo_usuario) e status (ativo) são SEMPRE lidos do banco a cada requisição —
 * nunca confiados ao token — então bloquear um usuário ou trocar a senha vale na hora.
 */
function criarAuth({ prisma, segredo }) {
  async function identificarUsuario(req, res, next) {
    req.usuarioAutenticado = null;
    const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
    if (!m) return next();
    const payload = verificarToken(m[1], segredo);
    if (!payload || !Number.isInteger(payload.sub)) return next();

    try {
      const u = await prisma.usuario.findUnique({
        where: { id: payload.sub },
        select: { id: true, nome: true, codigo_acesso: true, telefone: true, email: true, tipo_usuario: true, ativo: true, senha_alterada_em: true, sessao_versao: true },
      });
      if (u && u.ativo) {
        const anteriorATroca = u.senha_alterada_em && payload.iat < Math.floor(new Date(u.senha_alterada_em).getTime() / 1000);
        if (!anteriorATroca && payload.sv === u.sessao_versao) req.usuarioAutenticado = u;
      }
    } catch (error) {
      console.error('[AUTH] Falha ao carregar sessão:', error.code || 'DATABASE_ERROR');
    }
    next();
  }

  const exigirAutenticacao = (req, res, next) => {
    if (!req.usuarioAutenticado) return res.status(401).json({ erro: 'Não autenticado. Faça login novamente.' });
    next();
  };

  const exigirPerfil = (...perfis) => (req, res, next) => {
    if (!req.usuarioAutenticado) return res.status(401).json({ erro: 'Não autenticado. Faça login novamente.' });
    if (!perfis.includes(req.usuarioAutenticado.tipo_usuario)) return res.status(403).json({ erro: 'Você não tem permissão para executar esta ação.' });
    next();
  };

  return { identificarUsuario, exigirAutenticacao, exigirPerfil, APENAS_ADMIN: exigirPerfil('ADMINISTRADOR') };
}

module.exports = { criarAuth };
