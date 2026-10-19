const express = require('express');
const V = require('../lib/validacao');
const { ErroHttp, exigir } = require('../lib/erros');

/** Cada usuário só lê/altera as PRÓPRIAS notificações (admin pode consultar as de qualquer um). */
function criarRotasNotificacoes({ prisma, auth }) {
  const router = express.Router();
  const { exigirAutenticacao } = auth;
  const ehAdmin = (u) => u.tipo_usuario === 'ADMINISTRADOR';

  router.get('/api/notificacoes/:idUsuario', exigirAutenticacao, async (req, res) => {
    const idUsuario = exigir(V.idPositivo(req.params.idUsuario, 'Usuário'));
    if (!ehAdmin(req.usuarioAutenticado) && req.usuarioAutenticado.id !== idUsuario) throw new ErroHttp(403, 'Você só pode consultar as suas próprias notificações.');
    return res.json(await prisma.notificacao.findMany({ where: { id_usuario: idUsuario }, orderBy: { criado_em: 'desc' }, take: 30 }));
  });

  router.put('/api/notificacoes/:id/lida', exigirAutenticacao, async (req, res) => {
    const id = exigir(V.idPositivo(req.params.id, 'Notificação'));
    const n = await prisma.notificacao.findUnique({ where: { id } });
    if (!n) throw new ErroHttp(404, 'Notificação não encontrada.');
    if (!ehAdmin(req.usuarioAutenticado) && n.id_usuario !== req.usuarioAutenticado.id) throw new ErroHttp(403, 'Esta notificação não pertence a você.');
    return res.json(await prisma.notificacao.update({ where: { id }, data: { lida: true } }));
  });

  router.put('/api/notificacoes/:idUsuario/marcar-todas', exigirAutenticacao, async (req, res) => {
    const idUsuario = exigir(V.idPositivo(req.params.idUsuario, 'Usuário'));
    if (!ehAdmin(req.usuarioAutenticado) && req.usuarioAutenticado.id !== idUsuario) throw new ErroHttp(403, 'Você só pode alterar as suas próprias notificações.');
    await prisma.notificacao.updateMany({ where: { id_usuario: idUsuario, lida: false }, data: { lida: true } });
    return res.json({ mensagem: 'Notificações marcadas como lidas.' });
  });

  return router;
}

module.exports = { criarRotasNotificacoes };
