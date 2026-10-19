require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const V = require('../lib/validacao');
const { exigir } = require('../lib/erros');
const prisma = new PrismaClient();
async function main() {
  const codigo = exigir(V.codigoAcesso(process.env.ADMIN_CODE || 'ADMIN001'));
  const existente = await prisma.usuario.findUnique({ where: { codigo_acesso: codigo } });
  if (existente) { console.log('[SEED] Conta existente preservada; nenhuma alteração.'); return; }
  const senha = exigir(V.senha(process.env.ADMIN_PASSWORD));
  if (['admin123', 'Teste@123', 'password1'].includes(senha)) throw new Error('Escolha uma senha exclusiva.');
  await prisma.usuario.create({ data: { nome: process.env.ADMIN_NAME || 'Administrador', codigo_acesso: codigo, senha_hash: await bcrypt.hash(senha, 12), email: exigir(V.email(process.env.ADMIN_EMAIL)), tipo_usuario: 'ADMINISTRADOR' } });
  console.log('[SEED] Administrador criado. Remova ADMIN_PASSWORD do ambiente após o uso.');
}
main().catch(() => { console.error('[SEED] Não foi possível criar a conta. Verifique ADMIN_PASSWORD, configuração e banco.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
