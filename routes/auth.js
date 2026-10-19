const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const V = require('../lib/validacao');
const { ErroHttp, exigir } = require('../lib/erros');
const { assinarToken, sha256 } = require('../lib/token');

// Senhas que jamais deveriam estar em uso (contas de teste/seed). Quem entrar com uma delas é avisado.
const SENHAS_PADRAO = ['admin123', 'Teste@123', '123456', '12345678', 'senha123', 'password'];

const MSG_LOGIN = 'Código de acesso ou senha inválidos.';
const MSG_CODIGO = 'Código de liberação inválido, expirado ou já utilizado.';
const MSG_RESET_GENERICA = 'Se o código de acesso existir e tiver um e-mail cadastrado, um link de redefinição foi enviado.';
const MSG_RESET_INVALIDO = 'Link de redefinição inválido ou expirado. Solicite um novo.';

// Hash falso: iguala o tempo de resposta quando o usuário não existe (evita enumeração por tempo).
const HASH_FALSO = bcrypt.hashSync('senha-falsa-para-igualar-tempo', 10);

const agoraEmSegundos = () => new Date(Math.floor(Date.now() / 1000) * 1000);
const normalizarCodigo = (v) => (typeof v === 'string' ? v.trim().toUpperCase() : '');

function criarRotasAuth({ prisma, auth, config, email }) {
  const router = express.Router();
  const { exigirAutenticacao } = auth;
  const { loginIp, loginCodigo, cadastroIp, esqueciIp, esqueciCodigo, redefinirIp, trocaSenhaUsuario } = config.limitadores;

  const emitirToken = (u) => assinarToken({ sub: u.id, sv: u.sessao_versao }, config.segredo, config.sessaoSegundos);

  /* ---------------- LOGIN ---------------- */
  router.post(['/login', '/api/login'], loginIp, async (req, res) => {
    const codigo = normalizarCodigo(req.body?.codigo_acesso);
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
    if (!codigo || !senha || codigo.length > 64 || senha.length > 200) {
      return res.status(400).json({ erro: 'Informe o código de acesso e a senha.' });
    }
    // Limite por conta: bloqueia adivinhação de senha de um código específico, de qualquer IP.
    if (loginCodigo.verificar(res, codigo)) return;

    const usuario = await prisma.usuario.findUnique({ where: { codigo_acesso: codigo } });
    const senhaConfere = await bcrypt.compare(senha, usuario?.senha_hash || HASH_FALSO);
    if (!usuario || !senhaConfere) return res.status(401).json({ erro: MSG_LOGIN });
    if (!usuario.ativo) return res.status(403).json({ erro: 'Sua conta está bloqueada. Procure a administração.' }); // só quem sabe a senha vê isto

    return res.json({
      token: emitirToken(usuario),
      usuario_id: usuario.id,
      nome: usuario.nome,
      codigo_acesso: usuario.codigo_acesso,
      tipo_usuario: usuario.tipo_usuario.toLowerCase(),
      telefone: usuario.telefone,
      email: usuario.email,
      trocar_senha: SENHAS_PADRAO.includes(senha),
    });
  });

  /* ---------------- CADASTRO (exige código de liberação) ---------------- */
  router.post(['/cadastro', '/api/cadastro', '/api/cadastrar-morador'], cadastroIp, async (req, res) => {
    const b = req.body || {};
    const codigo = exigir(V.codigoAcesso(b.codigo_liberacao));
    const nome = exigir(V.texto(b.nome, { campo: 'Nome', min: 2, max: 100 }));
    const telefone = exigir(V.telefone(b.telefone));
    const emailUsuario = exigir(V.email(b.email));
    const senha = exigir(V.senha(b.senha));
    const senha_hash = await bcrypt.hash(senha, 10);

    const novo = await prisma.$transaction(async (tx) => {
      const lib = await tx.codigoLiberacao.findUnique({ where: { codigo } });
      const expirado = lib?.expira_em && new Date(lib.expira_em) < new Date();
      if (!lib || lib.usado || expirado || lib.tipo_usuario === 'ADMINISTRADOR') throw new ErroHttp(400, MSG_CODIGO);

      // "Reserva" atômica: só uma requisição consegue marcar o código como usado.
      const reserva = await tx.codigoLiberacao.updateMany({ where: { id: lib.id, usado: false }, data: { usado: true } });
      if (reserva.count !== 1) throw new ErroHttp(400, MSG_CODIGO);

      return tx.usuario.create({
        data: { nome, telefone, email: emailUsuario, codigo_acesso: lib.codigo, senha_hash, tipo_usuario: lib.tipo_usuario, ativo: true },
      });
    });

    return res.status(201).json({ mensagem: 'Cadastro realizado com sucesso!', codigo_acesso: novo.codigo_acesso, tipo_usuario: novo.tipo_usuario });
  });

  /* ---------------- RECUPERAÇÃO DE SENHA ---------------- */
  router.post('/api/esqueci-senha', esqueciIp, async (req, res) => {
    const codigo = normalizarCodigo(req.body?.codigo_acesso);
    if (!codigo || codigo.length > 64) return res.json({ mensagem: MSG_RESET_GENERICA });
    if (esqueciCodigo.verificar(res, codigo)) return;

    const usuario = await prisma.usuario.findUnique({ where: { codigo_acesso: codigo } });
    if (usuario && usuario.ativo && usuario.email) {
      const tokenPuro = crypto.randomBytes(32).toString('hex');
      // No banco fica só o HASH do token (vazamento do banco não permite tomar contas).
      // Um novo pedido substitui o anterior.
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { reset_token: sha256(tokenPuro), reset_token_expira: new Date(Date.now() + 30 * 60 * 1000) },
      });
      const link = `${config.frontendUrl}/redefinir-senha?token=${tokenPuro}`;
      // Sem "await": o tempo de resposta não revela se o código existe.
      email.enviarEmailRedefinicaoSenha(usuario, link).catch(() => {});
    }
    return res.json({ mensagem: MSG_RESET_GENERICA });
  });

  router.post('/api/redefinir-senha', redefinirIp, async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!/^[a-f0-9]{64}$/.test(token)) throw new ErroHttp(400, MSG_RESET_INVALIDO);
    const novaSenha = exigir(V.senha(req.body?.nova_senha, 'Nova senha'));

    const hashToken = sha256(token);
    const usuario = await prisma.usuario.findUnique({ where: { reset_token: hashToken } });
    if (!usuario || !usuario.reset_token_expira || new Date(usuario.reset_token_expira) < new Date()) throw new ErroHttp(400, MSG_RESET_INVALIDO);

    const senha_hash = await bcrypt.hash(novaSenha, 10);
    // Uso único: só quem "consumir" o token (where reset_token = hash) troca a senha.
    const r = await prisma.usuario.updateMany({
      where: { id: usuario.id, reset_token: hashToken, reset_token_expira: { gt: new Date() }, ativo: true },
      data: { senha_hash, reset_token: null, reset_token_expira: null, senha_alterada_em: agoraEmSegundos(), sessao_versao: { increment: 1 } },
    });
    if (r.count !== 1) throw new ErroHttp(400, MSG_RESET_INVALIDO);
    return res.json({ mensagem: 'Senha redefinida com sucesso! Você já pode fazer login.' });
  });

  /* ---------------- PERFIL (qualquer usuário autenticado) ---------------- */
  const SELECT_PERFIL = { id: true, nome: true, codigo_acesso: true, telefone: true, email: true, tipo_usuario: true, criado_em: true };

  router.get('/api/perfil', exigirAutenticacao, async (req, res) => {
    return res.json(await prisma.usuario.findUnique({ where: { id: req.usuarioAutenticado.id }, select: SELECT_PERFIL }));
  });

  // Só nome, telefone e e-mail são editáveis. Código de acesso e perfil NUNCA vêm do cliente.
  router.put('/api/perfil', exigirAutenticacao, async (req, res) => {
    const b = req.body || {};
    const data = {};
    if (b.nome !== undefined) data.nome = exigir(V.texto(b.nome, { campo: 'Nome', min: 2, max: 100 }));
    if (b.telefone !== undefined) data.telefone = exigir(V.telefone(b.telefone));
    if (b.email !== undefined) data.email = exigir(V.email(b.email));
    if (Object.keys(data).length === 0) throw new ErroHttp(400, 'Nenhum campo para atualizar.');
    return res.json(await prisma.usuario.update({ where: { id: req.usuarioAutenticado.id }, data, select: SELECT_PERFIL }));
  });

  router.put('/api/perfil/senha', exigirAutenticacao, trocaSenhaUsuario, async (req, res) => {
    const senhaAtual = typeof req.body?.senha_atual === 'string' ? req.body.senha_atual : '';
    const novaSenha = exigir(V.senha(req.body?.nova_senha, 'Nova senha'));

    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioAutenticado.id } });
    if (!(await bcrypt.compare(senhaAtual, usuario.senha_hash))) throw new ErroHttp(400, 'A senha atual está incorreta.');
    if (senhaAtual === novaSenha) throw new ErroHttp(400, 'A nova senha deve ser diferente da atual.');

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id, senha_hash: usuario.senha_hash },
      data: { senha_hash: await bcrypt.hash(novaSenha, 10), senha_alterada_em: agoraEmSegundos(), reset_token: null, reset_token_expira: null, sessao_versao: { increment: 1 } },
    });
    // Outras sessões deste usuário deixam de valer; devolvemos um token novo para a sessão atual.
    return res.json({ mensagem: 'Senha alterada com sucesso.', token: emitirToken(atualizado) });
  });

  return router;
}

module.exports = { criarRotasAuth, SENHAS_PADRAO };
