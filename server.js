require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { criarApp } = require('./app');
async function iniciar() {
  const prisma = new PrismaClient();
  const app = criarApp({ prisma });
  await prisma.$connect();
  const server = app.listen(Number(process.env.PORT) || 3000, () => console.log('[SERVER] API iniciada.'));
  const encerrar = () => server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  process.once('SIGTERM', encerrar);
  process.once('SIGINT', encerrar);
}
iniciar().catch(() => { console.error('[SERVER] Falha ao iniciar. Confira banco e variáveis de ambiente.'); process.exitCode = 1; });
