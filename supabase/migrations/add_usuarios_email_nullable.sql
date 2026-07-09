-- Torna email opcional em usuarios para suportar participantes sem e-mail
-- O UNIQUE continua valendo para valores não-nulos (comportamento padrão do PostgreSQL: NULL != NULL)
ALTER TABLE usuarios ALTER COLUMN email DROP NOT NULL;
