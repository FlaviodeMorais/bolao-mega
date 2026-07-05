# Deploy do Evolution API (self-hosted) — passo a passo

Substitui o Whapi.cloud (SaaS, plano free limitado a 5 conversas/150 msg por dia)
por uma instância própria do [Evolution API](https://github.com/EvolutionAPI/evolution-api),
software 100% grátis. Você paga só o servidor (VPS), não por mensagem/conversa.

Fixamos a versão **2.3.7** — a partir da 2.4.0 o projeto passou a exigir ativação
de licença contra o servidor da Evolution Foundation para servir tráfego.

---

## 1. Contratar uma VPS (~R$20-30/mês)

Qualquer uma serve — o Evolution API roda em 1 vCPU / 1GB RAM sem problema:

- **Hetzner Cloud** (mais barato, ~€4/mês) — https://www.hetzner.com/cloud
- **DigitalOcean** (~$6/mês) — https://www.digitalocean.com
- **Contabo** (mais barato ainda, ~R$15/mês)

Ao criar, escolha:
- Imagem: **Ubuntu 22.04 ou 24.04**
- Adicione sua chave SSH (ou anote a senha root enviada por e-mail)

Depois de criada, você vai ter um **IP público** (ex: `203.0.113.45`).

---

## 2. Conectar via SSH e instalar Docker

Do seu computador (ou peça pra mim rodar, se você me der acesso SSH à VPS):

```bash
ssh root@SEU_IP_AQUI

curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

---

## 3. (Opcional, recomendado) Apontar um domínio/subdomínio

Se você tem um domínio, crie um registro `A` apontando pro IP da VPS, ex:
`evolution.seudominio.com` → `203.0.113.45`.

Sem isso, você usa o IP direto (`http://SEU_IP:8080`) — funciona, mas sem HTTPS
(o WhatsApp/Whapi não exige HTTPS pra você acessar, só é menos seguro).
Se quiser HTTPS fácil, instale um proxy reverso com Caddy (gera certificado
automático) — me avise que eu preparo esse arquivo também.

---

## 4. Copiar os arquivos de deploy pra VPS

Do seu computador, dentro da pasta deste projeto:

```bash
scp -r deploy/evolution-api root@SEU_IP_AQUI:/root/evolution-api
```

Ou, direto na VPS via SSH, crie os arquivos `docker-compose.yml` e `.env`
manualmente colando o conteúdo de `deploy/evolution-api/docker-compose.yml`
e `deploy/evolution-api/.env.example` deste repositório.

---

## 5. Configurar o `.env`

Na VPS:

```bash
cd /root/evolution-api
cp .env.example .env
nano .env
```

Preencha:
- `SERVER_URL` → `https://evolution.seudominio.com` (ou `http://SEU_IP:8080` se não tiver domínio)
- `POSTGRES_PASSWORD` → gere uma senha forte, ex: `openssl rand -hex 24`
- `AUTHENTICATION_API_KEY` → gere outra chave forte, ex: `openssl rand -hex 32`
  (guarde essa chave — é a "senha mestra" da sua instalação, usada pra criar instâncias)

---

## 6. Subir os containers

```bash
docker compose up -d
docker compose logs -f evolution-api   # acompanhar o boot, Ctrl+C pra sair do log
```

Quando aparecer algo como `Server running on port 8080`, está no ar.

Teste rapidamente (na própria VPS ou do seu computador, se a porta 8080 estiver liberada):

```bash
curl http://SEU_IP:8080
```

---

## 7. Criar a instância do WhatsApp

Ainda na VPS (ou do seu computador, apontando pro IP/domínio):

```bash
curl -X POST http://SEU_IP:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_AUTHENTICATION_API_KEY_AQUI" \
  -d '{
    "instanceName": "bolao-mega",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

Isso cria uma instância chamada `bolao-mega` (pode escolher outro nome — é esse
nome que vai no campo "Nome da instância" das Configurações do admin).

---

## 8. Pegar o QR Code e conectar o WhatsApp

```bash
curl http://SEU_IP:8080/instance/connect/bolao-mega \
  -H "apikey: SUA_AUTHENTICATION_API_KEY_AQUI"
```

A resposta traz um campo `base64` com a imagem do QR code. Formas fáceis de ver:

- Cole o valor em https://base64.guru/converter/decode/image (decodifica e mostra a imagem), ou
- Salve o base64 num arquivo `.txt` e me peça pra gerar a imagem, ou
- Use um app tipo Postman/Insomnia que já renderiza imagens base64 na resposta.

Escaneie esse QR com o WhatsApp que vai ser o "número oficial" do bolão
(Configurações → Aparelhos conectados → Conectar um aparelho, no celular).

---

## 9. Confirmar que conectou

```bash
curl http://SEU_IP:8080/instance/connectionState/bolao-mega \
  -H "apikey: SUA_AUTHENTICATION_API_KEY_AQUI"
```

Deve retornar `"state": "open"`. Se vier `"connecting"` ou `"close"`, o QR
ainda não foi escaneado (ou expirou — gere um novo repetindo o passo 8).

---

## 10. Configurar no painel admin do Bolão Mega

Em **Configurações → WhatsApp**:

| Campo | Valor |
|---|---|
| Provedor | Evolution API |
| API Key da instância | a mesma `AUTHENTICATION_API_KEY` do `.env` |
| URL do Evolution API | `https://evolution.seudominio.com` (sem barra no final) |
| Nome da instância | `bolao-mega` |
| ID do Grupo WA | (mesmo de antes, se for reaproveitar o mesmo grupo) |
| WhatsApp ativo | ✅ marcado |

Salvar. O indicador de status no topo do admin (WA 🟢/🔴) já vai refletir a
conexão real (`GET /instance/connectionState/{instance}` por baixo dos panos).

---

## Manutenção

- **Atualizar**: `docker compose pull && docker compose up -d` (mantendo a tag `2.3.7` fixa, não some pra `latest` sem checar o changelog antes)
- **Ver logs**: `docker compose logs -f evolution-api`
- **Reiniciar**: `docker compose restart evolution-api`
- **Backup**: o volume `evolution_postgres` guarda o estado da sessão — faça snapshot da VPS periodicamente (a maioria dos provedores oferece isso por ~R$2-5/mês extra)
