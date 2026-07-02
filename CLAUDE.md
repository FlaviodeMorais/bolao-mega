# Bolão Mega — Documentação Técnica Completa

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 |
| Backend | Next.js API Routes (serverless) |
| Banco | Supabase (PostgreSQL) |
| Auth | JWT (`jose`) + bcryptjs — cookie `admin_token` |
| Pagamentos | Mercado Pago PIX + fallback PIX local (`lib/pix-local.ts`) |
| WhatsApp | Whapi.cloud (`lib/whatsapp.ts`) |
| Email | Gmail SMTP via Nodemailer + Resend (`lib/email.ts`) |
| Notícias | Feed RSS do canal YouTube CazéTV (`api/esporte/noticias`) |
| Deploy | Vercel (cron jobs nativos) |
| PWA | Manifest + ícones + viewport standalone |

---

## Estrutura de Arquivos

```
/app
├── page.tsx                        # Home: carrossel de sorteios + lista de bolões ativos
├── layout.tsx                      # Root layout: fontes, globals.css, metadata
├── icon.tsx / apple-icon.tsx       # PWA icons gerados dinamicamente
├── opengraph-image.tsx             # OG image dinâmico para compartilhamento
├── manifest.ts                     # PWA manifest
├── [slug]/
│   ├── page.tsx                    # SSR: carrega bolão via Supabase → BolaoForm
│   └── BolaoForm.tsx               # Cliente: seleção de cotas, PIX, countdown, polling
├── admin/
│   └── page.tsx                    # Painel admin completo (login gate + CRM)
├── comprovante/
│   └── page.tsx                    # Comprovante participante (print/PDF/público)
├── estatisticas/
│   └── page.tsx                    # Análises + gerador de apostas (Mega-Sena)
├── p/[id]/
│   └── page.tsx                    # Comprovante público por participante (OG share)
├── esporte/[slug]/
│   └── page.tsx                    # Bolão FIFA 2026
└── api/
    ├── auth/route.ts               # POST: login → JWT cookie
    ├── boloes/route.ts             # GET/POST/PATCH/DELETE
    ├── concurso-ativo/route.ts     # GET/POST: concurso vigente (Mega-Sena)
    ├── participantes/route.ts      # GET/POST
    ├── participantes/[id]/route.ts # PATCH/DELETE
    ├── cotas/route.ts              # GET: cotas ocupadas por concurso+bolão
    ├── pix/route.ts                # POST: gera PIX (MP ou local)
    ├── status/route.ts             # GET: polling status pagamento MP
    ├── historico/route.ts          # GET: histórico por loteria
    ├── resultados/[loteria]/route.ts  # GET: último resultado + próximo concurso (Caixa)
    ├── estatisticas/[tipo]/route.ts   # GET: frequência / atrasos / info (loteria_historico)
    ├── webhook/mercadopago/route.ts   # POST: atualiza status para 'pago'
    ├── whatsapp/health/route.ts    # GET: status conexão Whapi
    ├── admin/
    │   ├── apostas-upload/route.ts     # POST/DELETE: parseBets() + salva apostas_data
    │   ├── comprovante/route.ts        # GET: verifica auth · POST: envia WA
    │   ├── conferir-sorteio/route.ts   # GET/POST/DELETE: confere e salva resultado
    │   ├── encerrar-bolao/route.ts     # POST: rateio + PIX acréscimo + WA
    │   ├── lembrete/route.ts           # POST: lembrete WA para pendentes
    │   ├── senha/route.ts              # POST: altera senha admin
    │   ├── acertos-pos-sorteio/route.ts # POST: notifica vencedores via WA
    │   ├── ingerir-historico/route.ts  # POST: importa histórico da Caixa → loteria_historico
    │   ├── salvar-historico/route.ts   # POST: persiste lote de concursos no DB
    │   ├── kpis/route.ts               # GET: KPIs agregados (receita, participação)
    │   └── testar-email/route.ts       # POST: smoke test de email
    ├── esporte/
    │   ├── boloes/route.ts             # GET
    │   ├── importar-jogos/route.ts     # POST: CSV de jogos FIFA 2026
    │   ├── jogos/route.ts              # GET
    │   ├── limpar-jogos/route.ts       # POST
    │   ├── noticias/route.ts           # GET: notícias via feed RSS do YouTube (CazéTV)
    │   ├── participantes/route.ts      # GET
    │   ├── participantes/[id]/route.ts # PATCH: palpites do participante
    │   ├── ranking/route.ts            # GET: placar / leaderboard
    │   └── resultado/route.ts          # POST: finaliza + pagamentos
    └── cron/
        ├── resultado/route.ts          # Ter/Qui/Sáb 22h — notifica resultado WA
        ├── lembrete/route.ts           # Ter/Qui/Sáb 10h — lembrete pagamento WA
        └── resultados-caixa/route.ts   # Ter/Qui/Sáb 22h30 — atualiza resultados Caixa

/components
├── TrevoIcon.tsx        # SVG trevo 4 folhas com cores por loteria (puro SVG, sem 'use client')
├── LoteriasCards.tsx    # Últimos resultados de cada loteria (Mega, Lotofácil, Quina, Lotomania)
└── admin/
    ├── AdminHeader.tsx       # Barra top: concurso ativo + status WA
    ├── AdminLogin.tsx        # Modal de login
    ├── AdminStats.tsx        # KPI cards: participantes, receita, bolões
    ├── AdminSenha.tsx        # Painel troca de senha
    ├── BolaoList.tsx         # Sidebar: CRUD bolões, copiar link, configurar
    ├── BolaoDetailPanel.tsx  # Principal: participantes, apostas, conferir, encerrar, config
    ├── ConcursoPanel.tsx     # Seleção de concurso, datas, busca Caixa por loteria
    ├── KpiDashboard.tsx      # Analytics expandível: receita, frequência, cotas
    ├── HistoricoPanel.tsx    # Histórico por bolão/concurso + convites WA em massa
    └── IngerirHistorico.tsx  # Importação histórico (mega/quina/lotofacil) → Supabase

/hooks/admin
├── useBoloes.ts         # CRUD bolões, config, cálculo de pricing
├── useConcurso.ts       # Concurso ativo, busca Caixa por loteria, edição de datas
├── useConferencia.ts    # Workflow de conferência de sorteio
├── useHistorico.ts      # Histórico de bolões/concursos, convites WA
├── useKpis.ts           # Analytics agregados
└── useParticipantes.ts  # CRUD participantes, confirmação, lembrete, encerramento

/lib
├── supabase.ts     # Cliente Supabase (SERVICE_KEY) — não expor no browser
├── auth.ts         # JWT + bcrypt: verificarToken / gerarToken / verificarSenha / alterarSenha
├── loterias.ts     # Config por loteria: totalNumeros, minDezenas, maxDezenas, drawDays, precos
├── mercadopago.ts  # criarPixMP / buscarPagamentoMP
├── pix-local.ts    # Gerador PIX EMV — chave CPF hardcoded (FALLBACK apenas)
├── whatsapp.ts     # Todas as notificações WA via Whapi.cloud
├── email.ts        # Nodemailer/Resend: PIX, confirmação pagamento, resultado, lembrete
└── bandeiras.ts    # País → ISO 3166-1 alpha-2 (flags no bolão esportivo)

/middleware.ts       # Security headers em todas as rotas
/vercel.json        # Cron schedules + região
/public/flags/      # 80+ bandeiras nacionais (PNG/SVG)
/supabase/migrations/add_loteria.sql  # Migração multi-loteria (executar no Supabase SQL Editor)
```

---

## Banco de Dados (Supabase)

### Tabelas

```sql
-- Bolões de loteria
boloes (
  id          uuid PK,
  slug        varchar UNIQUE,
  nome        varchar,
  loteria     varchar(20) DEFAULT 'mega',  -- 'mega' | 'quina' | 'lotofacil'
  ativo       boolean,
  encerrado   boolean,
  dezenas     int,           -- dezenas por aposta (default da loteria, pode ser sobrescrito)
  num_apostas int,
  total_cotas int,
  valor_cota  numeric,
  taxa_admin  numeric,
  apostas_data            jsonb,   -- { bets: number[][], total_apostas, dezenas_por_aposta, ... }
  resultado_conferencia   jsonb    -- { dezenas_sorteadas, acertos_por_aposta, distribuicao }
)

-- Participantes
participantes (
  id             uuid PK,
  concurso       varchar,
  bolao_slug     varchar,
  nome           varchar,
  telefone       varchar,
  email          varchar,
  cotas          int[],
  total          numeric,
  status         varchar,       -- 'aguardando' | 'pago' | 'cancelado'
  mp_payment_id  varchar,
  pix_code       text,
  acrescimo      numeric,
  acrescimo_pago boolean
)

-- Histórico unificado (novo padrão — todas as loterias)
loteria_historico (
  id           bigserial PK,
  loteria      varchar(20) NOT NULL DEFAULT 'mega',
  concurso     int NOT NULL,
  dezenas      int[] NOT NULL,
  data_sorteio date,
  UNIQUE(loteria, concurso)
)

-- Legado Mega-Sena (mantido como fallback nas estatísticas)
mega_historico (
  concurso     int PK,
  dezenas      int[],
  data_sorteio date
)

-- Config global key-value
config ( key varchar PK, value text )
-- Chaves em uso: 'ultimo_resultado_notificado', 'senha_hash'

-- Bolão esportivo (FIFA 2026)
boloes_esporte      (id, slug, nome, descricao, valor_cota, ativo, encerrado)
jogos_esporte       (id, bolao_id, time_a, time_b, gols_a, gols_b, data_jogo, status)
participantes_esporte (id, bolao_id, nome, telefone, palpites jsonb, pontos, status)
```

### Fallback mega → loteria_historico
`api/estatisticas/[tipo]/route.ts` detecta se `loteria_historico` está vazia para 'mega' e usa `mega_historico` automaticamente (`megaFallback()`). Transparente para o cliente.

---

## Configuração de Loterias (`lib/loterias.ts`)

```typescript
type LoteriaId = 'mega' | 'quina' | 'lotofacil'

interface LoteriaCfg {
  id:            LoteriaId
  label:         string         // "Mega-Sena" | "Quina" | "Lotofácil"
  apiSlug:       string         // slug da API Caixa e /api/resultados/[loteria]
  totalNumeros:  number         // 60 | 80 | 25
  minDezenas:    number         // 6 | 5 | 15
  maxDezenas:    number         // 20 | 15 | 20
  drawDays:      number[]       // dias da semana com sorteio
  precos:        Record<number, number>  // dezenas → valor R$
}
```

---

## Fluxos Principais

### 1. Registro de participante
```
BolaoForm → seleciona cotas + preenche dados
→ POST /api/pix          → MP ou PIX local → QR code
→ POST /api/participantes → valida bolão/cotas/total → insere status='aguardando'
→ WhatsApp: notifica grupo + envia QR PIX ao participante
→ Polling GET /api/status?paymentId= até 'approved'
→ POST /api/webhook/mercadopago → atualiza status='pago'
```

### 2. Upload de apostas (Admin)
```
Admin cola texto ou PDF
→ POST /api/admin/apostas-upload
→ parseBets() — detecta dezenas/linha automaticamente pelo range da loteria
   (aceita qualquer tamanho entre minDezenas e maxDezenas; detecta o mais frequente)
→ Salva em boloes.apostas_data = { bets, dezenas_por_aposta, total_apostas, ... }
```

### 3. Conferência de sorteio (Admin)
```
GET  /api/admin/conferir-sorteio  → busca dezenas na API Caixa (automático)
POST /api/admin/conferir-sorteio  → entrada manual de dezenas (fallback)
→ Classifica apostas por acertos
→ Salva em boloes.resultado_conferencia
→ POST /api/admin/acertos-pos-sorteio → notifica participantes via WA
```

### 4. Encerramento de bolão
```
POST /api/admin/encerrar-bolao
→ Calcula acréscimo proporcional por participante pago
→ Gera PIX individual para cada participante
→ Envia via WhatsApp
→ Marca boloes.encerrado = true
```

### 5. Gerador de apostas (página /estatisticas)
```
GET /api/estatisticas/frequencia + /atrasos + /info
→ 4 modos: balanceado, frequentes, atrasados, aleatório
→ Gera N apostas respeitando config da loteria
→ "Inserir no bolão" → modal de apostas-upload com texto pré-preenchido
```

---

## Variáveis de Ambiente

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Auth
JWT_SECRET=              # OBRIGATÓRIO mudar em produção
ADMIN_PASSWORD_HASH=     # bcrypt hash da senha admin

# Pagamentos
MP_ACCESS_TOKEN=         # Mercado Pago

# WhatsApp
WHAPI_TOKEN=
WHAPI_GROUP_ID=          # ID do grupo WhatsApp do bolão

# Email
GMAIL_USER=
GMAIL_PASS=              # App password Google (não a senha comum)
RESEND_API_KEY=          # Alternativa ao Gmail

# IA (bolão esportivo — opcional)
GOOGLE_GENERATIVE_AI_API_KEY=

# Cron
CRON_SECRET=             # Verificado via ?secret= nos endpoints de cron
```

---

## Design System

| Token | Valor |
|-------|-------|
| Verde Mega-Sena | `#009B63` / `#00AB67` |
| Roxo Lotofácil | `#702A82` / `#803594` |
| Azul Quina | `#00508F` / `#005DA4` |
| Laranja Lotomania | `#F58220` |
| Texto principal | `#0D1B2A` |
| Background | `#F4F6F8` |
| Fonte UI | Plus Jakarta Sans (300–800) |
| Fonte números | JetBrains Mono (400–500) |
| Ícones | Material Icons Round |

CSS: `globals.css` (utilitários globais) + módulos por página (`admin.module.css`, `comprovante.module.css`, `esporte.module.css`).

---

## Segurança

- JWT verificado individualmente em cada API route protegida (sem middleware centralizado de auth — `/admin` é o próprio login)
- `JWT_SECRET` e `ADMIN_PASSWORD_HASH` são obrigatórios — `lib/auth.ts` lança erro no boot se não configurados (sem fallback fraco)
- `DELETE /api/boloes` busca slug no banco (não confia no body do cliente)
- Cron routes verificam `?secret=CRON_SECRET` via query param
- `pix-local.ts` lê a chave PIX de `settings.pagamento.pix_chave` (configurável no admin) — não há mais CPF hardcoded
- Middleware global: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`

---

## White-Label / Settings

Sistema de configuração em `lib/settings.ts`, tabela `settings` (`namespace` PK, `dados` jsonb), cache em memória com TTL de 5 min, fallback em cascata DB → `DEFAULTS` → env vars. Editável via `components/admin/AdminSettings.tsx` (abas: App, Pagamento, WhatsApp, E-mail, Loteria, Esporte). Namespaces: `app`, `pagamento`, `whatsapp`, `email`, `paginas.home`, `paginas.bolao` (regras por loteria), `paginas.esporte`.

Importante: a app é **mono-tenant** (um deploy = um grupo/cliente) — não existe `tenant_id` no schema. "White-label" aqui significa branding/configuração customizável por instância, não multi-tenant SaaS.

`cor_primaria`/`cor_fundo` são injetados como CSS vars (`--green`, `--navy`) via `<style>` inline em `app/layout.tsx`, mas a maioria dos componentes ainda usa hex hardcoded (`#00AB67` etc.) em vez de `var(--green)` — migração de CSS modules para usar a var é pendente.

`paginas.home` está implementado no settings/admin mas `app/page.tsx` ainda não consome esses valores (título, rodapé, mensagens são hardcoded na página) — pendente de wiring.

---

## Pendências / Dívida Técnica

| Item | Prioridade | Ação |
|------|-----------|------|
| Maioria das cores em CSS modules usa hex hardcoded, não `var(--green)` | Média | Migrar `admin.module.css`, `bolao.module.css` etc. para usar a var |
| `paginas.home` configurável mas não consumido por `app/page.tsx` | Baixa | Ler `getHomeSettings()` na home e substituir textos hardcoded |
| `lib/loterias.ts` (preços/cores/dias de sorteio) fora do sistema de settings | Info | Avaliar se deve migrar para namespace `paginas.bolao` |
| Tabela `mega_historico` | Info | Manter como fallback — não migrar destrutivamente |
| Estatísticas (`/estatisticas`) só para Mega-Sena | Média | Expandir para Quina e Lotofácil |

---

## Como Rodar

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # verifica TypeScript + build completo antes de deploy
```

### Migração SQL necessária (uma vez no Supabase)

```sql
ALTER TABLE boloes ADD COLUMN IF NOT EXISTS loteria varchar(20) DEFAULT 'mega';

CREATE TABLE IF NOT EXISTS loteria_historico (
  id bigserial PRIMARY KEY,
  loteria varchar(20) NOT NULL DEFAULT 'mega',
  concurso int NOT NULL,
  dezenas int[] NOT NULL,
  data_sorteio date,
  UNIQUE(loteria, concurso)
);

INSERT INTO loteria_historico (loteria, concurso, dezenas, data_sorteio)
SELECT 'mega', concurso, dezenas, data_sorteio FROM mega_historico
ON CONFLICT (loteria, concurso) DO NOTHING;
```
