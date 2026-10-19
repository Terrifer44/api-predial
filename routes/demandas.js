const express = require('express');

const V = require('../lib/validacao');
const D = require('../lib/dominio');
const { ErroHttp, exigir } = require('../lib/erros');
const { criarNotificacao } = require('../lib/notificacoes');

const INCLUDE_LISTA = {
  morador: { select: { id: true, nome: true, telefone: true } },
  operario: { select: { id: true, nome: true } },
};
const INCLUDE_COM_EMAIL = {
  morador: { select: { id: true, nome: true, telefone: true, email: true } },
  operario: { select: { id: true, nome: true } },
};
const semEmail = (d) => (d?.morador ? { ...d, morador: { id: d.morador.id, nome: d.morador.nome, telefone: d.morador.telefone } } : d);

function dataDaQuery(valor, campo) {
  if (valor === undefined || valor === '') return null;
  const d = new Date(String(valor));
  if (Number.isNaN(d.getTime())) throw new ErroHttp(400, `${campo} inválida.`);
  return d;
}

/** Filtros e paginação opcionais (sem parâmetros = lista completa, como antes). */
function montarConsulta(query, { permitirOperario = false } = {}) {
  const where = {};
  if (query.status) where.status = exigir(V.enumerado(query.status, D.STATUS, 'Status'));
  if (query.urgencia) {
    const u = exigir(V.enumerado(query.urgencia, D.URGENCIAS, 'Urgência'));
    where.OR = [{ urgencia_real: u }, { urgencia_real: null, urgencia_morador: u }];
  }
  if (typeof query.busca === 'string' && query.busca.trim()) {
    const termo = query.busca.trim().slice(0, 100);
    const condicoes = [{ descricao: { contains: termo } }, { setor: { contains: termo.toUpperCase() } }];
    const numero = Number(termo.replace('#', ''));
    if (Number.isInteger(numero) && numero > 0) condicoes.push({ id: numero });
    where.AND = [{ OR: condicoes }];
  }
  if (permitirOperario && query.operario) where.id_operario = exigir(V.idPositivo(query.operario, 'Operário'));
  const de = dataDaQuery(query.de, 'Data inicial');
  const ate = dataDaQuery(query.ate, 'Data final');
  if (de || ate) where.criado_em = { ...(de && { gte: de }), ...(ate && { lt: new Date(ate.getTime() + 24 * 3600 * 1000) }) };
  if (query.atrasadas === 'true') {
    where.sla_prazo = { lt: new Date() };
    where.status = where.status || { not: 'CONCLUIDA' };
  }
  const limite = Math.min(Math.max(parseInt(query.limite, 10) || 200, 1), 500);
  const pagina = Math.max(parseInt(query.pagina, 10) || 1, 1);
  return { where, take: limite, skip: (pagina - 1) * limite };
}

function criarRotasDemandas({ prisma, auth, email, armazenamento }) {
  const router = express.Router();
  const { exigirAutenticacao, exigirPerfil, APENAS_ADMIN } = auth;
  const { uploadFoto, obterDadosArquivoEnviado, removerArquivo } = armazenamento;

  const descartarArquivo = async ({ url, publicId }) => {
    if (!url) return;
    try { await removerArquivo({ url, publicId }); } catch (e) { console.error('[UPLOAD] Não foi possível descartar o arquivo:', e.message); }
  };

  const podeVer = (u, d) => u.tipo_usuario === 'ADMINISTRADOR'
    || (u.tipo_usuario === 'MORADOR' && d.id_morador === u.id)
    || (u.tipo_usuario === 'OPERARIO' && d.id_operario === u.id);

  async function carregarDemandaAutorizada(req) {
    const id = exigir(V.idPositivo(req.params.id, 'Demanda'));
    const demanda = await prisma.demanda.findUnique({ where: { id } });
    if (!demanda) throw new ErroHttp(404, 'Demanda não encontrada.');
    if (!podeVer(req.usuarioAutenticado, demanda)) throw new ErroHttp(403, 'Você não tem acesso a esta demanda.');
    return demanda;
  }

  async function listar(res, where, take, skip) {
    const [total, itens] = await Promise.all([
      prisma.demanda.count({ where }),
      prisma.demanda.findMany({ where, include: INCLUDE_LISTA, orderBy: { id: 'desc' }, take, skip }),
    ]);
    res.set('X-Total-Count', String(total));
    return res.json(itens);
  }

  /* ---------------- CRIAÇÃO (somente morador, sempre em nome de si mesmo) ---------------- */
  router.post('/api/demandas', exigirPerfil('MORADOR'), uploadFoto, async (req, res) => {
    const arquivo = obterDadosArquivoEnviado(req.file);
    try {
      const b = req.body || {};
      const setor = exigir(V.enumerado(b.setor, D.SETORES, 'Setor'));
      const descricao = exigir(V.texto(b.descricao, { campo: 'Descrição', min: 5, max: 2000 }));
      const urgencia = exigir(V.enumerado(b.urgencia_morador, D.URGENCIAS, 'Urgência'));
      const idMorador = req.usuarioAutenticado.id;

      const nova = await prisma.$transaction(async (tx) => {
        const demanda = await tx.demanda.create({
          data: { setor, descricao, urgencia_morador: urgencia, id_morador: idMorador, status: 'PENDENTE', foto_url: arquivo.url, foto_public_id: arquivo.publicId },
        });
        await tx.historicoStatus.create({
          data: { id_demanda: demanda.id, id_usuario_modificador: idMorador, status_novo: 'PENDENTE', comentario: 'Solicitação aberta pelo morador.' },
        });
        return demanda;
      });
      return res.status(201).json(nova);
    } catch (erro) {
      await descartarArquivo(arquivo); // não deixa imagem órfã se a validação/gravação falhar
      throw erro;
    }
  });

  /* ---------------- LISTAGENS ---------------- */
  router.get('/api/demandas', APENAS_ADMIN, async (req, res) => {
    const { where, take, skip } = montarConsulta(req.query, { permitirOperario: true });
    return listar(res, where, take, skip);
  });

  router.get('/api/demandas/morador/:idMorador', exigirPerfil('MORADOR', 'ADMINISTRADOR'), async (req, res) => {
    const idMorador = exigir(V.idPositivo(req.params.idMorador, 'Morador'));
    if (req.usuarioAutenticado.tipo_usuario === 'MORADOR' && req.usuarioAutenticado.id !== idMorador) {
      throw new ErroHttp(403, 'Você só pode consultar as suas próprias demandas.');
    }
    const { where, take, skip } = montarConsulta(req.query);
    return listar(res, { ...where, id_morador: idMorador }, take, skip);
  });

  router.get('/api/demandas/operario/:idOperario', exigirPerfil('OPERARIO', 'ADMINISTRADOR'), async (req, res) => {
    const idOperario = exigir(V.idPositivo(req.params.idOperario, 'Operário'));
    if (req.usuarioAutenticado.tipo_usuario === 'OPERARIO' && req.usuarioAutenticado.id !== idOperario) {
      throw new ErroHttp(403, 'Você só pode consultar as suas próprias tarefas.');
    }
    const { where, take, skip } = montarConsulta(req.query);
    return listar(res, { ...where, id_operario: idOperario }, take, skip);
  });

  /* ---------------- TRIAGEM / ATRIBUIÇÃO (somente administrador) ---------------- */
  router.put('/api/demandas/:id/atribuir', APENAS_ADMIN, async (req, res) => {
    const id = exigir(V.idPositivo(req.params.id, 'Demanda'));
    const idOperario = exigir(V.idPositivo(req.body?.id_operario, 'Operário'));
    const urgencia = exigir(V.enumerado(req.body?.urgencia_real, D.URGENCIAS, 'Urgência real'));

    const demanda = await prisma.demanda.findUnique({ where: { id } });
    if (!demanda) throw new ErroHttp(404, 'Demanda não encontrada.');
    if (!D.STATUS_ATRIBUIVEIS.includes(demanda.status)) throw new ErroHttp(409, 'Demandas concluídas não podem ser reatribuídas.');

    const operario = await prisma.usuario.findUnique({ where: { id: idOperario }, select: { id: true, nome: true, tipo_usuario: true, ativo: true } });
    if (!operario || operario.tipo_usuario !== 'OPERARIO' || !operario.ativo) throw new ErroHttp(400, 'Operário inválido ou inativo.');

    const sla = demanda.sla_prazo || D.calcularSlaPrazo(urgencia);
    await prisma.$transaction(async (tx) => {
      // Condição "status = status lido" evita sobrescrever uma mudança simultânea.
      const r = await tx.demanda.updateMany({
        where: { id, status: demanda.status },
        data: { id_operario: idOperario, urgencia_real: urgencia, status: 'ATRIBUIDA', sla_prazo: sla, motivo_impedimento: null },
      });
      if (r.count !== 1) throw new ErroHttp(409, 'A demanda foi alterada por outra pessoa. Atualize a tela e tente novamente.');
      await tx.historicoStatus.create({
        data: {
          id_demanda: id, id_usuario_modificador: req.usuarioAutenticado.id,
          status_anterior: demanda.status, status_novo: 'ATRIBUIDA',
          comentario: `Triagem: operário ${operario.nome} (#${operario.id}), urgência ${urgencia}.`,
        },
      });
    });

    const atual = await prisma.demanda.findUnique({ where: { id }, include: INCLUDE_COM_EMAIL });
    await criarNotificacao(prisma, { id_usuario: atual.id_morador, id_demanda: id, titulo: 'Demanda atribuída a um operário', mensagem: `Sua demanda #${id} (${atual.setor}) já está na fila de atendimento.` });
    await criarNotificacao(prisma, { id_usuario: idOperario, id_demanda: id, titulo: 'Nova tarefa atribuída', mensagem: `A demanda #${id} (${atual.setor}) foi atribuída a você.` });
    email.notificarAtribuicao(atual.morador, atual).catch(() => {});
    return res.json(semEmail(atual));
  });

  /* ---------------- ATUALIZAÇÃO DE STATUS (somente o operário responsável) ---------------- */
  router.put('/api/demandas/:id/status-operario', exigirPerfil('OPERARIO'), async (req, res) => {
    const id = exigir(V.idPositivo(req.params.id, 'Demanda'));
    const novoStatus = exigir(V.enumerado(req.body?.novo_status, ['EM_ANDAMENTO', 'CONCLUIDA', 'IMPEDIMENTO'], 'Status'));
    const observacao = exigir(V.texto(req.body?.motivo_impedimento, { campo: 'Observação', min: 3, max: 500, opcional: true }));
    if (novoStatus === 'IMPEDIMENTO' && !observacao) throw new ErroHttp(400, 'Informe o motivo do impedimento.');

    const demanda = await prisma.demanda.findUnique({ where: { id } });
    if (!demanda) throw new ErroHttp(404, 'Demanda não encontrada.');
    if (demanda.id_operario !== req.usuarioAutenticado.id) throw new ErroHttp(403, 'Esta demanda não está atribuída a você.');
    if (demanda.status === 'CONCLUIDA') throw new ErroHttp(409, 'Esta demanda já foi concluída e não pode mais ser alterada.');
    if (!D.transicaoPermitida(demanda.status, novoStatus)) throw new ErroHttp(409, `Não é possível mudar a demanda de ${demanda.status} para ${novoStatus}.`);

    await prisma.$transaction(async (tx) => {
      const r = await tx.demanda.updateMany({
        where: { id, id_operario: req.usuarioAutenticado.id, status: demanda.status },
        data: { status: novoStatus, motivo_impedimento: novoStatus === 'IMPEDIMENTO' ? observacao : null },
      });
      if (r.count !== 1) throw new ErroHttp(409, 'A demanda foi alterada por outra pessoa. Atualize a tela e tente novamente.');
      await tx.historicoStatus.create({
        data: {
          id_demanda: id, id_usuario_modificador: req.usuarioAutenticado.id,
          status_anterior: demanda.status, status_novo: novoStatus,
          comentario: observacao || `Status alterado para ${novoStatus}`,
        },
      });
    });

    const atual = await prisma.demanda.findUnique({ where: { id }, include: INCLUDE_COM_EMAIL });
    const [titulo, mensagem, enviar] = {
      EM_ANDAMENTO: ['Serviço iniciado', `O operário iniciou o atendimento da sua demanda #${id}.`, email.notificarInicioServico],
      CONCLUIDA: ['Serviço concluído', `Sua demanda #${id} foi concluída.`, email.notificarConclusaoServico],
      IMPEDIMENTO: ['Impedimento no atendimento', `Houve um impedimento na sua demanda #${id}: ${observacao}.`, email.notificarImpedimento],
    }[novoStatus];
    await criarNotificacao(prisma, { id_usuario: atual.id_morador, id_demanda: id, titulo, mensagem });
    enviar(atual.morador, atual).catch(() => {});
    return res.json(semEmail(atual));
  });

  /* ---------------- EXCLUSÃO DA DEMANDA (somente administrador) ---------------- */
  router.delete('/api/demandas/:id', APENAS_ADMIN, async (req, res) => {
    const id = exigir(V.idPositivo(req.params.id, 'Demanda'));
    const demanda = await prisma.demanda.findUnique({ where: { id } });
    if (!demanda) throw new ErroHttp(404, 'Demanda não encontrada.');
    await prisma.demanda.delete({ where: { id } }); // histórico e comentários saem em cascata (schema)
    console.log(`[ADMIN] usuário #${req.usuarioAutenticado.id} excluiu a demanda #${id}.`);
    return res.json({ mensagem: 'Demanda removida com sucesso.' });
  });

  /* ---------------- FOTO ---------------- */
  router.get('/api/demandas/:id/foto', exigirAutenticacao, async (req, res) => {
    const demanda = await carregarDemandaAutorizada(req);
    if (!demanda.foto_url) throw new ErroHttp(404, 'Esta demanda não possui foto.');
    return armazenamento.enviarArquivo(res, demanda);
  });
  router.delete('/api/demandas/:id/foto', exigirAutenticacao, async (req, res) => {
    const demanda = await carregarDemandaAutorizada(req);
    const u = req.usuarioAutenticado;
    // Morador só remove a própria foto enquanto a demanda ainda não passou pela triagem.
    const permitido = u.tipo_usuario === 'ADMINISTRADOR' || (u.tipo_usuario === 'MORADOR' && demanda.status === 'PENDENTE');
    if (!permitido) throw new ErroHttp(403, 'Você não pode remover a foto desta demanda.');
    if (!demanda.foto_url) throw new ErroHttp(404, 'Esta demanda não possui foto.');

    // Desvincula primeiro, sem apagar arquivos externos automaticamente. Limpeza física manual documentada.
    const r = await prisma.demanda.updateMany({ where: { id: demanda.id, foto_url: demanda.foto_url, status: demanda.status }, data: { foto_url: null, foto_public_id: null } });
    if (!r.count) throw new ErroHttp(409, 'A demanda mudou. Atualize a tela.');
    return res.json({ mensagem: 'Foto removida da demanda. A limpeza do armazenamento é feita pela administração.' });
  });

  /* ---------------- HISTÓRICO ---------------- */
  router.get('/api/demandas/:id/historico', exigirAutenticacao, async (req, res) => {
    const demanda = await carregarDemandaAutorizada(req);
    return res.json(await prisma.historicoStatus.findMany({
      where: { id_demanda: demanda.id },
      include: { usuario: { select: { nome: true, tipo_usuario: true } } },
      orderBy: { criado_em: 'desc' },
    }));
  });

  /* ---------------- CHAT ---------------- */
  router.get('/api/demandas/:id/comentarios', exigirAutenticacao, async (req, res) => {
    const demanda = await carregarDemandaAutorizada(req);
    res.set('X-Demanda-Status', demanda.status);
    const apos = req.query.apos ? exigir(V.idPositivo(req.query.apos, 'Cursor')) : null;
    return res.json(await prisma.comentarioDemanda.findMany({
      where: { id_demanda: demanda.id, ...(apos && { id: { gt: apos } }) },
      include: { usuario: { select: { id: true, nome: true, tipo_usuario: true } } },
      orderBy: { id: 'asc' },
      take: 500,
    }));
  });

  router.post('/api/demandas/:id/comentarios', exigirAutenticacao, async (req, res) => {
    const demanda = await carregarDemandaAutorizada(req);
    const mensagem = exigir(V.texto(req.body?.mensagem, { campo: 'Mensagem', min: 1, max: 1000 }));
    // Regra no servidor: depois de concluída, a conversa é somente leitura.
    if (demanda.status === 'CONCLUIDA') {
      throw new ErroHttp(409, 'Conversa encerrada: esta demanda já foi concluída.', { codigo: 'CHAT_ENCERRADO' });
    }
    const u = req.usuarioAutenticado;
    const novo = await prisma.$transaction(async (tx) => {
      // UPDATE condicional mantém o bloqueio da linha até gravar a mensagem. Conclusão/reatribuição concorrentes aguardam.
      const acesso = u.tipo_usuario === 'ADMINISTRADOR' ? {} : u.tipo_usuario === 'MORADOR' ? { id_morador: u.id } : { id_operario: u.id };
      const lock = await tx.demanda.updateMany({ where: { id: demanda.id, status: { not: 'CONCLUIDA' }, ...acesso }, data: { atualizado_em: new Date() } });
      if (lock.count !== 1) throw new ErroHttp(409, 'A demanda foi concluída ou reatribuída. Atualize a tela.', { codigo: 'CHAT_ENCERRADO' });
      return tx.comentarioDemanda.create({
        data: { id_demanda: demanda.id, id_usuario: u.id, mensagem },
        include: { usuario: { select: { id: true, nome: true, tipo_usuario: true } } },
      });
    });
    const destinos = new Set([demanda.id_morador, demanda.id_operario].filter((x) => x && x !== u.id));
    for (const idDestino of destinos) {
      await criarNotificacao(prisma, { id_usuario: idDestino, id_demanda: demanda.id, titulo: 'Nova mensagem', mensagem: `Há uma nova mensagem na demanda #${demanda.id}.` });
    }
    return res.status(201).json(novo);
  });

  return router;
}

module.exports = { criarRotasDemandas };
