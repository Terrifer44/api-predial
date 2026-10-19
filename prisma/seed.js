/* Seed inicial seguro: não contém senha padrão ou credencial publicada. */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const nome = process.env.ADMIN_SEED_NAME;
  const codigo_acesso = process.env.ADMIN_SEED_CODE;
  const senha = process.env.ADMIN_SEED_PASSWORD;

  if (!nome || !codigo_acesso || !senha) {
    console.log('[SEED] Variáveis ADMIN_SEED_NAME, ADMIN_SEED_CODE e ADMIN_SEED_PASSWORD ausentes: nenhuma conta foi criada.');
    return;
  }
  if (senha.length < 12) {
    throw new Error('[SEED] ADMIN_SEED_PASSWORD deve ter pelo menos 12 caracteres.');
  }

  const existente = await prisma.usuario.findUnique({ where: { codigo_acesso } });
  if (existente) {
    console.log('[SEED] Conta inicial já existe; nenhuma alteração realizada.');
    return;
  }

  await prisma.usuario.create({
    data: {
      nome,
      codigo_acesso,
      senha_hash: await bcrypt.hash(senha, 12),
      tipo_usuario: 'ADMINISTRADOR',
      ativo: true,
    },
  });
  console.log('[SEED] Administrador inicial criado. Dados de acesso não serão exibidos.');
}

main().catch((error) => {
  console.error('[SEED] Erro ao inicializar administrador:', error.message);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
