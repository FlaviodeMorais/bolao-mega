-- Migração: contas de participante (login/cadastro) — elimina a necessidade
-- de redigitar nome/telefone/email a cada bolão novo.
-- Executar no Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        varchar NOT NULL,
  email       varchar NOT NULL UNIQUE,
  telefone    varchar NOT NULL,
  senha_hash  varchar NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE usuarios IS 'Contas de participante (login/cadastro) — separado do admin único em config.admin_password';
