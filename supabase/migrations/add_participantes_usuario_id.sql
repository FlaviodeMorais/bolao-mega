-- Migração: vincula participantes (loteria e esporte) à conta de usuário
-- (quando o participante estiver logado) — usado no autofill de nome/
-- telefone/email dos formulários de bolão (Fase 2).
-- Executar no Supabase → SQL Editor

ALTER TABLE participantes ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES usuarios(id);
ALTER TABLE participantes_esporte ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES usuarios(id);
