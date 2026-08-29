const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/* ==========================================
   RELATÓRIOS AVANÇADOS (Excel / PDF)
   Permite ao administrador baixar uma planilha ou PDF
   com tudo o que foi consertado no período, para
   prestação de contas.
========================================== */

const rotulosUrgencia = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta' };
const rotulosStatus = {
  PENDENTE: 'Pendente',
  ATRIBUIDA: 'Atribuída',
  EM_ANDAMENTO: 'Em Andamento',
  IMPEDIMENTO: 'Impedimento',
  CONCLUIDA: 'Concluída',
};

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR');
}

/**
 * Gera um workbook do ExcelJS com as demandas informadas e envia como resposta HTTP.
 */
async function gerarRelatorioExcel(res, demandas, { titulo = 'Relatório de Manutenções' } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Manutenção Predial';
  workbook.created = new Date();

  const planilha = workbook.addWorksheet('Manutenções');

  planilha.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Setor', key: 'setor', width: 16 },
    { header: 'Descrição', key: 'descricao', width: 45 },
    { header: 'Morador', key: 'morador', width: 22 },
    { header: 'Operário', key: 'operario', width: 22 },
    { header: 'Urgência', key: 'urgencia', width: 12 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Aberta em', key: 'aberta_em', width: 20 },
    { header: 'Última atualização', key: 'atualizada_em', width: 20 },
  ];

  planilha.getRow(1).font = { bold: true };
  planilha.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  planilha.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  demandas.forEach((d) => {
    planilha.addRow({
      id: d.id,
      setor: d.setor,
      descricao: d.descricao,
      morador: d.morador?.nome || '-',
      operario: d.operario?.nome || '-',
      urgencia: rotulosUrgencia[d.urgencia_real || d.urgencia_morador] || '-',
      status: rotulosStatus[d.status] || d.status,
      aberta_em: formatarData(d.criado_em),
      atualizada_em: formatarData(d.atualizado_em),
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${titulo.replace(/\s+/g, '_')}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Gera um PDF com as demandas informadas e envia como resposta HTTP (stream).
 */
function gerarRelatorioPDF(res, demandas, { titulo = 'Relatório de Manutenções' } = {}) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${titulo.replace(/\s+/g, '_')}.pdf"`);

  doc.pipe(res);

  doc.fontSize(18).fillColor('#1e293b').text('🏢 Sistema de Manutenção Predial', { align: 'left' });
  doc.fontSize(14).fillColor('#334155').text(titulo, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#64748b').text(`Gerado em: ${formatarData(new Date())}`);
  doc.moveDown(1);

  if (demandas.length === 0) {
    doc.fontSize(11).fillColor('#334155').text('Nenhuma demanda encontrada para o período selecionado.');
  }

  demandas.forEach((d, index) => {
    if (index > 0) doc.moveDown(0.6);

    doc.fontSize(11).fillColor('#1e293b').text(`#${d.id} — ${d.setor}`, { continued: false });
    doc.fontSize(9).fillColor('#475569').text(d.descricao);
    doc.fontSize(8).fillColor('#64748b').text(
      `Morador: ${d.morador?.nome || '-'}   |   Operário: ${d.operario?.nome || '-'}   |   ` +
      `Urgência: ${rotulosUrgencia[d.urgencia_real || d.urgencia_morador] || '-'}   |   Status: ${rotulosStatus[d.status] || d.status}`
    );
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Aberta em: ${formatarData(d.criado_em)}   |   Última atualização: ${formatarData(d.atualizado_em)}`
    );
    doc.moveTo(doc.x, doc.y + 4).lineTo(555, doc.y + 4).strokeColor('#e2e8f0').stroke();
  });

  doc.end();
}

module.exports = { gerarRelatorioExcel, gerarRelatorioPDF };
