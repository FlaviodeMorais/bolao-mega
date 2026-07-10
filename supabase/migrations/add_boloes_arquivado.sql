-- Adiciona coluna arquivado em boloes
-- Bolões arquivados somem da lista do admin mas os dados (participantes, KPIs)
-- ficam intactos para sempre.
ALTER TABLE boloes ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;
