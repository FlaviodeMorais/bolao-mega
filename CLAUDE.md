# 🍀 Bolão Mega — Documentação do Projeto

## Stack

- **Frontend**: Next.js 14 com React 18 (App Router, `'use client'` onde necessário)
- **Backend**: API Routes do Next.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT via `jose` + bcryptjs, armazenado em cookie `admin_token`
- **Pagamentos**: Mercado Pago (PIX) com fallback PIX local (`lib/pix-local.ts`)
- **Notificações**: WhatsApp via Whapi.cloud (`lib/whatsapp.ts`)
- **Extras**: QR codes (`qrcode`), PDF de apostas (`pdf-parse`)

## Estrutura real de arquivos

```
/app
├── page.tsx                      # Home — lista bolões ativos
├── layout.tsx                    # Layout raiz (fontes, globals.css)
├── [slug]/
│   ├── page.tsx                  # SSR: carrega bolão via Supabase
│   └── BolaoForm.tsx             # Cliente: seleção de cotas, PIX, polling
├── admin/
│   └── page.tsx                  # Painel admin (login + gestão completa)
├── comprovante/
│   └── page.tsx                  # Comprovantes para impressão/PDF
└── api/
    ├── auth/route.ts             # POST: login → gera JWT cookie
    ├── boloes/route.ts           # GET/POST/PATCH/DELETE
    ├── concurso-ativo/route.ts   # GET/POST
    ├── participantes/route.ts    # GET/POST
    ├── participantes/[id]/route.ts # PATCH/DELETE
    ├── cotas/route.ts            # GET: cotas ocupadas
    ├── pix/route.ts              # POST: gera PIX (MP ou local)
    ├── status/route.ts           # GET: status pagamento MP
    ├── historico/route.ts        # GET: histórico de concursos
    ├── webhook/mercadopago/route.ts
    ├── whatsapp/health/route.ts  # GET: status conexão WA
    ├── admin/
    │   ├── apostas-upload/route.ts   # POST/DELETE: carrega apostas (texto ou PDF)
    │   ├── comprovante/route.ts      # GET: auth check · POST: envia WA
    │   ├── conferir-sorteio/route.ts # GET/POST/DELETE: confere resultado
    │   ├── encerrar-bolao/route.ts   # POST: rateio + PIX acréscimo
    │   ├── lembrete/route.ts         # POST: envia lembrete WA
    │   └── senha/route.ts            # POST: altera senha admin
    └── cron/
        ├── resultado/route.ts        # Vercel Cron: notifica resultado
        └── lembrete/route.ts         # Vercel Cron: envia lembrete

/lib
├── supabase.ts       # Cliente Supabase (SERVICE_KEY)
├── auth.ts           # verificarToken / gerarToken / verificarSenha / alterarSenha
├── mercadopago.ts    # criarPixMP / buscarPagamentoMP
├── pix-local.ts      # gerarPixLocal (fallback — chave PIX hardcoded)
└── whatsapp.ts       # Todas as funções de notificação WA via Whapi

/middleware.ts         # Security headers em todas as rotas

/public               # Assets estáticos
/vercel.json          # Cron jobs (resultado: ter/qui/sáb 22h · lembrete: 10h)
```

## Banco de dados (Supabase)

### Tabelas
- `boloes` — slug, nome, ativo, encerrado, dezenas, num_apostas, total_cotas, valor_cota, taxa_admin, apostas_data (jsonb), resultado_conferencia (jsonb)
- `participantes` — concurso, bolao_slug, nome, telefone, cotas (array), total, status (aguardando|pago|cancelado), mp_payment_id, pix_code, acrescimo, acrescimo_pago
- `config` — key/value para estado persistente (ex: ultimo_resultado_notificado)

## Fluxos principais

### Registro de participante
1. `BolaoForm` → `POST /api/pix` → MP ou PIX local
2. `POST /api/participantes` → valida bolão, cotas, total → insere
3. WhatsApp: notifica grupo + envia QR PIX para participante
4. Polling `GET /api/status?paymentId=` até confirmação
5. `POST /api/webhook/mercadopago` → atualiza status para "pago"

### Conferência de sorteio (Admin)
1. Admin carrega apostas via texto → `POST /api/admin/apostas-upload`
2. `GET /api/admin/conferir-sorteio` → busca dezenas na API Caixa → classifica
3. Fallback manual: `POST /api/admin/conferir-sorteio` com dezenas informadas
4. Resultado salvo em `boloes.resultado_conferencia`

### Encerramento de bolão
1. `POST /api/admin/encerrar-bolao` → calcula acréscimo por participante
2. Gera PIX individual para cada participante pago
3. Envia via WhatsApp → marca `boloes.encerrado = true`

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
JWT_SECRET                  # default inseguro: 'bolao-mega-secret-2026'
ADMIN_PASSWORD_HASH         # bcrypt hash da senha admin
MP_ACCESS_TOKEN             # Mercado Pago
WHAPI_TOKEN                 # Whapi.cloud
WHAPI_GROUP_ID              # ID do grupo WhatsApp
CRON_SECRET                 # Secret nos query params do Vercel Cron
```

## Segurança

- JWT verificado individualmente em cada API route protegida (sem middleware centralizado de auth, pois a página /admin é a própria tela de login)
- DELETE /api/boloes busca o slug do banco (não confia no cliente) antes de checar participantes
- Middleware adiciona security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Cron routes verificam `?secret=CRON_SECRET` via query param (padrão Vercel Cron)

## Design

- **Verde brand**: #00A651
- **Azul Caixa**: #1D6EA6
- **Fontes**: Plus Jakarta Sans (UI) + JetBrains Mono (números)
- CSS Modules em todas as páginas (admin.module.css, comprovante.module.css)

## Como rodar

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # verifica erros de build antes de deploy
```
