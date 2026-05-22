# 🍀 Bolão Mega - Documentação de Projeto

## 📋 Visão Geral

**Bolão Mega** é uma aplicação web para gerenciar bolões/sindicatos da Mega-Sena. Permite que grupos de pessoas se unam para fazer apostas coletivas em loterias, com gestão de cotas, participantes, pagamentos e comprovantes.

### Stack Tecnológico

- **Frontend**: Next.js 14 com React 18 (App Router)
- **Backend**: API Routes do Next.js  
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT com bcryptjs
- **Pagamentos**: Mercado Pago
- **Extras**: Geração de QR codes, html2canvas, jsPDF

## 🏗️ Arquitetura

```
/app                  # Páginas e rotas (App Router)
├── /api             # Endpoints REST
├── /admin           # Painel administrativo
├── /comprovante     # Nova: Gerador de comprovantes
└── /layout.tsx      # Layout raiz

/components           # Componentes React reutilizáveis
├── ComprovanteForm.tsx        # Novo: Formulário de aposta
└── ComprovantePreview.tsx     # Novo: Preview do comprovante

/lib                  # Utilitários e helpers
├── supabase.ts      # Cliente Supabase
├── auth.ts          # Funções de autenticação
└── comprovante.ts   # Novo: Utilitários para comprovantes

/public               # Assets estáticos
```

## 🎯 Funcionalidades Principais

### 1. Gerenciamento de Bolões
- Criar, editar e deletar bolões
- Configurar parâmetros (número de dezenas, cotas, valor)
- Ativar/desativar bolões
- Proteção: não permite deletar com participantes ativos

### 2. Concursos Ativos
- Exibir concurso atual da Mega-Sena
- Mostrar prêmio estimado
- Sincronização automática

### 3. Participantes e Cotas
- Gerenciar participantes do bolão
- Rastrear cotas por participante
- Controlar status (ativo, cancelado)

### 4. Pagamentos
- Integração com Mercado Pago
- Suporte a PIX
- Histórico de transações

### 5. **✨ NEW: Comprovantes de Aposta**
- Formulário para inserir números apostados
- Gerador de comprovante estilo Caixa Econômica
- Visualização em tempo real
- Impressão direta (Print)
- Exportação para PDF

## 📝 Nova Funcionalidade: Comprovante de Aposta

### Localização
- **Rota**: `/comprovante`
- **Página**: `app/comprovante/page.tsx`
- **Componentes**: 
  - `components/ComprovanteForm.tsx`
  - `components/ComprovantePreview.tsx`
- **Estilos**: `app/comprovante/comprovante.module.css`
- **Utilitários**: `lib/comprovante.ts`

### Funcionalidades

#### Formulário
- ✅ Seleção de 6 números (1-60) com interface visual
- ✅ Botão "Aleatória" para gerar números automaticamente
- ✅ Informações do participante (nome, CPF, concurso, data)
- ✅ Valor da aposta e local de venda
- ✅ Campo de observações livre
- ✅ Validação em tempo real

#### Comprovante
- ✅ Design estilo bolão oficial da Caixa
- ✅ Exibição formatada dos 6 números
- ✅ Todos os dados do formulário integrados
- ✅ Rodapé com aviso legal
- ✅ Timestamp automático

#### Ações
- ✅ **Imprimir**: Abre dialog de impressão do navegador
- ✅ **Gerar PDF**: Exporta para PDF com layout preservado
- ✅ Ambos otimizados para impressão

### API e Dados

```typescript
interface ComprovanteDataForm {
  numeros: number[]               // 6 números de 1-60
  nomeParticipante: string        // Nome completo
  cpfParticipante: string         // Opcional
  concursoNumero: string          // Nº do concurso da Mega
  dataAposte: string              // Data ISO (YYYY-MM-DD)
  valorAposta: number             // Em reais
  localVenda: string              // Ex: "BOLÃO MEGA"
  observacao: string              // Observações extras
}
```

### Funções Utilitárias

```typescript
// Validar números Mega-Sena (exatamente 6, de 1-60)
validarNumerosMegaSena(numeros: number[]): boolean

// Formatar número com zeros à esquerda (ex: 01)
formatarNumero(n: number): string

// Gerar PDF do comprovante
gerarPDF(elementId: string, nomeArquivo?: string): Promise<void>

// Abrir dialog de impressão
imprimirComprovante(elementId: string): void
```

### Validações

- Exatamente 6 números diferentes (1-60)
- Nome do participante obrigatório
- Número do concurso obrigatório
- Data padrão: hoje
- Valor padrão: 0

### Print/PDF

- **Print**: Usa `window.open()` com `@media print`
- **PDF**: html2canvas + jsPDF
- Ambos preservam layout e estilos
- Suporta múltiplas páginas se necessário

## 🎨 Design System

### Cores Principais
- **Verde (Brand)**: #00A651
- **Azul Caixa**: #1D6EA6
- **Ambrar (PIX/Pagos)**: #F59E0B
- **Neutros**: Escala de cinza #F8FAFC a #0F172A

### Tipografia
- **Sans**: Plus Jakarta Sans (400-800)
- **Mono**: JetBrains Mono (para números)

### Spacing Grid
- Base: 4px
- s1-s12: múltiplos de 4px

### Espaçamento e Raio
- Raio padrão: 8-12px
- Elevação com sombras definidas (e1-e4)

## 🔐 Segurança

### Autenticação
- Token JWT armazenado em cookies
- Verificação de token em operações críticas
- Funções `verificarToken()` para proteger endpoints

### Validações
- Dados do cliente e servidor
- CPF/informações pessoais opcionais
- Proteção contra exclusão de bolões com participantes

## 📊 Banco de Dados (Supabase)

### Tabelas Principais
- `boloes` - Configuração dos bolões
- `participantes` - Dados dos participantes
- `cotas` - Distribuição de cotas
- `historico` - Registro de concursos

### Nota
Comprovantes são gerados localmente (sem persistência automática)

## 🚀 Como Usar

### Para Desenvolvedores

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Rodar em desenvolvimento**:
   ```bash
   npm run dev
   ```

3. **Acessar comprovante**:
   ```
   http://localhost:3000/comprovante
   ```

4. **Build para produção**:
   ```bash
   npm run build
   npm run start
   ```

### Para Usuários

1. Ir para `/comprovante`
2. Preencher informações do participante
3. Selecionar 6 números (ou gerar aleatoriamente)
4. Clicar "Confirmar" para gerar comprovante
5. Imprimir ou exportar para PDF

## 📚 Próximos Passos Possíveis

- [ ] Integração de comprovantes com base de dados (salvar histórico)
- [ ] QR code no comprovante para validação
- [ ] Compartilhamento de comprovantes por email/WhatsApp
- [ ] Templates customizáveis por bolão
- [ ] Assinatura digital
- [ ] Suporte a múltiplos jogos (cartelas) por comprovante
- [ ] Integração com API oficial da Caixa para validação

## 🐛 Troubleshooting

### PDF não gera
- Verificar se html2canvas e jsPDF estão instalados
- Confirmar elemento com id `comprovante-preview` existe
- Testar no Chrome (melhor suporte)

### Print não abre
- Verificar permissões de pop-ups do navegador
- Alguns navegadores bloqueiam `window.open()` sem interação

### Números não selecionam
- Máximo 6 números simultaneamente
- Remover antes de adicionar novos
- Usar botão "Limpar" para resetar

## 📞 Suporte

Para dúvidas ou bugs, documentar no GitHub Issues com:
- Versão do navegador
- Steps para reproduzir
- Screenshots se aplicável
