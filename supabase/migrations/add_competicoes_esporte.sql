-- Migração: campeonatos cadastráveis para o módulo Bolão Esportivo
-- Executar no Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS competicoes_esporte (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               varchar NOT NULL,
  logo_url           varchar,
  cor                varchar DEFAULT '#FFB81C',
  fonte              varchar(20) NOT NULL DEFAULT 'manual', -- 'fifa' | 'api-football' | 'manual'
  api_competition_id int,       -- id da liga na API-Football (quando fonte = 'api-football')
  temporada          varchar,   -- ex: '2026'
  ativo              boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE boloes_esporte
  ADD COLUMN IF NOT EXISTS competicao_id uuid REFERENCES competicoes_esporte(id);

-- Seed com os campeonatos já predefinidos em lib/competicoes.ts
INSERT INTO competicoes_esporte (nome, logo_url, cor, fonte, temporada) VALUES
  ('Copa do Mundo FIFA 2026',      '/WC26_Logo.png',                      '#FFB81C', 'fifa',   '2026'),
  ('UEFA Champions League 25/26',  '/logos/competicoes/champions.png',    '#1A3A5C', 'manual', '25/26'),
  ('UEFA Europa League 25/26',     '/logos/competicoes/europa.png',       '#F47B20', 'manual', '25/26'),
  ('CONMEBOL Libertadores 2026',   '/logos/competicoes/libertadores.png', '#C8A84B', 'manual', '2026'),
  ('CONMEBOL Sul-Americana 2026',  '/logos/competicoes/sulamericana.png', '#FF8C00', 'manual', '2026'),
  ('Mundial de Clubes 2025',       '/logos/competicoes/mundial-25.png',   '#FF6B35', 'manual', '2025'),
  ('Brasileirão Série A 2026',     '/logos/competicoes/brasileirao.png',  '#009B3A', 'manual', '2026'),
  ('Brasileirão Série B 2026',     '/logos/competicoes/brasileirao-b.png','#2E7D32', 'manual', '2026'),
  ('Copa do Brasil 2026',          '/logos/competicoes/copa-brasil.png',  '#006400', 'manual', '2026'),
  ('Campeonato Carioca 2026',      '/logos/competicoes/carioca.png',      '#E8002D', 'manual', '2026'),
  ('Campeonato Paulista 2026',     '/logos/competicoes/paulista.png',     '#1C1C1C', 'manual', '2026'),
  ('Campeonato Mineiro 2026',      '/logos/competicoes/mineiro.png',      '#552583', 'manual', '2026'),
  ('Campeonato Gaúcho 2026',       '/logos/competicoes/gaucho.png',       '#C41E3A', 'manual', '2026'),
  ('Premier League 25/26',         '/logos/competicoes/premier.png',      '#3D195B', 'manual', '25/26'),
  ('La Liga 25/26',                '/logos/competicoes/laliga.png',       '#EF0E0E', 'manual', '25/26'),
  ('Serie A (Itália) 25/26',       '/logos/competicoes/seriea-it.png',    '#00529F', 'manual', '25/26'),
  ('Bundesliga 25/26',             '/logos/competicoes/bundesliga.png',   '#D20515', 'manual', '25/26'),
  ('Ligue 1 (França) 25/26',       '/logos/competicoes/ligue1.png',       '#0055A4', 'manual', '25/26')
ON CONFLICT DO NOTHING;
