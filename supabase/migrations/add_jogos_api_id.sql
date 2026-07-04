-- Migração: vincula jogos importados do football-data.org ao id externo da partida,
-- necessário para buscar resultados automaticamente depois (ver lib/esporte-resultado.ts).
-- Executar no Supabase → SQL Editor

ALTER TABLE jogos ADD COLUMN IF NOT EXISTS api_jogo_id varchar;
