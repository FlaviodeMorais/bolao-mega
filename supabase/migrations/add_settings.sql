-- Tabela de configurações white-label
-- Cada namespace é um registro com dados jsonb
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS settings (
  namespace   varchar(60) PRIMARY KEY,
  dados       jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz DEFAULT now()
);

-- Índice para leituras frequentes
CREATE INDEX IF NOT EXISTS settings_namespace_idx ON settings (namespace);

-- Comentários de documentação
COMMENT ON TABLE settings IS 'Configurações white-label do app por namespace';
COMMENT ON COLUMN settings.namespace IS 'app | pagamento | whatsapp | email | paginas.home | paginas.bolao | paginas.esporte';
COMMENT ON COLUMN settings.dados IS 'JSON com os dados do namespace';
