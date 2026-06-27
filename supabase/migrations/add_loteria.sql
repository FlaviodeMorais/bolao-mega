-- =====================================================
-- Migração: suporte a Lotofácil e Quina nos bolões
-- Executar no Supabase → SQL Editor
-- =====================================================

-- 1. Adiciona coluna loteria na tabela boloes
ALTER TABLE boloes ADD COLUMN IF NOT EXISTS loteria varchar(20) DEFAULT 'mega';

-- 2. Cria tabela unificada de histórico (mega + lotofacil + quina)
CREATE TABLE IF NOT EXISTS loteria_historico (
  id           bigserial PRIMARY KEY,
  loteria      varchar(20) NOT NULL DEFAULT 'mega',
  concurso     int         NOT NULL,
  dezenas      int[]       NOT NULL,
  data_sorteio date,
  UNIQUE(loteria, concurso)
);

CREATE INDEX IF NOT EXISTS idx_lot_hist_loteria  ON loteria_historico(loteria);
CREATE INDEX IF NOT EXISTS idx_lot_hist_concurso ON loteria_historico(loteria, concurso DESC);

-- 3. Migra dados existentes do mega_historico para loteria_historico
INSERT INTO loteria_historico (loteria, concurso, dezenas, data_sorteio)
SELECT 'mega', concurso, dezenas, data_sorteio
FROM mega_historico
ON CONFLICT (loteria, concurso) DO NOTHING;

-- Resultado esperado: todas as linhas de mega_historico copiadas com loteria='mega'
