/* ==========================================
   SEED: cria o primeiro administrador do sistema.

   Por que isso existe: a criação de novos usuários depende de um
   "Código de Liberação", e a criação de códigos agora exige estar
   logado como ADMINISTRADOR (ver server.js). Ou seja, sem um admin
   já existente, ninguém consegue criar o primeiro admin pela tela.
   Este script quebra esse ciclo inserindo o primeiro administrador
   diretamente no banco, uma única vez.

   Uso:
     npx prisma db seed
   (ou, se preferir rodar direto: node prisma/seed.js)
========================================== */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_PADRAO = {
  nome: 'Administrador Geral',
  codigo_acesso: 'ADMIN001',
  senha: 'admin123', // TROQUE a senha assim que fizer o primeiro login!
  tipo_usuario: 'ADMINISTRADOR',
};

async function main() {
  const jaExiste = await prisma.usuario.findUnique({
    where: { codigo_acesso: ADMIN_PADRAO.codigo_acesso },
  });

  if (jaExiste) {
    console.log(`[SEED] Usuário "${ADMIN_PADRAO.codigo_acesso}" já existe — nada a fazer.`);
    return;
  }

  const senha_hash = await bcrypt.hash(ADMIN_PADRAO.senha, 10);

  await prisma.usuario.create({
    data: {
      nome: ADMIN_PADRAO.nome,
      codigo_acesso: ADMIN_PADRAO.codigo_acesso,
      senha_hash,
      tipo_usuario: ADMIN_PADRAO.tipo_usuario,
      ativo: true,
    },
  });

  console.log('[SEED] Administrador inicial criado com sucesso:');
  console.log(`       código de acesso: ${ADMIN_PADRAO.codigo_acesso}`);
  console.log(`       senha temporária:  ${ADMIN_PADRAO.senha}`);
  console.log('       -> Troque essa senha assim que possível (fluxo "Esqueci minha senha" ou direto no banco).');
}

main()
  .catch((error) => {
    console.error('[SEED] Erro ao criar administrador inicial:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
