# Componentes Admin

Componentes visuais usados pelo painel `/admin`.

## Padrao de organizacao

- Cada arquivo deve representar uma responsabilidade clara da interface.
- Regras de negocio, chamadas HTTP e efeitos colaterais devem permanecer em hooks, services ou na pagina durante a primeira fase da refatoracao.
- Componentes extraidos devem receber dados e callbacks por props.
- Fluxos sensiveis, como pagamentos, confirmacao manual, encerramento e auditoria, devem ser movidos em etapas pequenas e sempre validados com build.

## Componentes

### `AdminHeader`

Responsavel pelo cabecalho principal do painel administrativo.

- Exibe o titulo do painel.
- Mostra o concurso ativo.
- Mostra o status de conexao do WhatsApp.
- Mantem o link de retorno para o formulario publico.
- Nao carrega dados e nao executa a verificacao do WhatsApp.

### `AdminLogin`

Responsavel apenas pela tela de login do painel administrativo.

- Recebe a senha digitada por `senha`.
- Exibe erro por `errLogin`.
- Notifica alteracoes por `onSenhaChange`.
- Dispara a tentativa de login por `onLogin`.
- Nao conhece API, cookie, JWT ou regra de autenticacao.
