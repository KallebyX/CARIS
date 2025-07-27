# 🚀 Guia de Setup - MCPs Caris SaaS Pro

Este guia completo te ajudará a configurar todos os Model Context Protocols (MCPs) do projeto Caris SaaS Pro.

## 📋 Pré-requisitos

### Sistema Operacional
- ✅ macOS (testado em macOS 14.5+)
- ✅ Linux (Ubuntu 20.04+)
- ⚠️ Windows (com WSL2 recomendado)

### Software Necessário
```bash
# Node.js (v18+)
node --version  # >= 18.0.0

# npm ou pnpm
npm --version   # >= 8.0.0
pnpm --version  # >= 8.0.0 (recomendado)

# PostgreSQL (para produção)
psql --version  # >= 13.0

# Git
git --version  # >= 2.30.0
```

## 🔧 Instalação Rápida

### 1. Clone e Configure o Projeto
```bash
# Navegar para o diretório do projeto
cd "Caris SaaS Pro (1)"

# Instalar dependências
pnpm install

# Configurar MCPs
chmod +x mcp/utils/*.js
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar template de ambiente
cp .env.example .env

# Editar variáveis (use seu editor preferido)
nano .env
```

### 3. Configuração Básica `.env`
```env
# Database
POSTGRES_URL="postgresql://username:password@localhost:5445/caris"

# Analytics
NEXT_PUBLIC_GA_ID="G-ZC76X199S2"

# GitHub (opcional para desenvolvimento)
GITHUB_TOKEN="seu_token_aqui"

# MercadoPago (para produção)
MERCADOPAGO_ACCESS_TOKEN="seu_token_aqui"
MERCADOPAGO_CLIENT_ID="seu_client_id"
MERCADOPAGO_CLIENT_SECRET="seu_client_secret"
```

## 🏗️ Setup por Ambiente

### 🔧 Desenvolvimento Local

```bash
# 1. Verificar configuração
node mcp/utils/mcp-manager.js --list

# 2. Executar health check
node mcp/utils/health-check.js

# 3. Testar PostgreSQL (se disponível)
POSTGRES_URL="postgresql://username:password@localhost:5445/caris" node mcp/tests/test-postgres-mcp.js

# 4. Configurar ambiente de desenvolvimento
node mcp/utils/mcp-manager.js --env development
```

#### MCPs Ativos em Desenvolvimento:
- ✅ **filesystem** - Acesso ao sistema de arquivos
- ✅ **git** - Controle de versão local
- ✅ **sqlite** - Banco local (./data/caris.db)
- ✅ **memory** - Cache em memória
- ✅ **github** - Integração GitHub
- ✅ **analytics** - Google Analytics
- ✅ **pdf** - Processamento PDFs
- ✅ **puppeteer** - Automação navegador

### 🏭 Produção

```bash
# 1. Alterar ambiente
node mcp/utils/mcp-manager.js --env production

# 2. Configurar todas as variáveis necessárias
# Ver seção "Variáveis de Produção" abaixo

# 3. Testar configuração
node mcp/utils/health-check.js --save

# 4. Verificar status
node mcp/utils/mcp-manager.js --status
```

#### MCPs Ativos em Produção:
- ✅ **database** - PostgreSQL
- ⚠️ **redis** - Cache Redis
- ⚠️ **email** - Email transacional
- ✅ **payments-mercadopago** - Pagamentos
- ⚠️ **monitoring** - Sentry

## 🔐 Configuração de Variáveis

### 📊 Desenvolvimento (Mínimas)
```env
# Banco de dados
POSTGRES_URL="postgresql://user:pass@localhost:5432/caris"

# Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### 🏭 Produção (Completas)
```env
# Banco Principal
POSTGRES_URL="postgresql://user:pass@host:5432/caris"

# Cache
REDIS_URL="redis://host:6379"

# Email
RESEND_API_KEY="re_xxxxxxxxxx"

# Pagamentos
MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxxxxxx"
MERCADOPAGO_CLIENT_ID="xxxxxxxx"
MERCADOPAGO_CLIENT_SECRET="xxxxxxxx"

# Real-time
PUSHER_APP_ID="xxxxxxxx"
NEXT_PUBLIC_PUSHER_KEY="xxxxxxxx"
PUSHER_SECRET="xxxxxxxx"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"

# IA (opcional)
OPENAI_API_KEY="sk-xxxxxxxx"
ANTHROPIC_API_KEY="sk-ant-xxxxxxxx"

# Monitoramento
SENTRY_DSN="https://xxxxxxxx@sentry.io/xxxxxxxx"
SENTRY_AUTH_TOKEN="xxxxxxxx"

# SMS (opcional)
TWILIO_ACCOUNT_SID="ACxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxx"
TWILIO_PHONE_NUMBER="+1234567890"

# Storage (opcional)
R2_ACCOUNT_ID="xxxxxxxx"
R2_ACCESS_KEY_ID="xxxxxxxx"
R2_SECRET_ACCESS_KEY="xxxxxxxx"
```

## 🧪 Teste e Validação

### 1. Teste Rápido
```bash
# Verificar saúde geral
node mcp/utils/health-check.js

# Listar MCPs disponíveis
node mcp/utils/mcp-manager.js --list

# Status atual
node mcp/utils/mcp-manager.js --status
```

### 2. Teste PostgreSQL Completo
```bash
# Com variável de ambiente
POSTGRES_URL="postgresql://username:password@localhost:5445/caris" \
node mcp/tests/test-postgres-mcp.js
```

### 3. Teste MercadoPago
```bash
# Buscar documentação
node -e "console.log('MercadoPago MCP funcionando se não houver erro')"
```

### 4. Teste de Configuração
```bash
# Validar configuração completa
node mcp/utils/mcp-manager.js --test
```

## 🔄 Scripts de Automação

### Package.json Scripts
Adicione ao seu `package.json`:
```json
{
  "scripts": {
    "mcp:list": "node mcp/utils/mcp-manager.js --list",
    "mcp:status": "node mcp/utils/mcp-manager.js --status",
    "mcp:health": "node mcp/utils/health-check.js",
    "mcp:health:save": "node mcp/utils/health-check.js --save",
    "mcp:test": "node mcp/utils/mcp-manager.js --test",
    "mcp:dev": "node mcp/utils/mcp-manager.js --env development",
    "mcp:prod": "node mcp/utils/mcp-manager.js --env production"
  }
}
```

### Uso dos Scripts
```bash
# Listar MCPs
pnpm mcp:list

# Verificar saúde
pnpm mcp:health

# Alterar para produção
pnpm mcp:prod

# Verificar status
pnpm mcp:status
```

## 🚨 Solução de Problemas

### Erro: "MCP não encontrado"
```bash
# Instalar pacotes MCP
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-sqlite
npm install -g @modelcontextprotocol/server-memory
```

### Erro: "POSTGRES_URL não configurada"
```bash
# Verificar se a variável está definida
echo $POSTGRES_URL

# Configurar temporariamente
export POSTGRES_URL="postgresql://user:pass@host:5432/db"
```

### Erro: "Permissão negada"
```bash
# Dar permissão aos scripts
chmod +x mcp/utils/*.js
chmod +x mcp/tests/*.js
```

### PostgreSQL não conecta
```bash
# Verificar se o PostgreSQL está rodando
pg_ctl status

# Testar conexão manual
psql "postgresql://username:password@localhost:5445/caris" -c "SELECT 1;"
```

## 📁 Estrutura de Logs

Os MCPs criam logs nos seguintes locais:
```
logs/
├── mcp-health-check.json     # Relatórios de saúde
├── mcp-dev.log              # Logs de desenvolvimento
├── mcp-prod.log             # Logs de produção
└── error.log                # Logs de erro
```

## 🔄 Atualização e Manutenção

### Atualizar MCPs
```bash
# Atualizar todos os pacotes MCP
npm update -g @modelcontextprotocol/server-*

# Verificar versões
npm list -g | grep modelcontextprotocol
```

### Backup de Configuração
```bash
# Fazer backup da configuração
cp mcp/config/mcp-config.json mcp/config/mcp-config.json.backup

# Restaurar backup
cp mcp/config/mcp-config.json.backup mcp/config/mcp-config.json
```

## 📞 Suporte

### Documentação
- [README Principal](./README.md)
- [Documentação PostgreSQL](./postgres.md)
- [Troubleshooting](./troubleshooting.md)

### Logs e Debug
```bash
# Verificar logs em tempo real
tail -f logs/mcp-dev.log

# Verificar últimos erros
tail -n 50 logs/error.log

# Health check com save
pnpm mcp:health:save
```

### Contato
- 📧 Email: suporte@caris.com
- 📱 Slack: #caris-tech
- 🐛 Issues: GitHub Issues

---

**Próximos Passos:**
1. ✅ Configurar ambiente de desenvolvimento
2. ✅ Testar PostgreSQL e MercadoPago
3. ⚠️ Configurar ambiente de produção
4. ⚠️ Implementar monitoramento automatizado
5. ⚠️ Configurar alertas e failover

**Caris SaaS Pro** - MCP Setup v2.0 | Atualizado: 27/07/2025 