const express = require('express');
const crypto = require('crypto');

const V = require('../lib/validacao');
const D = require('../lib/dominio');
const { ErroHttp, exigir } = require('../lib/erros');

// Alfabeto sem caracteres ambíguos (0/O, 1/I) para códigos fáceis de ditar/digitar.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const gerarCodigoAleatorio = (tamanho = 10) => Array.from(crypto.randomBytes(tamanho), (b) => ALFABETO[b % ALFABETO.length]).join('');

function criarRotasAdmin({ prisma, auth }) {
  const router = express.Router();
  const { APENAS_ADMIN } = auth;

  /**
   * Regras para excluir um usuário (usada pela exclusão direta e pela exclusão de código).
   * Nunca apaga histórico: se há registros relacionados, recusa e orienta a BLOQUEAR a conta.
   */
  async function validarExclusaoUsuario(tx, alvo, solicitante) {
    if (alvo.id === solicitante.id) throw new ErroHttp(400, 'Você não pode excluir a própria conta.');
    if (alvo.tipo_usuario === 'ADMINISTRADOR') throw new ErroHttp(403, 'Contas de administrador não podem ser excluídas por esta tela.');
    const [comoMorador, comoOperario, historicos, comentarios] = await Promise.all([
      tx.demanda.count({ where: { id_morador: alvo.id } }),
      tx.demanda.count({ where: { id_operario: alvo.id } }),
      tx.historicoStatus.count({ where: { id_usuario_modificador: alvo.id } }),
      tx.comentarioDemanda.count({ where: { id_usuario: alvo.id } }),
    ]);
    if (comoMorador + comoOperario + historicos + comentarios > 0) {
      throw new ErroHttp(409, `${alvo.nome} possui demandas, histórico ou mensagens registrados e não pode ser excluído sem perder informações. Bloqueie o acesso do usuário em vez de excluir.`, { codigo: 'USUARIO_COM_HISTORICO' });
    }
  }

  /* ---------------- CÓDIGOS DE LIBERAÇÃO ---------------- */
  router.get('/api/codigos-liberacao', APENAS_ADMIN, async (req, res) => {
    const codigos = await prisma.codigoLiberacao.findMany({ orderBy: { id: 'desc' }, take: 500 });
    const agora = new Date();
    return res.json(codigos.map((c) => ({ ...c, expirado: Boolean(c.expira_em && new Date(c.expira_em) < agora && !c.usado) })));
  });

  router.post('/api/codigos-liberacao', APENAS_ADMIN, async (req, res) => {
    const b = req.body || {};
    const tipoPedido = typeof b.tipo_usuario === 'string' ? b.tipo_usuario.trim().toUpperCase() : '';
    if (tipoPedido === 'ADMINISTRADOR') {
      throw new ErroHttp(403, 'Códigos de Administrador não podem ser gerados por esta tela. A criação de administradores é feita somente no servidor (seed/banco de dados).');
    }
    const tipo = exigir(V.enumerado(tipoPedido, D.TIPOS_LIBERAVEIS_PELA_TELA, 'Tipo de perfil'));

    // Código opcional: se não vier, é gerado aleatoriamente (difícil de adivinhar).
    const semCodigo = b.codigo === undefined || b.codigo === null || String(b.codigo).trim() === '';
    const codigo = semCodigo ? gerarCodigoAleatorio() : exigir(V.codigoAcesso(b.codigo));

    let validadeDias = 7;
    if (b.validade_dias !== undefined && b.validade_dias !== null && b.validade_dias !== '') {
      validadeDias = Number(b.validade_dias);
      if (!Number.isInteger(validadeDias) || validadeDias < 1 || validadeDias > 90) throw new ErroHttp(400, 'A validade deve ser de 1 a 90 dias.');
    }

    if (await prisma.usuario.findUnique({ where: { codigo_acesso: codigo } })) throw new ErroHttp(409, 'Este código já está em uso por um usuário. Escolha outro.');
    const novo = await prisma.codigoLiberacao.create({
      data: { codigo, tipo_usuario: tipo, usado: false, expira_em: new Date(Date.now() + validadeDias * 24 * 3600 * 1000) },
    });
    console.log(`[ADMIN] usuário #${req.usuarioAutenticado.id} criou código de liberação #${novo.id} (${novo.tipo_usuario}).`);
    return res.status(201).json(novo);
  });

  // Excluir um código também exclui o usuário que se cadastrou com ele — desde que isso não
  // destrua histórico (nesse caso nada é apagado e o admin é orientado a bloquear a conta).
  router.delete('/api/codigos-liberacao/:id', APENAS_ADMIN, async (req, res) => {
    const id = exigir(V.idPositivo(req.params.id, 'Código'));
    const nomeExcluido = await prisma.$transaction(async (tx) => {
      const codigo = await tx.codigoLiberacao.findUnique({ where: { id } });
      if (!codigo) throw new ErroHttp(404, 'Código não encontrado.');
      let excluido = null;
      if (codigo.usado) {
        const usuario = await tx.usuario.findUnique({ where: { codigo_acesso: codigo.codigo } });
        if (usuario) {
          await validarExclusaoUsuario(tx, usuario, req.usuarioAutenticado);
          await tx.usuario.delete({ where: { id: usuario.id } });
          excluido = usuario.nome;
        }
      }
      await tx.codigoLiberacao.delete({ where: { id } });
      return excluido;
    });
    console.log(`[ADMIN] usuário #${req.usuarioAutenticado.id} excluiu o código #${id}${nomeExcluido ? ' e o usuário vinculado' : ''}.`);
    return res.json({
      mensagem: nomeExcluido ? `Código e usuário "${nomeExcluido}" excluídos com sucesso.` : 'Código de liberação removido com sucesso.',
      usuario_excluido: Boolean(nomeExcluido),
    });
  });

  /* ---------------- USUÁRIOS ---------------- */
  router.get('/api/usuarios', APENAS_ADMIN, async (req, res) => {
    const where = { tipo_usuario: { in: ['MORADOR', 'OPERARIO'] } };
    if (typeof req.query.busca === 'string' && req.query.busca.trim()) {
      const termo = req.query.busca.trim().slice(0, 100);
      where.OR = [{ nome: { contains: termo } }, { codigo_acesso: { contains: termo.toUpperCase() } }];
    }
    if (req.query.tipo) where.tipo_usuario = exigir(V.enumerado(req.query.tipo, ['MORADOR', 'OPERARIO'], 'Tipo'));
    if (req.query.ativo === 'true' || req.query.ativo === 'false') where.ativo = req.query.ativo === 'true';
    // select explícito: NUNCA devolve senha_hash, reset_token e afins.
    return res.json(await prisma.usuario.findMany({ where, select: D.SELECT_USUARIO_PUBLICO, orderBy: { nome: 'asc' }, take: 500 }));
  });

  router.put('/api/usuarios/:id/status', APENAS_ADMIN, async (req, res) => {
    const id = exigir(V.idPositivo(req.params.id, 'Usuário'));
    const ativo = exigir(V.booleano(req.body?.ativo, 'O campo "ativo"'));
    const alvo = await prisma.usuario.findUnique({ where: { id } });
    if (!alvo) throw new ErroHttp(404, 'Usuário não encontrado.');
    if (alvo.id === req.usuarioAutenticado.id) throw new ErroHttp(400, 'Você não pode bloquear a própria conta.');
    if (alvo.tipo_usuario === 'ADMINISTRADOR') throw new ErroHttp(403, 'Contas de administrador não podem ser bloqueadas por esta tela.');
    const atualizado = await prisma.usuario.update({ where: { id }, data: { ativo, ...(!ativo && { sessao_versao: { increment: 1 } }) }, select: D.SELECT_USUARIO_PUBLICO });
    console.log(`[ADMIN] usuário #${req.usuarioAutenticado.id} ${ativo ? 'desbloqueou' : 'bloqueou'} o usuário #${id}.`);
    return res.json(atualizado);
  });

  router.delete('/api/usuarios/:id', APENAS_ADMIN, async (req, res) => {
    const id = exigir(V.idPositivo(req.params.id, 'Usuário'));
    await prisma.$transaction(async (tx) => {
      const alvo = await tx.usuario.findUnique({ where: { id } });
      if (!alvo) throw new ErroHttp(404, 'Usuário não encontrado.');
      await validarExclusaoUsuario(tx, alvo, req.usuarioAutenticado);
      await tx.usuario.delete({ where: { id } });
      await tx.codigoLiberacao.deleteMany({ where: { codigo: alvo.codigo_acesso } }); // o código sai junto (decisão de negócio)
    });
    console.log(`[ADMIN] usuário #${req.usuarioAutenticado.id} excluiu o usuário #${id}.`);
    return res.json({ mensagem: 'Usuário e código de liberação excluídos com sucesso.' });
  });

  router.get('/api/operarios', APENAS_ADMIN, async (req, res) => {
    return res.json(await prisma.usuario.findMany({ where: { tipo_usuario: 'OPERARIO', ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }));
  });

  return router;
}

module.exports = { criarRotasAdmin, gerarCodigoAleatorio };
