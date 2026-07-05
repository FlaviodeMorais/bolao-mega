-- Migração: pedidos consolidados (carrinho) — agrupa vários participantes
-- (loteria e/ou esporte, de bolões diferentes) sob um único pagamento PIX.
-- Executar no Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS pedidos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid NOT NULL REFERENCES usuarios(id),
  total          numeric NOT NULL,
  status         varchar NOT NULL DEFAULT 'aguardando', -- aguardando | pago | cancelado
  mp_payment_id  varchar,
  pix_code       text,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pedidos IS 'Checkout consolidado do carrinho - 1 PIX cobrindo N participantes (loteria/esporte) de bolões diferentes';

ALTER TABLE participantes ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES pedidos(id);
ALTER TABLE participantes_esporte ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES pedidos(id);
