-- Migração: chave PIX na conta do usuário (usada pra pagamentos de prêmio,
-- ex: bolão esportivo). Nullable pra não quebrar contas já existentes -
-- novos cadastros passam a exigir o campo na aplicação.
-- Executar no Supabase → SQL Editor

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS chave_pix varchar;
