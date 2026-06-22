# Analise escalonada de arquitetura e componentes

Este documento organiza uma proposta de evolucao para o projeto `bolao-mega` com foco em componentizacao, dominio de boloes/loterias/esportes, reducao de arquivos extensos, manutencao de regras sensiveis e preparacao para producao.

## 1. Diagnostico atual

### Pontos fortes

- O projeto ja concentra frontend e API em `Next.js 14`, facilitando deploy na Vercel.
- A separacao de rotas por dominio ja existe em `app/api/admin`, `app/api/esporte`, `app/api/cron` e rotas publicas.
- As integracoes centrais ja estao isoladas em `lib`: Supabase, Mercado Pago, PIX local, WhatsApp, e-mail e autenticacao.
- O dominio ja cobre fluxos importantes: criacao de boloes, cotas, participantes, PIX, comprovantes, ranking esportivo, cron e painel admin.

### Gargalos principais

- `components/` esta vazio, enquanto a UI esta quase toda dentro de paginas e formularios.
- `app/admin/page.tsx` tem cerca de 1700 linhas e mistura login, estado, chamadas HTTP, regras de admin, JSX e dashboards.
- `app/[slug]/BolaoForm.tsx` tem mais de 600 linhas e mistura selecao de cotas, dados pessoais, PIX, polling, termos, resultado e modal de verificacao.
- `app/esporte/[slug]/EsporteForm.tsx` tem mais de 560 linhas e mistura cadastro, palpites, bloqueio por horario, PIX, noticias e cards de jogo.
- `app/admin/EsporteAdmin.tsx` tambem concentra CRUD, ranking, participantes, jogos, importacao e formulario de resultado.
- CSS grande em `app/globals.css`, `app/admin/admin.module.css` e modulos especificos, com risco de classes dificeis de rastrear.

## 2. Objetivo arquitetural

Separar o projeto por responsabilidades sem alterar comportamento de negocio no primeiro ciclo.

A direcao recomendada e:

- `app/`: rotas, carregamento server-side e composicao de paginas.
- `components/`: componentes visuais reutilizaveis e componentes de dominio.
- `features/`: estados, hooks, regras de tela e componentes especificos por area.
- `lib/`: clientes externos, utilitarios e regras compartilhadas.
- `types/`: contratos TypeScript compartilhados.

## 3. Estrutura sugerida

```text
components/
  ui/
    Button.tsx
    Modal.tsx
    Tabs.tsx
    StatusBadge.tsx
    Money.tsx
    EmptyState.tsx
  layout/
    PageHeader.tsx
    SectionPanel.tsx
  bolao/
    CotaGrid.tsx
    ParticipanteCard.tsx
    PixPaymentBox.tsx
    ResultadoConferencia.tsx
    ComprovanteCard.tsx
  esporte/
    JogoCard.tsx
    PalpiteInput.tsx
    TimeBandeira.tsx
    RankingTable.tsx
    MomentosCarousel.tsx
  admin/
    AdminLogin.tsx
    AdminStats.tsx
    BolaoList.tsx
    BolaoDetail.tsx
    ParticipantesPanel.tsx
    ConcursoPanel.tsx
    KpiDashboard.tsx
    HistoricoPanel.tsx
    SecurityPanel.tsx

features/
  admin/
    hooks/
      useAdminAuth.ts
      useBoloesAdmin.ts
      useParticipantesAdmin.ts
      useConcursoAtivo.ts
      useKpis.ts
      useHistorico.ts
    services/
      adminApi.ts
    types.ts
  bolao/
    hooks/
      useBolaoPublico.ts
      usePixPolling.ts
      useCotas.ts
    services/
      bolaoApi.ts
    types.ts
  esporte/
    hooks/
      usePalpites.ts
      useEsportePayment.ts
      useEsporteAdmin.ts
    services/
      esporteApi.ts
    types.ts

types/
  bolao.ts
  esporte.ts
  pagamento.ts
  admin.ts
```

## 4. Refatoracao por fases

### Fase 1: Extrair componentes sem mudar regra

Prioridade: baixa chance de quebrar fluxo.

- Separar `AdminLogin`, `AdminStats`, `BolaoList`, `ConcursoPanel`, `KpiDashboard`, `HistoricoPanel` e `SecurityPanel` a partir de `app/admin/page.tsx`.
- Separar `CotaGrid`, `PixPaymentBox`, `ParticipanteCard`, `TermosModal` e `ResultadoConferencia` a partir de `app/[slug]/BolaoForm.tsx`.
- Separar `JogoCard`, `TimeBandeira`, `MomentosCarousel` e `PixPaymentBox` a partir de `app/esporte/[slug]/EsporteForm.tsx`.
- Manter o estado principal nos arquivos atuais durante esta fase.
- Validar com `npm run build` depois de cada bloco extraido.

Resultado esperado:

- Arquivos de pagina menores.
- JSX mais legivel.
- Nenhuma mudanca de API, banco ou regra de pagamento.

### Fase 2: Extrair hooks de tela

Prioridade: reduzir acoplamento entre UI e fluxo.

- Criar `useAdminAuth` para login, cookie e troca de senha.
- Criar `useBoloesAdmin` para carregar, criar, renomear, cancelar, excluir e configurar boloes.
- Criar `useParticipantesAdmin` para confirmar pagamento, excluir, selecionar, enviar comprovante e lembrete.
- Criar `useBolaoPublico` para carregar concurso, bolao, cotas e participantes.
- Criar `usePixPolling` para polling de pagamento em Mega-Sena e esporte.
- Criar `usePalpites` para validacao e estado dos palpites esportivos.

Resultado esperado:

- Componentes focados em renderizacao.
- Regras de tela testaveis em isolamento.
- Menos risco de regressao ao mexer em UX.

### Fase 3: Consolidar contratos e regras de dominio

Prioridade: preparar produto para escala.

- Centralizar tipos em `types/bolao.ts`, `types/esporte.ts`, `types/pagamento.ts` e `types/admin.ts`.
- Criar validadores de dominio para:
  - cotas duplicadas;
  - valor enviado diferente do valor calculado no servidor;
  - bolao encerrado ou inativo;
  - palpite enviado apos inicio do jogo;
  - pagamento local sem confirmacao automatica;
  - acrescimo de encerramento.
- Padronizar respostas de API com `{ ok, data, error }`.
- Padronizar status de pagamento e participante com enums/constantes.

Resultado esperado:

- Regras criticas deixam de ficar espalhadas.
- Menos divergencia entre admin, publico e API.
- Preparacao para testes automatizados.

### Fase 4: Hardening de producao

Prioridade: seguranca, auditoria e operacao.

- Criar tabela de auditoria para acoes admin: login, criacao, exclusao, confirmacao manual, alteracao de resultado e encerramento.
- Registrar IP/user-agent em operacoes sensiveis quando aplicavel.
- Exigir idempotencia em criacao de PIX e webhook.
- Persistir eventos de webhook Mercado Pago para rastreio.
- Separar `status` de participante de `status_pagamento`, quando o negocio exigir mais granularidade.
- Criar uma tela de auditoria no admin para conferencias e pagamentos manuais.

Resultado esperado:

- Mais controle contra fraude operacional.
- Melhor investigacao de inconsistencias.
- Mais confianca para rodar em producao.

## 5. Componentes prioritarios

### Admin

`app/admin/page.tsx` deve ser o primeiro alvo porque concentra o maior risco de manutencao.

Ordem sugerida:

1. `AdminLogin`
2. `AdminStats`
3. `BolaoList`
4. `BolaoDetail`
5. `ParticipantesPanel`
6. `ConferenciaSorteioPanel`
7. `KpiDashboard`
8. `HistoricoPanel`
9. `SecurityPanel`

### Bolao publico

`app/[slug]/BolaoForm.tsx` deve ser o segundo alvo, porque e o fluxo mais sensivel para conversao e pagamento.

Ordem sugerida:

1. `BolaoHeader`
2. `CotaGrid`
3. `ParticipanteForm`
4. `PixPaymentBox`
5. `ParticipantesList`
6. `VerificacaoParticipanteModal`
7. `TermosModal`

### Esporte

`app/esporte/[slug]/EsporteForm.tsx` e `app/admin/EsporteAdmin.tsx` devem ser tratados depois da base de Mega-Sena.

Ordem sugerida:

1. `TimeBandeira`
2. `JogoCard`
3. `PalpiteInput`
4. `EsportePixPaymentBox`
5. `RankingTable`
6. `EsporteAdminBoloes`
7. `EsporteAdminJogos`
8. `EsporteAdminResultado`

## 6. Regras de produto que merecem endurecimento

### Mega-Sena e cotas

- O servidor ja recalcula o total esperado por cota; manter essa regra sempre no backend.
- Bloquear cotas ocupadas deve considerar concorrencia, idealmente com restricao no banco ou transacao.
- Confirmacao manual de pagamento precisa entrar em auditoria.
- Encerramento deve ser idempotente para evitar gerar acrescimos duplicados.

### Palpites esportivos

- Palpite deve ser bloqueado pelo horario oficial do jogo no servidor, nao apenas no frontend.
- Resultado final deve recalcular ranking de forma idempotente.
- Pontuacao deve ser versionada se as regras mudarem durante a competicao.
- Jogos importados devem ter origem registrada para auditoria.

### PIX e pagamentos

- Mercado Pago deve ser fonte principal quando houver `mp_payment_id`.
- PIX local precisa de confirmacao administrativa explicita.
- Webhook deve salvar o payload bruto ou um resumo rastreavel.
- Status duplicados ou fora de ordem precisam ser ignorados com seguranca.

## 7. Melhorias de banco recomendadas

### Tabelas novas

- `audit_logs`
- `payment_events`
- `admin_sessions`
- `ranking_snapshots`

### Campos recomendados

- `participantes.status_pagamento`
- `participantes.confirmado_por`
- `participantes.confirmado_em`
- `participantes.payment_provider`
- `participantes.idempotency_key`
- `boloes.regras_versao`
- `boloes_esporte.regras_pontuacao`
- `jogos.resultado_confirmado_em`
- `jogos.resultado_confirmado_por`

## 8. Sequencia de execucao recomendada

1. Criar `types/` com os contratos mais usados.
2. Extrair componentes visuais do admin sem mover estado.
3. Rodar build e ajustar imports.
4. Extrair componentes do fluxo publico Mega-Sena.
5. Rodar build e testar inscricao ate a geracao de PIX.
6. Extrair componentes do modulo esportivo.
7. Extrair hooks por dominio.
8. Padronizar services de API.
9. Adicionar auditoria e hardening.
10. Criar testes focados nas regras de negocio.

## 9. Regra de ouro para os proximos PRs

Cada refatoracao deve seguir este limite:

- mover componente primeiro;
- manter comportamento igual;
- rodar build;
- so depois extrair regra/hook;
- evitar alterar UI, regra de pagamento e estrutura de banco no mesmo passo.

Isso reduz risco em um produto que mexe com dinheiro, comprovantes e competicoes.
