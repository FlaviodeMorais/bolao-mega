-- Migração: configuração visual e textual por bolão esportivo
-- Executar no Supabase SQL Editor

ALTER TABLE boloes_esporte
  ADD COLUMN IF NOT EXISTS logo_url        varchar,
  ADD COLUMN IF NOT EXISTS cor_primaria    varchar DEFAULT '#FFB81C',
  ADD COLUMN IF NOT EXISTS header_desc     varchar,
  ADD COLUMN IF NOT EXISTS label_cta       varchar DEFAULT '⚽ Quero Participar',
  ADD COLUMN IF NOT EXISTS label_palpites  varchar DEFAULT '⚽ Seus palpites',
  ADD COLUMN IF NOT EXISTS label_jogo_hoje varchar DEFAULT '🔥 Jogo de hoje!',
  ADD COLUMN IF NOT EXISTS label_noticias  varchar DEFAULT '📺 Notícias',
  ADD COLUMN IF NOT EXISTS premiacao       jsonb;

-- Preenche bolões existentes com defaults FIFA 2026
UPDATE boloes_esporte SET
  logo_url        = COALESCE(logo_url, '/1684502982782.gif'),
  cor_primaria    = COALESCE(cor_primaria, '#FFB81C'),
  header_desc     = COALESCE(header_desc, 'Não é Mata, Mata! É Mata, perdeu acabou!'),
  label_cta       = COALESCE(label_cta, '⚽ Quero Participar'),
  label_palpites  = COALESCE(label_palpites, '⚽ Seus palpites'),
  label_jogo_hoje = COALESCE(label_jogo_hoje, '🔥 Jogo de hoje!'),
  label_noticias  = COALESCE(label_noticias, '📺 CazéTV · Copa do Mundo FIFA 2026'),
  premiacao       = COALESCE(premiacao, '[
    {"lugar":1,"emoji":"🥇","label":"1º Lugar","categoria":"Craque","pts":10,"pct":50},
    {"lugar":2,"emoji":"🥈","label":"2º Lugar","categoria":"Ás","pts":7,"pct":30},
    {"lugar":3,"emoji":"🥉","label":"3º Lugar","categoria":"Talento","pts":5,"pct":20},
    {"lugar":4,"emoji":"🎖️","label":"4º","categoria":"Destaque","pts":3,"pct":0},
    {"lugar":5,"emoji":"⭐","label":"Top 5","categoria":"Participante","pts":1,"pct":0}
  ]'::jsonb)
WHERE logo_url IS NULL OR premiacao IS NULL;
