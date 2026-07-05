# Bolão Mega — Documentação Técnica Completa

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 |
| Backend | Next.js API Routes (serverless) |
| Banco | Supabase (PostgreSQL) |
| Auth admin | JWT (`jose`) + bcryptjs — cookie `admin_token` |
| Auth participante | JWT (`jose`) + bcryptjs — cookie `user_token` (separado do admin) |
| Pagamentos | Mercado Pago PIX + fallback PIX local (`lib/pix-local.ts`) |
| WhatsApp | Whapi.cloud (`lib/whatsapp.ts`) |
| Email | Gmail SMTP via Nodemailer + Resend (`lib/email.ts`) |
| Planilhas | Google Sheets API via Service Account (`lib/google-sheets.ts`) |
| Notícias | Feed RSS do canal YouTube CazéTV (`api/esporte/noticias`) |
| Deploy | Vercel (cron jobs nativos) |
| PWA | Manifest + ícones + viewport standalone + service worker |

---

## Estrutura de Arquivos

```
/app
├── page.tsx                        # Home: carrossel de sorteios + lista de bolões (loteria+esporte) + header conta/carrinho/admin
├── layout.tsx                      # Root layout: fontes, globals.css, metadata, CSS vars de tema
├── icon.tsx / apple-icon.tsx       # PWA icons gerados dinamicamente
├── opengraph-image.tsx             # OG image dinâmico para compartilhamento
├── manifest.ts                     # PWA manifest
├── offline/page.tsx                # Fallback offline do service worker
├── [slug]/
│   ├── page.tsx                    # SSR: carrega bolão via Supabase → BolaoForm
│   └── BolaoForm.tsx               # Cliente: login-gate, seleção de cotas, SÓ adiciona ao carrinho (sem PIX direto)
├── esporte/[slug]/
│   ├── page.tsx                    # SSR: carrega bolão esportivo + jogos
│   └── EsporteForm.tsx             # Cliente: login-gate, palpites, SÓ adiciona ao carrinho
├── carrinho/
│   └── page.tsx                    # Carrinho consolidado: lista itens (loteria+esporte), 1 checkout, 1 PIX
├── admin/
│   ├── page.tsx                    # Orquestrador do painel (hooks/admin/*) + login gate
│   └── EsporteAdmin.tsx            # CRUD bolões esportivos, jogos, participantes, ranking
├── comprovante/
│   └── page.tsx                    # Comprovante(s): bulk (admin) ou individual (link público ?pub=1, max-width 480px)
├── p/[id]/
│   └── page.tsx                    # Comprovante público por participante (OG share) + ShareButton.tsx
└── api/
    ├── auth/route.ts                    # POST: login admin → JWT cookie admin_token
    ├── boloes/route.ts                  # GET/POST/PATCH/DELETE bolões de loteria
    ├── concurso-ativo/route.ts          # GET/POST: concurso vigente por loteria
    ├── cotas/route.ts                   # GET: cotas ocupadas por concurso+bolão
    ├── participantes/route.ts           # GET (lista) · POST → 410 (desativado, ver /api/checkout)
    ├── participantes/[id]/route.ts      # PATCH (confirmar pagamento/acréscimo) · DELETE (soft-delete → cancelado)
    ├── pix/route.ts                     # POST → 410 (desativado, ver /api/checkout)
    ├── checkout/route.ts                # POST: ÚNICO caminho de pagamento — valida carrinho, gera 1 PIX, insere N participantes/participantes_esporte
    ├── status/route.ts                  # GET: polling status pagamento MP
    ├── historico/route.ts               # GET: histórico por loteria
    ├── resultados/[loteria]/route.ts    # GET: último resultado + próximo concurso (Caixa)
    ├── estatisticas/[tipo]/route.ts     # GET: frequência / atrasos / info (loteria_historico) — usado pelo GeradorApostas no admin
    ├── config-publica/route.ts          # GET: settings públicos (app/home/bolao/esporte) para SSR/CSR
    ├── webhook/mercadopago/route.ts      # POST: atualiza status='pago' de TODOS participantes com o mesmo mp_payment_id (suporta carrinho)
    ├── whatsapp/health/route.ts         # GET: status conexão Whapi
    ├── usuario/                         # Contas de participante (separado do admin)
    │   ├── cadastro/route.ts           # POST: valida + exige aceite dos Termos → grava termos_aceitos_em/versao
    │   ├── login/route.ts              # POST
    │   ├── logout/route.ts             # POST
    │   ├── me/route.ts                 # GET: dados da conta logada (nunca senha_hash)
    │   ├── alterar-senha/route.ts      # POST: troca senha, zera senha_temporaria
    │   └── atualizar-chave-pix/route.ts # POST: edita chave PIX (necessário p/ contas migradas sem chave)
    ├── admin/
    │   ├── apostas-upload/route.ts      # POST/DELETE: parseBets() + salva apostas_data
    │   ├── comprovante/route.ts         # GET: verifica auth · POST: envia WA
    │   ├── conferir-sorteio/route.ts    # GET/POST/DELETE: confere e salva resultado
    │   ├── encerrar-bolao/route.ts      # POST: rateio + PIX acréscimo + WA
    │   ├── lembrete/route.ts            # POST: lembrete WA para pendentes
    │   ├── senha/route.ts               # POST: altera senha admin
    │   ├── acertos-pos-sorteio/route.ts # POST: notifica vencedores via WA
    │   ├── ingerir-historico/route.ts   # POST: importa histórico da Caixa → loteria_historico
    │   ├── salvar-historico/route.ts    # POST: persiste lote de concursos no DB
    │   ├── migrar-usuarios/route.ts     # POST (uso pontual): cria conta p/ participantes antigos + envia senha temporária por e-mail
    │   ├── kpis/route.ts                # GET: KPIs agregados (receita, participação)
    │   ├── settings/route.ts            # GET (todos namespaces) / POST (salva 1 namespace) — protegido por admin_token
    │   ├── exportar-sheets/route.ts     # POST: exporta participantes do bolão/concurso pra uma aba do Google Sheets
    │   └── testar-email/route.ts        # POST: smoke test de email
    ├── esporte/
    │   ├── boloes/route.ts              # GET
    │   ├── campeonatos/route.ts          # GET: lista competicoes_esporte
    │   ├── campeonatos/[id]/jogos/route.ts # GET: busca jogos na football-data.org por competição
    │   ├── buscar-resultados/route.ts   # GET/POST: busca placares na football-data.org
    │   ├── importar-jogos/route.ts      # POST: CSV ou football-data.org → tabela jogos
    │   ├── jogos/route.ts               # GET/PATCH/DELETE
    │   ├── limpar-jogos/route.ts        # POST
    │   ├── noticias/route.ts            # GET: notícias via feed RSS do YouTube (CazéTV)
    │   ├── participantes/route.ts       # GET (lista) · POST → 410 (desativado, ver /api/checkout)
    │   ├── participantes/[id]/route.ts  # PATCH (status) · DELETE (soft-delete → cancelado)
    │   ├── ranking/route.ts             # GET: placar / leaderboard (lib/esporte-ranking.ts)
    │   └── resultado/route.ts           # POST: aplica placar real, calcula pontos (lib/esporte-resultado.ts)
    └── cron/
        ├── resultado/route.ts           # Ter/Qui/Sáb 22h — notifica resultado WA
        ├── lembrete/route.ts            # Ter/Qui/Sáb 10h — lembrete pagamento WA
        ├── resultados-caixa/route.ts    # Ter/Qui/Sáb 22h30 — atualiza resultados Caixa
        ├── historico/route.ts           # Diário 23h50 — atualiza loteria_historico
        └── esporte-resultados/route.ts  # Diário 06h — busca placares football-data.org e pontua

/components
├── TrevoIcon.tsx           # SVG trevo 4 folhas com cores por loteria (puro SVG, sem 'use client')
├── LoteriasCards.tsx       # Últimos resultados de cada loteria na home (Mega, Lotofácil, Quina, Lotomania) — números em texto puro (sem bolinhas)
├── CartContext.tsx         # Primeiro createContext do projeto — carrinho persistido em localStorage (bolao_carrinho)
├── UserAuthModal.tsx       # Modal Entrar/Cadastrar de participante (logo BetMais) — cadastro exige aceite dos Termos (lib/termos.ts)
├── UserAccountModal.tsx    # "Minha conta": troca de senha (forçada no 1º acesso se senha_temporaria), editar Chave PIX
├── LoginModal.tsx          # Modal de login do ADMIN (popup sobre a página atual)
├── SwRegistrar.tsx         # Registra o service worker (PWA)
└── admin/
    ├── AdminHeader.tsx         # Barra top: branding + concurso ativo + status WA
    ├── AdminLogin.tsx          # Modal de login
    ├── AdminStats.tsx          # KPI cards: participantes, receita, bolões
    ├── AdminSenha.tsx          # Painel troca de senha
    ├── AdminSettings.tsx       # Shell de abas do White-Label (delega pra components/admin/settings/*)
    ├── BolaoList.tsx           # Sidebar: CRUD bolões, copiar link, configurar
    ├── BolaoDetailPanel.tsx    # Compositor fino que junta os componentes de bolao-detail/*
    ├── BolaoEsporteEditor.tsx  # CRUD de bolão esportivo (nome, competição, textos/cores customizáveis, premiação)
    ├── IconLibrary.tsx         # Referência visual de logos/bandeiras disponíveis (copia o path pro clipboard)
    ├── ConcursoPanel.tsx       # Seleção de concurso, datas, busca Caixa por loteria
    ├── GeradorApostas.tsx      # Gerador de apostas (balanceado/frequentes/atrasados/aleatório/fechamento) — embutido no Configurador
    ├── KpiDashboard.tsx        # Analytics expandível: receita, frequência, cotas
    ├── HistoricoPanel.tsx      # Histórico por bolão/concurso + convites WA em massa
    ├── IngerirHistorico.tsx    # Importação histórico (mega/quina/lotofacil) → Supabase + estatísticas (frequência/atrasos/top15)
    ├── bolao-detail/           # Sub-painéis do detalhe de um bolão (ex-BolaoDetailPanel monolítico)
    │   ├── types.ts                # BolaoDetailPanelProps — contrato único de todos os sub-painéis
    │   ├── HeaderStats.tsx         # Cotas livres / arrecadado / participantes
    │   ├── ParticipantesList.tsx   # Lista + ações (confirmar, excluir, comprovante, exportar Sheets)
    │   ├── Configurador.tsx        # Dezenas/apostas/cotas/taxa + GeradorApostas embutido
    │   ├── Conferencia.tsx         # Conferência de sorteio (auto Caixa ou manual)
    │   └── Encerramento.tsx        # Rateio de cotas não vendidas + PIX de acréscimo
    └── settings/               # Abas de components/admin/AdminSettings.tsx
        ├── shared.tsx              # Field (com toggle mostrar/ocultar p/ senhas), Textarea, Toggle, ABAS, tipos
        ├── AppTab.tsx              # Branding: nome, tagline, cores, logo
        ├── HomeTab.tsx             # Título/rodapé/mensagens da home (paginas.home)
        ├── PagamentoTab.tsx        # Mercado Pago + PIX fallback
        ├── WhatsappTab.tsx         # Whapi token/grupo/horário
        ├── EmailTab.tsx            # Gmail/Resend
        ├── LoteriaTab.tsx          # Regras de participação por loteria (paginas.bolao)
        ├── EsporteTab.tsx          # Defaults visuais do bolão esportivo + premiação
        ├── CliTab.tsx              # Tokens pessoais de CLI (Supabase/Vercel/GitHub) — só referência, app não lê em runtime
        └── GoogleTab.tsx           # Credenciais da Service Account do Google (Sheets API) — usado em runtime por exportar-sheets

/hooks/admin
├── useAdminShell.ts     # Branding do header admin (nome/grupo) via config-publica
├── useBoloes.ts         # CRUD bolões, config, cálculo de pricing
├── useConcurso.ts       # Concurso ativo, busca Caixa por loteria, edição de datas
├── useConferencia.ts    # Workflow de conferência de sorteio
├── useHistorico.ts      # Histórico de bolões/concursos, convites WA
├── useKpis.ts           # Analytics agregados
└── useParticipantes.ts  # CRUD participantes, confirmação, lembrete, encerramento, exportar Sheets

/lib
├── supabase.ts        # Cliente Supabase (SERVICE_KEY) — não expor no browser
├── auth.ts            # JWT + bcrypt admin: verificarToken / gerarToken / verificarSenha / alterarSenha
├── auth-usuario.ts     # JWT + bcrypt participante (payload {uid, tipo:'usuario'}, 30 dias) — paralelo a auth.ts
├── termos.ts           # TERMOS_PARTICIPACAO (conteúdo) + TERMOS_VERSAO (aceite único no cadastro)
├── settings.ts         # Sistema white-label: namespaces, DEFAULTS, cache 5min, getAllSettings/salvarSettings
├── loterias.ts         # Config por loteria: totalNumeros, minDezenas, maxDezenas, drawDays, precos
├── competicoes.ts       # Catálogo de competições esportivas (FIFA/football-data/manual) — seed de competicoes_esporte
├── times-esporte.ts     # Times cadastrados (Brasileirão etc.) com cores/abreviação p/ shields SVG
├── esporte-ranking.ts   # Monta ranking (pontos por participante) a partir de palpites + jogos
├── esporte-resultado.ts # Calcula pontos por categoria (A/B/C/D) ao aplicar o placar real de um jogo
├── mercadopago.ts      # criarPixMP / buscarPagamentoMP
├── pix-local.ts        # Gerador PIX EMV — chave lida de settings.pagamento.pix_chave
├── whatsapp.ts         # Todas as notificações WA via Whapi.cloud
├── email.ts            # Nodemailer/Resend: PIX, confirmação pagamento, resultado, lembrete, senha temporária
├── google-sheets.ts     # exportarParaSheets() — Service Account JWT, cria aba se não existir, sobrescreve
└── bandeiras.ts        # País → ISO 3166-1 alpha-2 (flags no bolão esportivo)

/middleware.ts       # Security headers em todas as rotas
/vercel.json         # 5 cron schedules + região
/public/flags/       # 80+ bandeiras nacionais (PNG/SVG)
/public/logos/       # Logos de competições e federações (esporte)
/supabase/migrations/*.sql  # Uma migração por mudança de schema — executar manualmente no Supabase SQL Editor (não há migration runner)
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
  loteria     varchar(20) DEFAULT 'mega',  -- 'mega' | 'quina' | 'lotofacil' (ver lib/loterias.ts — Lotomania não é vendável, só exibida na home)
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

-- Participantes (loteria)
participantes (
  id             uuid PK,
  concurso       varchar,
  bolao_slug     varchar,
  nome           varchar,
  telefone       varchar,      -- com DDI 55, sourced do cadastro da conta (não digitado no formulário)
  email          varchar,
  cotas          int[],
  total          numeric,
  status         varchar,       -- 'aguardando' | 'pago' | 'cancelado'
  mp_payment_id  varchar,
  pix_code       text,
  acrescimo      numeric,
  acrescimo_pago boolean,
  usuario_id     uuid REFERENCES usuarios(id),   -- nullable (retrocompat)
  pedido_id      uuid REFERENCES pedidos(id)     -- agrupa N participantes num único pagamento (carrinho)
)

-- Contas de participante (login/cadastro — separado do admin)
usuarios (
  id                uuid PK,
  nome              varchar,
  email             varchar UNIQUE,
  telefone          varchar,     -- SEM DDI (10-11 dígitos)
  senha_hash        varchar,
  chave_pix         varchar,     -- obrigatória no cadastro novo; nullable p/ contas migradas (editável em "Minha Conta")
  senha_temporaria  boolean,     -- true p/ contas migradas até trocar a senha
  termos_aceitos_em timestamptz,
  termos_versao     int DEFAULT 1,
  criado_em         timestamptz
)

-- Checkout consolidado do carrinho — 1 PIX cobrindo N participantes (loteria e/ou esporte, bolões diferentes)
pedidos (
  id             uuid PK,
  usuario_id     uuid REFERENCES usuarios(id),
  total          numeric,
  status         varchar,     -- 'aguardando' | 'pago' | 'cancelado'
  mp_payment_id  varchar,
  pix_code       text,
  criado_em      timestamptz
)

-- Configurações white-label
settings (
  namespace   varchar PK,   -- 'app' | 'pagamento' | 'whatsapp' | 'email' | 'paginas.home' | 'paginas.bolao' | 'paginas.esporte' | 'cli' | 'google'
  dados       jsonb,
  updated_at  timestamptz
)

-- Histórico unificado (todas as loterias)
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

-- Config global key-value (legado — admin_password ainda mora aqui, resto migrou pra `settings`)
config ( key varchar PK, value text )

-- ── Bolão esportivo (multi-competição: FIFA, Brasileirão, Champions etc.) ──
competicoes_esporte (
  id          uuid PK,
  nome        varchar,
  logo_url    varchar,
  cor         varchar,
  fonte       varchar(20),  -- 'fifa' | 'football-data' | 'manual'
  api_codigo  varchar,      -- código na football-data.org (ex: 'BSA', 'PL', 'CL')
  temporada   varchar,
  ativo       boolean
)

boloes_esporte (
  id, slug, nome, descricao, valor_cota, ativo, encerrado,
  competicao_id     uuid REFERENCES competicoes_esporte(id),
  logo_url, cor_primaria, header_desc,
  label_cta, label_palpites, label_jogo_hoje, label_noticias,   -- textos customizáveis por bolão
  premiacao         jsonb   -- [{ lugar, emoji, label, categoria, pts, pct }]
)

jogos (   -- vinculado por bolao_slug (não bolao_id)
  id, bolao_slug, time_casa, time_fora, bandeira_casa, bandeira_fora,
  data_jogo, hora_jogo, fase, grupo, ordem,
  gol_casa, gol_fora, encerrado,
  api_jogo_id       varchar   -- id do jogo na football-data.org, p/ buscar resultado automaticamente
)

participantes_esporte (
  id, bolao_slug, nome, telefone, email, chave_pix, total, status,
  mp_payment_id, pix_code, pontos_total,
  usuario_id uuid REFERENCES usuarios(id),
  pedido_id  uuid REFERENCES pedidos(id)
)

-- Palpites normalizados (1 linha por jogo apostado, não jsonb embutido)
palpites (
  id, participante_id uuid REFERENCES participantes_esporte(id),
  bolao_slug, jogo_id uuid REFERENCES jogos(id),
  gol_casa int, gol_fora int, pontos int
)
```

### Fallback mega → loteria_historico
`api/estatisticas/[tipo]/route.ts` detecta se `loteria_historico` está vazia para 'mega' e usa `mega_historico` automaticamente (`megaFallback()`). Transparente para o cliente.

### Pontuação do bolão esportivo (`lib/esporte-resultado.ts`)
Ao aplicar o placar real de um jogo, cada palpite é classificado em categoria e pontuado:
- **A** — acertou o placar exato → padrão 5 pts
- **B** — acertou o vencedor (não empate), placar diferente → padrão 3 pts
- **C** — errou o vencedor, mas acertou a margem de gols → padrão 2 pts
- **D** — previu empate e saiu empate, placar diferente → padrão 1 pt
- Errou tudo acima → 0 pts

Os pontos exatos por categoria vêm de `settings.paginas.esporte.premiacao` (editável por bolão em `BolaoEsporteEditor.tsx`).

---

## Configuração de Loterias (`lib/loterias.ts`)

```typescript
type LoteriaId = 'mega' | 'quina' | 'lotofacil'   // Lotomania só é exibida na home (LoteriasCards), não é vendável

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

### 1. Cadastro/Login de participante (conta própria, separada do admin)
```
UserAuthModal → aba Cadastrar: nome, email, telefone, Chave PIX, senha, aceite dos Termos (lib/termos.ts)
→ POST /api/usuario/cadastro → valida tudo + aceite obrigatório → grava termos_aceitos_em/versao → cookie user_token (30 dias)
→ GET /api/usuario/me em toda página de bolão faz autofill (sem redigitar dados a cada bolão novo)
```
Contas migradas de participantes antigos (via `POST /api/admin/migrar-usuarios`, ação pontual do admin) recebem `senha_temporaria=true` e senha aleatória por e-mail — `UserAccountModal` força a troca no 1º acesso. Podem não ter `chave_pix` (nullable) até editarem em "Minha Conta".

### 2. Participação num bolão (loteria OU esportivo) — SÓ VIA CARRINHO
```
BolaoForm / EsporteForm → login-gate (exige conta) → seleciona cotas/palpites → "Adicionar ao Carrinho"
  (cart.addItem grava no CartContext, persistido em localStorage — SEM chamada de rede, sem gerar PIX ainda)
→ Usuário acessa /carrinho → revisa itens de N bolões diferentes → "Finalizar e Pagar"
→ POST /api/checkout → valida cada item contra o banco (bolão ativo, cotas livres, valor bate, jogo não iniciado)
   → gera UM PIX pro total consolidado (MP ou fallback local)
   → cria 1 pedidos + insere N participantes/participantes_esporte, todos com o mesmo mp_payment_id/pedido_id
→ Polling GET /api/status?paymentId= até 'approved'
→ POST /api/webhook/mercadopago → status='pago' em TODAS as linhas daquele mp_payment_id (sem .single(), suporta múltiplos itens)
```
**Os antigos `POST /api/pix` e `POST /api/participantes`/`POST /api/esporte/participantes` foram desativados (retornam 410)** — não há mais fluxo de pagamento direto por bolão; nenhuma UI atual os chama.

### 3. Upload de apostas (Admin)
```
Admin cola texto ou PDF (ou usa o GeradorApostas embutido no Configurador)
→ POST /api/admin/apostas-upload
→ parseBets() — detecta dezenas/linha automaticamente pelo range da loteria
   (aceita qualquer tamanho entre minDezenas e maxDezenas; detecta o mais frequente)
→ Salva em boloes.apostas_data = { bets, dezenas_por_aposta, total_apostas, ... }
```

### 4. Conferência de sorteio (Admin)
```
GET  /api/admin/conferir-sorteio  → busca dezenas na API Caixa (automático)
POST /api/admin/conferir-sorteio  → entrada manual de dezenas (fallback)
→ Classifica apostas por acertos
→ Salva em boloes.resultado_conferencia
→ POST /api/admin/acertos-pos-sorteio → notifica participantes via WA
```

### 5. Encerramento de bolão
```
POST /api/admin/encerrar-bolao
→ Calcula acréscimo proporcional por participante pago
→ Gera PIX individual para cada participante
→ Envia via WhatsApp
→ Marca boloes.encerrado = true
```

### 6. Bolão esportivo — resultado e ranking
```
Admin importa jogos (CSV manual ou football-data.org, por competição cadastrada em competicoes_esporte)
→ Cron diário (06h) ou POST /api/esporte/resultado aplica o placar real
→ lib/esporte-resultado.ts categoriza cada palpite (A/B/C/D) e grava pontos em `palpites`
→ lib/esporte-ranking.ts soma pontos por participante → GET /api/esporte/ranking
```

### 7. Exportar participantes para Google Sheets (Admin, opcional)
```
Admin configura Service Account em Configurações → Google (client_email, private_key, spreadsheet_id)
→ Botão "Exportar Sheets" no painel de participantes do bolão
→ POST /api/admin/exportar-sheets → lib/google-sheets.ts cria/limpa a aba (nome = slug do bolão) e escreve a lista atual
```
Requer que a planilha de destino seja compartilhada (Editor) com o e-mail da Service Account. Feature independente — app funciona normalmente sem configurar isso.

---

## Variáveis de Ambiente

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Auth admin
JWT_SECRET=              # OBRIGATÓRIO mudar em produção — usado também pelas contas de participante (auth-usuario.ts)
ADMIN_PASSWORD_HASH=     # bcrypt hash da senha admin

# Pagamentos (fallback — sobrescrito por settings.pagamento se configurado no admin)
MP_ACCESS_TOKEN=

# WhatsApp (fallback — sobrescrito por settings.whatsapp)
WHAPI_TOKEN=
WHAPI_GROUP_ID=

# Email (fallback — sobrescrito por settings.email)
EMAIL_GMAIL_USER=
EMAIL_GMAIL_PASS=
RESEND_API_KEY=

# Esporte (fallback — sobrescrito por settings['paginas.esporte'].football_data_key)
FOOTBALL_DATA_KEY=

# Cron
CRON_SECRET=             # Verificado via ?secret= nos endpoints de cron
```

Credenciais de CLI pessoais (Supabase/Vercel/GitHub) e da Service Account do Google **não são env vars** — ficam em `settings` (namespaces `cli`/`google`), editáveis só pelo painel admin.

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

CSS: `globals.css` (utilitários globais) + módulos por página (`admin.module.css`, `comprovante.module.css`, `esporte.module.css`, `bolao.module.css`, `home.module.css`).

Dezenas (sorteio e apostas) são exibidas como **números de texto puro** (monospace, cor da loteria), não mais em bolinhas circulares — acertos ficam em negrito/cor de destaque. Evita também o overflow horizontal em mobile que bolas de tamanho fixo causavam em loterias com muitas dezenas (Lotofácil 15, Lotomania 20).

---

## Segurança

- JWT verificado individualmente em cada API route protegida (sem middleware centralizado de auth — `/admin` é o próprio login)
- Dois sistemas de auth independentes: `admin_token` (admin único) e `user_token` (contas de participante) — cookies diferentes, nunca colidem no mesmo navegador
- `JWT_SECRET` e `ADMIN_PASSWORD_HASH` são obrigatórios — `lib/auth.ts` lança erro no boot se não configurados (sem fallback fraco)
- `DELETE /api/boloes` busca slug no banco (não confia no body do cliente)
- Cron routes verificam `?secret=CRON_SECRET` via query param
- `pix-local.ts` lê a chave PIX de `settings.pagamento.pix_chave` (configurável no admin) — não há mais CPF hardcoded
- `POST /api/participantes`, `POST /api/esporte/participantes` e `POST /api/pix` retornam `410 Gone` — endpoints legados de inscrição direta desativados após a migração pro carrinho (evita gerar PIX/e-mail sem passar pelo checkout consolidado)
- `POST /api/checkout` sempre lê nome/telefone/email do registro `usuarios` no servidor (nunca confia em dado enviado pelo cliente)
- Middleware global: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`

---

## White-Label / Settings

Sistema de configuração em `lib/settings.ts`, tabela `settings` (`namespace` PK, `dados` jsonb), cache em memória com TTL de 5 min, fallback em cascata DB → `DEFAULTS` → env vars. Editável via `components/admin/AdminSettings.tsx` (abas: App, Página Home, Pagamento, WhatsApp, E-mail, Loteria, Esporte, CLIs, Google).

Namespaces: `app`, `pagamento`, `whatsapp`, `email`, `paginas.home`, `paginas.bolao` (regras por loteria), `paginas.esporte`, `cli` (tokens pessoais, só referência), `google` (Service Account, usado em runtime pela exportação de Sheets).

Campos sensíveis (`mp_access_token`, token Whapi, chave privada do Google, etc.) usam o componente `Field`/`Textarea` de `components/admin/settings/shared.tsx`, mascarados por padrão com botão 👁️ pra revelar sob demanda.

Importante: a app é **mono-tenant** (um deploy = um grupo/cliente) — não existe `tenant_id` no schema. "White-label" aqui significa branding/configuração customizável por instância, não multi-tenant SaaS.

`cor_primaria`/`cor_fundo` são injetados como CSS vars (`--green`, `--navy`) via `<style>` inline em `app/layout.tsx`, mas a maioria dos componentes ainda usa hex hardcoded (`#00AB67` etc.) em vez de `var(--green)` — migração de CSS modules para usar a var é pendente.

`paginas.home` **já é consumido** por `app/page.tsx` (título, rodapé e mensagem de "sem bolão" vêm de `/api/config-publica`) — não é mais pendência.

---

## Pendências / Dívida Técnica

| Item | Prioridade | Ação |
|------|-----------|------|
| Maioria das cores em CSS modules usa hex hardcoded, não `var(--green)` | Média | Migrar `admin.module.css`, `bolao.module.css` etc. para usar a var |
| `lib/loterias.ts` (preços/cores/dias de sorteio) fora do sistema de settings | Info | Avaliar se deve migrar para namespace `paginas.bolao` |
| Tabela `mega_historico` | Info | Manter como fallback — não migrar destrutivamente |
| Página pública `/estatisticas` foi removida | Info | Gerador de apostas hoje só existe embutido no admin (`GeradorApostas.tsx` dentro do Configurador) — reavaliar se precisa de versão pública |
| Integração Google Sheets sem credenciais em produção ainda | Baixa | Feature pronta (`lib/google-sheets.ts`, aba Google em Configurações), pausada até criar a Service Account |
| Admin não pode forçar reaceite dos Termos de Participação após editar o conteúdo | Baixa | `termos_versao` já existe em `usuarios` pra viabilizar isso — falta a rotina de comparação/reenvio |
| CRUD de bolão esportivo com 2 modelos de competição (`fonte`: fifa/football-data/manual) | Info | Ver `lib/competicoes.ts` + `competicoes_esporte` — cobre torneios internacionais e nacionais, times avulsos ficam em `lib/times-esporte.ts` |

---

## Como Rodar

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # verifica TypeScript + build completo antes de deploy
```

### Migrações SQL (executar uma vez cada, na ordem, no Supabase → SQL Editor)

Não há migration runner — cada arquivo em `supabase/migrations/*.sql` é standalone e idempotente (`IF NOT EXISTS`). Rodar todos antes do primeiro deploy num projeto novo:

```
add_loteria.sql                    # loteria_historico + coluna boloes.loteria
add_settings.sql                   # tabela settings (white-label)
add_esporte_config.sql             # textos/cores customizáveis por bolão esportivo
add_competicoes_esporte.sql        # competicoes_esporte + seed + boloes_esporte.competicao_id
add_jogos_api_id.sql               # jogos.api_jogo_id (football-data.org)
add_usuarios.sql                   # tabela usuarios (contas de participante)
add_usuarios_senha_temporaria.sql  # usuarios.senha_temporaria
add_usuarios_chave_pix.sql         # usuarios.chave_pix
add_participantes_usuario_id.sql   # participantes/participantes_esporte.usuario_id
add_pedidos.sql                    # tabela pedidos + participantes*.pedido_id (carrinho)
add_usuarios_termos.sql            # usuarios.termos_aceitos_em / termos_versao
```
