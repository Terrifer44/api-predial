-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `codigo_acesso` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `tipo_usuario` ENUM('MORADOR', 'OPERARIO', 'ADMINISTRADOR') NOT NULL DEFAULT 'MORADOR',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reset_token` VARCHAR(191) NULL,
    `reset_token_expira` DATETIME(3) NULL,

    UNIQUE INDEX `usuarios_codigo_acesso_key`(`codigo_acesso`),
    UNIQUE INDEX `usuarios_reset_token_key`(`reset_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `demandas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setor` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `urgencia_morador` ENUM('BAIXA', 'MEDIA', 'ALTA') NOT NULL,
    `urgencia_real` ENUM('BAIXA', 'MEDIA', 'ALTA') NULL,
    `status` ENUM('PENDENTE', 'ATRIBUIDA', 'EM_ANDAMENTO', 'IMPEDIMENTO', 'CONCLUIDA') NOT NULL DEFAULT 'PENDENTE',
    `motivo_impedimento` TEXT NULL,
    `foto_url` VARCHAR(191) NULL,
    `sla_prazo` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_morador` INTEGER NOT NULL,
    `id_operario` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historico_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_demanda` INTEGER NOT NULL,
    `id_usuario_modificador` INTEGER NOT NULL,
    `status_anterior` ENUM('PENDENTE', 'ATRIBUIDA', 'EM_ANDAMENTO', 'IMPEDIMENTO', 'CONCLUIDA') NULL,
    `status_novo` ENUM('PENDENTE', 'ATRIBUIDA', 'EM_ANDAMENTO', 'IMPEDIMENTO', 'CONCLUIDA') NOT NULL,
    `comentario` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `codigos_liberacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `tipo_usuario` ENUM('MORADOR', 'OPERARIO', 'ADMINISTRADOR') NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `codigos_liberacao_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comentarios_demanda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_demanda` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `mensagem` TEXT NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_demanda` INTEGER NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `demandas` ADD CONSTRAINT `demandas_id_morador_fkey` FOREIGN KEY (`id_morador`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandas` ADD CONSTRAINT `demandas_id_operario_fkey` FOREIGN KEY (`id_operario`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_status` ADD CONSTRAINT `historico_status_id_demanda_fkey` FOREIGN KEY (`id_demanda`) REFERENCES `demandas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_status` ADD CONSTRAINT `historico_status_id_usuario_modificador_fkey` FOREIGN KEY (`id_usuario_modificador`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentarios_demanda` ADD CONSTRAINT `comentarios_demanda_id_demanda_fkey` FOREIGN KEY (`id_demanda`) REFERENCES `demandas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentarios_demanda` ADD CONSTRAINT `comentarios_demanda_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
