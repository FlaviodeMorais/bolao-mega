-- Migração: aceite dos Termos de Participação no cadastro da conta.
-- termos_versao permite ao admin publicar uma atualização dos termos no futuro
-- e forçar novo aceite dos usuários já cadastrados (funcionalidade futura).
-- Executar no Supabase → SQL Editor

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS termos_versao int NOT NULL DEFAULT 1;
