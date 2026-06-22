# Bolao Mega

Aplicacao web para gerenciar boloes da Mega-Sena e boloes esportivos, com painel administrativo, controle de participantes, geracao de PIX, notificacoes por WhatsApp e e-mail, e rotinas automatizadas por cron.

## Visao geral

- Frontend e backend no mesmo projeto com `Next.js 14` e `App Router`
- Persistencia em `Supabase`
- Autenticacao administrativa com `JWT` em cookie `admin_token`
- Pagamentos via `Mercado Pago PIX` com fallback para PIX local
- Notificacoes por `WhatsApp` (`Whapi`) e `e-mail` (`Nodemailer`)
- Modulo extra para bolao esportivo com jogos, palpites e ranking

## Principais funcionalidades

### Bolao Mega-Sena

- Listagem de boloes ativos na home
- Pagina publica por slug para escolher cotas e gerar pagamento
- Registro de participantes com validacao de cotas ocupadas
- Confirmacao de pagamento via consulta de status e webhook
- Emissao de comprovantes
- Historico, KPIs e encerramento do bolao pelo admin

### Bolao esportivo

- Listagem de boloes esportivos na home
- Pagina publica por slug com jogos e formulario de palpites
- CRUD administrativo de boloes e jogos
- APIs para ranking, resultado, noticias e importacao de jogos

### Operacao administrativa

- Login no painel `/admin`
- Criacao e configuracao de boloes
- Upload de apostas para conferencia de sorteio
- Envio de lembretes e comprovantes
- Conferencia automatica ou manual de resultados
- Cron para lembrete e notificacao de resultado

## Stack

- `Next.js 14`
- `React 18`
- `TypeScript`
- `Supabase`
- `Mercado Pago`
- `Nodemailer`
- `Whapi.cloud`

## Estrutura do projeto

```text
app/
  page.tsx                     Home com boloes Mega e esportivos
  [slug]/                      Fluxo publico do bolao Mega-Sena
  esporte/[slug]/              Fluxo publico do bolao esportivo
  admin/                       Painel administrativo
  comprovante/                 Impressao e visualizacao de comprovantes
  api/                         Rotas da aplicacao
lib/
  auth.ts                      JWT, login e troca de senha
  supabase.ts                  Cliente Supabase
  mercadopago.ts               Integracao PIX Mercado Pago
  pix-local.ts                 Fallback de PIX local
  whatsapp.ts                  Mensagens via WhatsApp
  email.ts                     Mensagens transacionais por e-mail
public/
  flags/                       Bandeiras e assets visuais
middleware.ts                  Security headers
vercel.json                    Cron jobs de producao
```

## Rotas importantes

### Publicas

- `/` home
- `/:slug` pagina do bolao Mega-Sena
- `/esporte/:slug` pagina do bolao esportivo
- `/comprovante` comprovante para impressao/consulta

### API

- `/api/boloes`
- `/api/concurso-ativo`
- `/api/participantes`
- `/api/cotas`
- `/api/pix`
- `/api/status`
- `/api/webhook/mercadopago`
- `/api/admin/*`
- `/api/esporte/*`
- `/api/cron/resultado`
- `/api/cron/lembrete`

## Variaveis de ambiente

Crie um arquivo `.env.local` com valores equivalentes a estes:

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Mercado Pago
MP_ACCESS_TOKEN=

# Admin
ADMIN_PASSWORD_HASH=
JWT_SECRET=

# WhatsApp
WHAPI_TOKEN=
WHAPI_GROUP_ID=

# Cron
CRON_SECRET=

# E-mail
EMAIL_GMAIL_USER=
EMAIL_GMAIL_PASS=
EMAIL_FROM_NAME=Bolao Mega
EMAIL_ADMIN=
```

## Como rodar localmente

```bash
npm install
npm run dev
```

Aplicacao disponivel em `http://localhost:3000`.

## Scripts

- `npm run dev` inicia o ambiente local
- `npm run build` gera a build de producao
- `npm run start` sobe a build gerada
- `npm run lint` executa o lint do projeto

## Fluxos principais

### Inscricao no bolao Mega-Sena

1. Usuario acessa `/:slug`
2. Seleciona cotas e informa dados
3. Sistema gera PIX em `/api/pix`
4. Participante e salvo em `/api/participantes`
5. Confirmacao acontece por consulta de status ou webhook

### Conferencia de sorteio

1. Admin envia apostas pelo painel
2. Sistema consulta o resultado ou recebe dezenas manualmente
3. Resultado e salvo no bolao
4. Cron pode disparar notificacoes de resultado

### Encerramento

1. Admin encerra o bolao pelo painel
2. Sistema calcula acrescimo para participantes pagos
3. Gera PIX complementar quando necessario
4. Dispara avisos por WhatsApp e e-mail

## Banco de dados

O projeto usa ao menos estas tabelas no `Supabase`:

- `boloes`
- `participantes`
- `config`
- `boloes_esporte`
- `participantes_esporte`
- `jogos`

Os schemas exatos devem ser conferidos no projeto Supabase antes de publicar em outro ambiente.

## Automacoes

O arquivo `vercel.json` agenda:

- notificacao de resultado: `0 22 * * 2,4,6`
- lembrete de pagamento: `0 10 * * 2,4,6`

As rotas de cron validam o `CRON_SECRET`.

## Seguranca e observacoes

- O painel admin usa cookie `httpOnly`
- O `middleware.ts` aplica headers basicos de seguranca
- O projeto depende de chaves sensiveis; nao versione segredos reais
- Recomenda-se rotacionar qualquer credencial que tenha sido exposta em ambiente local ou remoto

## Deploy

Pensado para deploy na `Vercel`, com:

- variaveis de ambiente configuradas no painel
- cron jobs via `vercel.json`
- integracao com Supabase e Mercado Pago acessiveis em producao
