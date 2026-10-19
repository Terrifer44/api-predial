const express = require('express');
const { ErroHttp, exigir } = require('../lib/erros');
const V = require('../lib/validacao');
const { STATUS } = require('../lib/dominio');
const { gerarRelatorioExcel, gerarRelatorioPDF } = require('../lib/relatorios');
function criarRotasRelatorios({ prisma, auth }) {
  const router = express.Router();
  for (const [formato, gerar] of [['excel', gerarRelatorioExcel], ['pdf', gerarRelatorioPDF]]) {
    router.get(`/api/relatorios/${formato}`, auth.APENAS_ADMIN, async (req, res) => {
      const { mes, ano, status, operario } = req.query;
      const where = {};
      if (status) where.status = exigir(V.enumerado(status, STATUS, 'Status'));
      if (operario) where.id_operario = exigir(V.idPositivo(operario, 'Operário'));
      if (mes && !ano) throw new ErroHttp(400, 'Informe o ano para filtrar por mês.');
      if (ano) {
        const a = Number(ano), m = Number(mes || 1);
        if (!Number.isInteger(a) || a < 2000 || a > 2200 || !Number.isInteger(m) || m < 1 || m > 12) throw new ErroHttp(400, 'Período inválido.');
        where.criado_em = { gte: new Date(Date.UTC(a, m - 1, 1)), lt: new Date(Date.UTC(mes ? a : a + 1, mes ? m : 0, 1)) };
      }
      if (await prisma.demanda.count({ where }) > 5000) throw new ErroHttp(400, 'Selecione um período menor (máximo de 5.000 demandas por relatório).');
      const demandas = await prisma.demanda.findMany({ where, include: { morador: { select: { nome: true } }, operario: { select: { nome: true } } }, orderBy: { criado_em: 'desc' }, take: 5000 });
      await gerar(res, demandas, { titulo: 'Relatorio_Manutencoes' });
    });
  }
  return router;
}
module.exports = { criarRotasRelatorios };
