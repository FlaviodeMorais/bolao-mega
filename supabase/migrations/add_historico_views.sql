-- Migração: views de histórico (loteria + esporte unificados), agregação e
-- filtros feitos no Postgres em vez de trazer a tabela inteira pro Node e
-- agrupar/filtrar em JS (não escala conforme a base de participantes cresce).
-- Executar no Supabase → SQL Editor

-- ── Resumo agregado por concurso/bolão (loteria) e por bolão (esporte) ──
CREATE OR REPLACE VIEW historico_resumo AS
SELECT
  'loteria'::varchar                                          AS tipo,
  p.concurso                                                  AS concurso,
  p.bolao_slug                                                AS bolao_slug,
  COALESCE(b.nome, '/' || p.bolao_slug, 'Principal')          AS bolao_nome,
  COUNT(*)                                                    AS total,
  COUNT(*) FILTER (WHERE p.status = 'pago')                   AS pagos,
  COUNT(*) FILTER (WHERE p.status = 'aguardando')              AS pendentes,
  COUNT(*) FILTER (WHERE p.status = 'cancelado')               AS cancelados,
  COALESCE(SUM(p.total) FILTER (WHERE p.status = 'pago'), 0)   AS arrecadado
FROM participantes p
LEFT JOIN boloes b ON b.slug = p.bolao_slug
GROUP BY p.concurso, p.bolao_slug, b.nome

UNION ALL

SELECT
  'esporte'::varchar                                          AS tipo,
  NULL::int                                                   AS concurso,
  pe.bolao_slug                                               AS bolao_slug,
  COALESCE(be.nome, '/' || pe.bolao_slug, 'Principal')        AS bolao_nome,
  COUNT(*)                                                    AS total,
  COUNT(*) FILTER (WHERE pe.status = 'pago')                  AS pagos,
  COUNT(*) FILTER (WHERE pe.status = 'aguardando')             AS pendentes,
  COUNT(*) FILTER (WHERE pe.status = 'cancelado')              AS cancelados,
  COALESCE(SUM(pe.total) FILTER (WHERE pe.status = 'pago'), 0) AS arrecadado
FROM participantes_esporte pe
LEFT JOIN boloes_esporte be ON be.slug = pe.bolao_slug
GROUP BY pe.bolao_slug, be.nome;

COMMENT ON VIEW historico_resumo IS 'Resumo agregado (loteria + esporte) pro card Histórico do admin — agregação feita no Postgres, não em JS.';

-- ── Lista unificada de participantes (loteria + esporte), pra busca/filtro/paginação server-side ──
CREATE OR REPLACE VIEW historico_participantes AS
SELECT
  p.id                                                        AS id,
  'loteria'::varchar                                          AS tipo,
  p.nome                                                      AS nome,
  p.telefone                                                  AS telefone,
  p.email                                                     AS email,
  NULL::varchar                                               AS chave_pix,
  p.cotas::text[]                                             AS cotas,
  p.total                                                      AS total,
  p.status                                                     AS status,
  p.concurso                                                   AS concurso,
  p.bolao_slug                                                 AS bolao_slug,
  COALESCE(b.nome, '/' || p.bolao_slug, 'Principal')          AS bolao_nome,
  p.acrescimo::numeric                                        AS acrescimo,
  p.acrescimo_pago                                             AS acrescimo_pago,
  p.created_at                                                 AS created_at
FROM participantes p
LEFT JOIN boloes b ON b.slug = p.bolao_slug

UNION ALL

SELECT
  pe.id                                                        AS id,
  'esporte'::varchar                                           AS tipo,
  pe.nome                                                       AS nome,
  pe.telefone                                                   AS telefone,
  pe.email                                                      AS email,
  NULL::varchar                                                  AS chave_pix,
  NULL::text[]                                                  AS cotas,
  pe.total                                                       AS total,
  pe.status                                                      AS status,
  NULL::int                                                      AS concurso,
  pe.bolao_slug                                                  AS bolao_slug,
  COALESCE(be.nome, '/' || pe.bolao_slug, 'Principal')          AS bolao_nome,
  NULL::numeric                                                  AS acrescimo,
  NULL::boolean                                                  AS acrescimo_pago,
  pe.created_at                                                  AS created_at
FROM participantes_esporte pe
LEFT JOIN boloes_esporte be ON be.slug = pe.bolao_slug;

COMMENT ON VIEW historico_participantes IS 'Lista unificada de participantes (loteria + esporte) pro card Histórico do admin — busca/filtro/paginação feitos via query no Postgres, não trazendo tudo pro Node.';
