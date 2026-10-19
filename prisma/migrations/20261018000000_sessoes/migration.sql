-- Arquivo para revisão e aplicação MANUAL em ambiente autorizado.
-- Não é executado pelo start/build e não remove registros.
ALTER TABLE `usuarios` ADD COLUMN `sessao_versao` INTEGER NOT NULL DEFAULT 0;
