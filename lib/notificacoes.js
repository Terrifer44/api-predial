/* ==========================================
   NOTIFICAÇÕES INTERNAS (sino no cabeçalho)
   Complementam o envio de e-mail, para o morador
   ver o aviso mesmo sem checar a caixa de entrada.
========================================== */

/**
 * Cria uma notificação interna para um usuário.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function criarNotificacao(prisma, { id_usuario, id_demanda, titulo, mensagem }) {
  try {
    return await prisma.notificacao.create({
      data: { id_usuario, id_demanda, titulo, mensagem },
    });
  } catch (error) {
    console.error('[NOTIFICACAO] Erro ao criar notificação interna:', error.message);
    return null;
  }
}

module.exports = { criarNotificacao };
