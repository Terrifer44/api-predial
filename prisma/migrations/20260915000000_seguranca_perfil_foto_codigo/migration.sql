-- Migration aditiva (somente ADD COLUMN / CREATE INDEX): não remove nem altera dados existentes.

-- Invalidação de sessões após troca/redefinição de senha
ALTER TABLE `usuarios` ADD COLUMN `senha_alterada_em` DATETIME(3) NULL;

-- Identificador do arquivo da foto (necessário para apagar a imagem certa no Cloudinary)
ALTER TABLE `demandas` ADD COLUMN `foto_public_id` VARCHAR(191) NULL;

-- Expiração dos códigos de liberação (códigos antigos ficam sem expiração = NULL)
ALTER TABLE `codigos_liberacao` ADD COLUMN `expira_em` DATETIME(3) NULL;

-- Índices para filtros/listagens
CREATE INDEX `demandas_status_criado_em_idx` ON `demandas`(`status`, `criado_em`);
CREATE INDEX `notificacoes_id_usuario_lida_idx` ON `notificacoes`(`id_usuario`, `lida`);
