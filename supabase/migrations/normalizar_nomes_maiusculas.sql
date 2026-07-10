-- Padroniza todos os nomes de usuários existentes para letras maiúsculas
UPDATE usuarios SET nome = UPPER(TRIM(nome)) WHERE nome IS NOT NULL AND nome != UPPER(TRIM(nome));
