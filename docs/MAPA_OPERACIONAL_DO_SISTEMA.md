# Mapa operacional do sistema

Este documento registra o entendimento atual do projeto `bolao-mega` por dominio, fluxo e responsabilidade tecnica. Ele serve como base para futuras refatoracoes seguras.

## 1. Dominios principais

### Mega-Sena

Fluxo publico em `app/[slug]/BolaoForm.tsx`.

Responsabilidades:

- carregar concurso ativo;
- carregar configuracao do bolao por `slug`;
- listar cotas ocupadas e participantes;
- selecionar cotas;
- aceitar termos;
- gerar PIX;
- registrar participante;
- acompanhar status de pagamento;
- liberar comprovante publico mediante verificacao do nome.

APIs principais:

- `GET /api/boloes`
- `GET /api/concurso-ativo`
- `GET /api/cotas`
- `GET /api/participantes`
- `POST /api/pix`
- `POST /api/participantes`
- `GET /api/status`

Regras server-side ja existentes:

- bolao precisa existir;
- bolao nao pode estar inativo;
- bolao nao pode estar encerrado;
- valor enviado e recalculado no backend;
- cotas ocupadas sao checadas antes de inserir;
- participantes cancelados nao bloqueiam cotas.

### Admin Mega-Sena

Fluxo em `app/admin/page.tsx`.

Responsabilidades:

- login;
- configurar concurso ativo;
- criar, renomear, cancelar, reativar e excluir boloes;
- configurar dezenas, quantidade de apostas, cotas e taxa;
- listar participantes do bolao;
- confirmar pagamentos manualmente;
- enviar lembrete e comprovante;
- carregar apostas;
- conferir resultado automaticamente pela Caixa ou manualmente;
- encerrar bolao e calcular acrescimo;
- visualizar KPIs e historico.

APIs principais:

- `POST /api/auth`
- `POST/PATCH/DELETE /api/boloes`
- `POST /api/concurso-ativo`
- `PATCH/DELETE /api/participantes/[id]`
- `POST /api/admin/apostas-upload`
- `GET/POST/DELETE /api/admin/conferir-sorteio`
- `POST /api/admin/encerrar-bolao`
- `POST /api/admin/comprovante`
- `POST /api/admin/lembrete`
- `GET /api/admin/kpis`
- `GET /api/historico`

### Bolao esportivo

Fluxo publico em `app/esporte/[slug]/EsporteForm.tsx`.

Responsabilidades:

- carregar bolao esportivo e jogos;
- salvar dados do participante em `localStorage`;
- preencher palpites;
- bloquear visualmente jogos iniciados;
- validar no backend se algum jogo apostado ja comecou;
- gerar PIX;
- registrar participante e palpites;
- mostrar status de pagamento.

APIs principais:

- `GET /api/esporte/boloes`
- `GET /api/esporte/jogos`
- `POST /api/esporte/participantes`
- `GET /api/esporte/ranking`
- `POST /api/esporte/resultado`
- `POST /api/esporte/importar-jogos`
- `DELETE /api/esporte/limpar-jogos`

Regras server-side ja existentes:

- bolao esportivo precisa existir;
- bolao esportivo precisa estar ativo;
- bolao esportivo nao pode estar encerrado;
- jogo encerrado ou iniciado bloqueia aposta;
- palpites sao salvos em tabela propria;
- ranking considera somente participantes pagos.

### Admin esportivo

Fluxo em `app/admin/EsporteAdmin.tsx`.

Responsabilidades:

- criar bolao esportivo;
- selecionar bolao;
- editar configuracao;
- excluir bolao;
- criar e excluir jogos;
- importar jogos FIFA;
- registrar resultado;
- listar participantes;
- confirmar status de participante;
- visualizar ranking.

## 2. Tabelas Supabase usadas

- `boloes`
- `participantes`
- `config`
- `boloes_esporte`
- `participantes_esporte`
- `jogos`
- `palpites`

## 3. Integracoes externas

### Supabase

Arquivo: `lib/supabase.ts`.

Uso atual:

- cliente unico com `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`;
- rotas de API fazem leitura e escrita diretamente;
- paginas server-side consultam dados publicos por slug.

### Mercado Pago

Arquivo: `lib/mercadopago.ts`.

Uso atual:

- `criarPixMP` cria pagamento PIX;
- `buscarPagamentoMP` consulta status;
- webhook em `/api/webhook/mercadopago` confirma pagamento aprovado.

### PIX local

Arquivo: `lib/pix-local.ts`.

Uso atual:

- fallback quando Mercado Pago falha;
- gera codigo PIX local e QR Code;
- confirmacao exige acao manual quando nao ha webhook Mercado Pago.

### WhatsApp

Arquivo: `lib/whatsapp.ts`.

Uso atual:

- notifica grupo sobre inscricao;
- confirma pagamento;
- envia comprovante;
- envia lembrete;
- envia acrescimo;
- notifica resultado.

### E-mail

Arquivo: `lib/email.ts`.

Uso atual:

- envia PIX;
- confirma pagamento;
- envia lembrete;
- envia resultado;
- notifica admin sobre inscricao.

### Caixa

Uso atual:

- conferencia de sorteio em `/api/admin/conferir-sorteio`;
- cron de resultado em `/api/cron/resultado`;
- endpoint usado: `servicebus2.caixa.gov.br/portaldeloterias/api/megasena`.

### FIFA

Uso atual:

- importacao de jogos recebe payload ja buscado pelo navegador/admin;
- normaliza nomes, grupos, fases, horarios e bandeiras;
- salva em `jogos`.

## 4. Automacoes

Arquivo: `vercel.json`.

Rotinas:

- `/api/cron/resultado?secret=...`
- `/api/cron/lembrete?secret=...`

Protecao:

- ambas validam `CRON_SECRET` por query string.

## 5. Pontos sensiveis identificados

### Pagamento esportivo

Achado:

- `POST /api/esporte/participantes` salva pagamento em `participantes_esporte`;
- `GET /api/status` consulta apenas `participantes`;
- webhook Mercado Pago atualiza apenas `participantes`;
- `EsporteForm` espera `st.status === 'approved'`, mas o fluxo Mega usa `status === 'pago'`.

Risco:

- pagamento esportivo pode nao confirmar automaticamente na UI e pode depender de confirmacao manual no admin.

Tratamento recomendado:

- ajustar `/api/status` para procurar tambem em `participantes_esporte`;
- ajustar webhook para atualizar `participantes_esporte` quando `mp_payment_id` existir ali;
- padronizar resposta como `pago` para ambos os dominios.

### Concorrencia de cotas

Achado:

- backend checa cotas ocupadas antes de inserir, mas nao ha evidencia local de transacao ou constraint unica por cota.

Risco:

- duas inscricoes simultaneas podem tentar reservar a mesma cota.

Tratamento recomendado:

- criar tabela normalizada de reservas/cotas ou constraint transacional;
- manter validacao atual como camada de aplicacao.

### Encerramento do bolao

Achado:

- encerramento gera acrescimo por participante e depois marca bolao como encerrado.

Risco:

- se houver erro parcial, alguns participantes podem receber acrescimo e outros nao.

Tratamento recomendado:

- tornar encerramento idempotente;
- registrar `encerrado_em`, `encerrado_por` e eventos por participante;
- bloquear novo processamento se ja houver acrescimos gerados.

### Ranking esportivo

Achado:

- ao registrar resultado, pontos sao somados ao total atual do participante.

Risco:

- se o resultado do mesmo jogo for salvo novamente, os pontos podem ser somados de novo.

Tratamento recomendado:

- recalcular total do participante a partir de todos os palpites, em vez de somar incrementalmente;
- salvar historico de resultado ou impedir reprocessamento sem reset controlado.

### Auditoria

Achado:

- acoes sensiveis de admin nao registram ator, IP, user-agent ou payload resumido.

Risco:

- dificuldade de investigar confirmacoes manuais, exclusoes, resultados e encerramentos.

Tratamento recomendado:

- criar `audit_logs`;
- registrar acoes admin sensiveis antes/depois;
- exibir painel de auditoria.

## 6. Ordem recomendada para evolucao segura

1. Corrigir pagamento esportivo, por ser possivel impacto real em usuarios pagantes.
2. Extrair componentes visuais pequenos do admin, sempre com build.
3. Criar tipos compartilhados para `Bolao`, `Participante`, `BolaoEsporte`, `Jogo` e `Palpite`.
4. Extrair services de API client-side.
5. Tornar ranking esportivo idempotente.
6. Tornar encerramento do bolao idempotente.
7. Adicionar auditoria de admin.
8. Atacar concorrencia de cotas no banco.

## 7. Principio para proximas mudancas

Como o app esta publicado e tem publico dependente:

- uma mudanca por vez;
- diff pequeno;
- sem alterar regra e UI no mesmo passo;
- build obrigatoria antes de deploy;
- alteracoes em pagamento sempre tratadas como alto risco;
- logs/auditoria antes de automatizacoes destrutivas.
