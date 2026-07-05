-- Migração: marca quais contas ainda estão com a senha temporária enviada por
-- e-mail (para exibir o aviso de troca só no primeiro acesso, não pra sempre).
-- Executar no Supabase → SQL Editor

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_temporaria boolean NOT NULL DEFAULT false;

-- Backfill: os 14 e-mails migrados em /api/admin/migrar-usuarios receberam
-- senha temporária e ainda não passaram pelo novo fluxo de troca.
UPDATE usuarios SET senha_temporaria = true WHERE email IN (
  'adanilofilho@gmail.com','flaviodemorais@hotmail.com','damamoc@gmail.com',
  'mauriciocbastosc@gmail.com','jaelfreitas@hotmail.com','gilson.tinfer@icloud.com',
  'paulinhosms76@gmail.com','mauriciocbastos@gmail.com','rbastos.tst@gmail.com',
  'jefter134@hotmail.com','ptgreng@gmail.com','paulomedeiros87@gmail.com',
  'italocampanella@yahoo.com.br','ronaldonascimentopva@gmail.com'
);
