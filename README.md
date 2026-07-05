# Bolão Mega

Aplicação web para gerenciar bolões de loteria (Mega-Sena, Quina, Lotofácil) e bolões esportivos (FIFA, Brasileirão, Champions League e outras competições cadastráveis), com contas de participante, carrinho de compras com checkout consolidado, painel administrativo completo, geração de PIX, notificações por WhatsApp e e-mail, exportação para Google Sheets, e rotinas automatizadas por cron.

## Visão geral

- Frontend e backend no mesmo projeto com `Next.js 14` e `App Router`
- Persistência em `Supabase` (Postgres)
- Duas autenticações independentes por JWT: admin único (cookie `admin_token`) e contas de participante (cookie `user_token`)
- Participação exige conta (cadastro rápido com aceite dos Termos de Participação uma única vez)
- Pagamento **sempre via carrinho**: dá pra colocar cotas de vários bolões (loteria e/ou esporte) e pagar tudo com um único PIX
- Pagamentos via `Mercado Pago PIX` com fallback para PIX local
- Notificações por `WhatsApp` (`Whapi`) e `e-mail` (`Nodemailer`/`Resend`)
- Sistema de configurações white-label (branding, textos, taxas, credenciais) editável 100% pelo painel admin
- Exportação de participantes para `Google Sheets` (opcional, via Service Account)

## Principais funcionalidades

### Contas e carrinho

- Cadastro/login de participante (nome, telefone, e-mail, Chave PIX, senha) com aceite dos Termos de Participação no cadastro
- Autofill de dados em qualquer bolão depois de logado — não precisa redigitar
- Carrinho persistido no navegador: adiciona cotas de loteria e/ou palpites de esporte de bolões diferentes
- Checkout único: 1 PIX cobrindo tudo que está no carrinho, N participantes criados de uma vez
- "Minha conta": troca de senha (obrigatória no 1º acesso pra contas migradas) e edição da Chave PIX

### Bolão de loteria (Mega-Sena, Quina, Lotofácil)

- Listagem de bolões ativos na home, com carrossel de sorteios e último resultado de cada loteria
- Página pública por slug pra escolher cotas
- Emissão de comprovantes (individual, com link público, ou em lote pelo admin)
- Histórico, KPIs, gerador de apostas e encerramento do bolão pelo admin

### Bolão esportivo (multi-competição)

- Suporta várias competições ao mesmo tempo (Copa do Mundo, Brasileirão, Champions League, Libertadores etc.), com times/logos/cores próprios
- Importação de jogos manual (CSV) ou automática via football-data.org
- Palpites de placar por jogo, pontuação por categoria de acerto (placar exato / vencedor / margem de gols / empate)
- Ranking automático e busca de resultados por cron diário

### Operação administrativa

- Login no painel `/admin`
- Criação e configuração de bolões (loteria e esportivo)
- Upload de apostas (texto/PDF) ou gerador automático (balanceado, frequentes, atrasados, aleatório, fechamento)
- Conferência automática (API da Caixa) ou manual de sorteio
- Envio de lembretes e comprovantes por WhatsApp/e-mail
- Exportação de participantes para Google Sheets
- Configurações white-label: branding, pagamento, WhatsApp, e-mail, regras por loteria, textos do bolão esportivo, tokens de CLI pessoais
- Cron para lembrete, resultado, histórico e resultados esportivos

## Stack

- `Next.js 14` + `React 18` + `TypeScript`
- `Supabase` (Postgres)
- `Mercado Pago` (PIX)
- `Nodemailer` / `Resend`
- `Whapi.cloud` (WhatsApp)
- `googleapis` (Google Sheets, opcional)

## Estrutura do projeto

```text
app/
  page.tsx                     Home: bolões de loteria + esportivos, header conta/carrinho/admin
  [slug]/                      Fluxo público de bolão de loteria (só adiciona ao carrinho)
  esporte/[slug]/              Fluxo público de bolão esportivo (só adiciona ao carrinho)
  carrinho/                    Carrinho consolidado + checkout (1 PIX)
  admin/                       Painel administrativo
  comprovante/                 Comprovantes (bulk admin ou link individual do participante)
  p/[id]/                      Comprovante público por participante (compartilhável)
  api/                         Rotas da aplicação (ver CLAUDE.md pra lista completa)
components/
  CartContext.tsx              Carrinho (localStorage)
  UserAuthModal.tsx            Cadastro/login de participante
  UserAccountModal.tsx         "Minha conta"
  admin/                       Painel admin (settings/, bolao-detail/, etc.)
hooks/admin/                   Lógica de estado do painel admin, por domínio
lib/
  auth.ts / auth-usuario.ts    JWT admin e JWT participante (independentes)
  settings.ts                  Sistema white-label (namespaces + cache + defaults)
  supabase.ts                  Cliente Supabase
  mercadopago.ts / pix-local.ts  Geração de PIX
  whatsapp.ts / email.ts       Notificações
  google-sheets.ts             Exportação pra planilha (Service Account)
  loterias.ts                  Config por loteria
  competicoes.ts / times-esporte.ts / esporte-*.ts   Módulo esportivo
supabase/migrations/           1 arquivo .sql por mudança de schema (rodar manualmente)
public/flags/, public/logos/   Assets visuais
middleware.ts                  Security headers
vercel.json                    Cron jobs de produção
```

Documentação técnica completa (schema de banco, todas as rotas de API, fluxos detalhados) em [`CLAUDE.md`](./CLAUDE.md).

## Rotas importantes

### Públicas

- `/` — home
- `/:slug` — página do bolão de loteria
- `/esporte/:slug` — página do bolão esportivo
- `/carrinho` — carrinho e checkout
- `/comprovante` — comprovante para impressão/consulta
- `/p/:id` — comprovante público compartilhável

### API (principais)

- `/api/boloes`, `/api/esporte/boloes` — CRUD de bolões
- `/api/concurso-ativo`, `/api/cotas` — estado do concurso vigente
- `/api/checkout` — **único** caminho de pagamento (gera PIX, cria participantes)
- `/api/status`, `/api/webhook/mercadopago` — confirmação de pagamento
- `/api/usuario/*` — cadastro, login, logout, dados da conta, troca de senha/chave PIX
- `/api/admin/*` — operação administrativa (apostas, conferência, encerramento, settings, exportação)
- `/api/esporte/*` — jogos, ranking, resultado, importação
- `/api/cron/*` — rotinas agendadas (ver `vercel.json`)

> `/api/pix`, `/api/participantes` (POST) e `/api/esporte/participantes` (POST) foram **desativados** (retornam `410`) — o pagamento direto por bolão foi substituído pelo carrinho.

## Variáveis de ambiente

Crie um arquivo `.env.local` com valores equivalentes a estes:

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Mercado Pago (fallback — sobrescrito pelas Configurações do admin)
MP_ACCESS_TOKEN=

# Admin
ADMIN_PASSWORD_HASH=
JWT_SECRET=

# WhatsApp (fallback — sobrescrito pelas Configurações do admin)
WHAPI_TOKEN=
WHAPI_GROUP_ID=

# Cron
CRON_SECRET=

# E-mail (fallback — sobrescrito pelas Configurações do admin)
EMAIL_GMAIL_USER=
EMAIL_GMAIL_PASS=
EMAIL_FROM_NAME=Bolao Mega
EMAIL_ADMIN=
RESEND_API_KEY=

# Esporte (fallback — sobrescrito pelas Configurações do admin)
FOOTBALL_DATA_KEY=
```

Credenciais de CLI pessoais (Supabase/Vercel/GitHub) e da Service Account do Google (Sheets) **não são env vars** — ficam guardadas em `settings` e são editadas só pelo painel admin (Configurações → CLIs / Google).

## Como rodar localmente

```bash
npm install
npm run dev
```

Aplicação disponível em `http://localhost:3000`.

## Scripts

- `npm run dev` inicia o ambiente local
- `npm run build` gera a build de produção
- `npm run start` sobe a build gerada
- `npm run lint` executa o lint do projeto

## Fluxos principais

### Cadastro e participação (loteria ou esporte)

1. Usuário cria conta (ou entra) — aceita os Termos de Participação uma única vez
2. Acessa `/:slug` ou `/esporte/:slug`, escolhe cotas ou preenche palpites
3. Clica em "Adicionar ao Carrinho" (sem gerar PIX ainda — pode repetir em outros bolões)
4. Vai em `/carrinho`, revisa os itens e finaliza — `/api/checkout` gera 1 PIX pro total
5. Confirmação por polling de status ou webhook do Mercado Pago

### Conferência de sorteio

1. Admin envia apostas pelo painel (upload ou gerador automático)
2. Sistema consulta o resultado na API da Caixa ou recebe dezenas manualmente
3. Resultado é salvo no bolão e participantes são notificados

### Encerramento

1. Admin encerra o bolão pelo painel
2. Sistema calcula acréscimo para participantes pagos (cotas não vendidas)
3. Gera PIX complementar quando necessário
4. Dispara avisos por WhatsApp e e-mail

## Banco de dados

Principais tabelas no `Supabase` (schema completo em `CLAUDE.md`):

- `boloes`, `participantes` — bolões e participantes de loteria
- `boloes_esporte`, `jogos`, `participantes_esporte`, `palpites`, `competicoes_esporte` — módulo esportivo
- `usuarios`, `pedidos` — contas de participante e checkout consolidado do carrinho
- `settings` — configurações white-label por namespace
- `loteria_historico`, `mega_historico` — histórico de sorteios
- `config` — legado (senha do admin)

Os schemas exatos devem ser conferidos no projeto Supabase antes de publicar em outro ambiente — rode as migrações em `supabase/migrations/` (uma vez cada, na ordem listada em `CLAUDE.md`).

## Automações

O arquivo `vercel.json` agenda:

- notificação de resultado: `0 22 * * 2,4,6`
- lembrete de pagamento: `0 10 * * 2,4,6`
- atualização de resultados da Caixa: `30 22 * * 2,4,6`
- atualização do histórico de loterias: `50 23 * * *`
- busca de resultados esportivos (football-data.org): `0 6 * * *`

As rotas de cron validam o `CRON_SECRET`.

## Segurança e observações

- Dois cookies `httpOnly` independentes: `admin_token` (admin) e `user_token` (participante) — nunca colidem
- `middleware.ts` aplica headers básicos de segurança
- Endpoints legados de pagamento direto (`/api/pix`, `/api/participantes` POST, `/api/esporte/participantes` POST) retornam `410` — usar sempre `/api/checkout`
- O projeto depende de chaves sensíveis; não versione segredos reais
- Recomenda-se rotacionar qualquer credencial que tenha sido exposta em ambiente local ou remoto

## Deploy

Pensado para deploy na `Vercel`, com:

- variáveis de ambiente configuradas no painel
- cron jobs via `vercel.json`
- integração com Supabase e Mercado Pago acessíveis em produção
