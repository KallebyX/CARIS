# 🔌 CÁRIS SaaS Pro - Configuração MCPs

Guia rápido para ativar e configurar os Model Context Protocols (MCPs) no projeto.

## 🚀 Instalação Rápida

```bash
# Instalar MCPs essenciais
npx @modelcontextprotocol/server-postgres
npx @modelcontextprotocol/server-filesystem
npx @modelcontextprotocol/server-git
npx @modelcontextprotocol/server-brave-search
npx @modelcontextprotocol/server-github

# Para desenvolvimento
npx @modelcontextprotocol/server-sqlite
npx @modelcontextprotocol/server-memory
```

## 📋 MCPs por Categoria

### 🗄️ Dados & Banco
```bash
# Banco de dados
npx @modelcontextprotocol/server-postgres        # PostgreSQL principal
npx @modelcontextprotocol/server-sqlite          # Desenvolvimento local
npx @modelcontextprotocol/server-redis           # Cache
npx @modelcontextprotocol/server-mongodb         # NoSQL opcional

# Busca e indexação
npx @modelcontextprotocol/server-elasticsearch   # Busca avançada
```

### 🌐 Integrações Cloud
```bash
# Storage e CDN
npx @modelcontextprotocol/server-aws             # AWS S3
npx @modelcontextprotocol/server-cloudflare-r2   # Cloudflare storage
npx @modelcontextprotocol/server-gdrive          # Google Drive

# Controle de versão
npx @modelcontextprotocol/server-github          # GitHub
npx @modelcontextprotocol/server-git             # Git local
```

### 📧 Comunicação
```bash
# Email
npx @modelcontextprotocol/server-resend          # Email transacional

# SMS & Telefonia
npx @modelcontextprotocol/server-twilio          # SMS/Chamadas

# Chat & Colaboração
npx @modelcontextprotocol/server-slack           # Slack
npx @modelcontextprotocol/server-discord         # Discord
npx @modelcontextprotocol/server-pusher          # Real-time
```

### 🤖 Inteligência Artificial
```bash
# LLMs
npx @modelcontextprotocol/server-openai          # GPT models
npx @modelcontextprotocol/server-anthropic       # Claude

# Outros
npx @modelcontextprotocol/server-google-translate # Tradução
```

### 💳 Pagamentos
```bash
# Processamento
npx @modelcontextprotocol/server-stripe          # Internacional
npx @modelcontextprotocol/server-mercadopago     # Brasil
```

### 📊 Analytics & Monitoring
```bash
# Monitoramento
npx @modelcontextprotocol/server-sentry          # Error tracking
npx @modelcontextprotocol/server-google-analytics # Web analytics

# Métricas
npx @modelcontextprotocol/server-influxdb        # Time series
```

## ⚙️ Configuração por Ambiente

### Desenvolvimento Local
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "."]
    },
    "git": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-git", "."]
    },
    "sqlite": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-sqlite", "./data/dev.db"]
    },
    "memory": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-memory"]
    }
  }
}
```

### Produção
```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${POSTGRES_URL}"
      }
    },
    "redis": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-redis"],
      "env": {
        "REDIS_URL": "${REDIS_URL}"
      }
    },
    "monitoring": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-sentry"],
      "env": {
        "SENTRY_DSN": "${SENTRY_DSN}"
      }
    }
  }
}
```

## 🔑 Variáveis de Ambiente Essenciais

```env
# Banco de dados
POSTGRES_URL="postgresql://user:pass@host/db"
REDIS_URL="redis://localhost:6379"

# APIs
OPENAI_API_KEY="sk-xxxxxxxxxx"
GITHUB_TOKEN="ghp_xxxxxxxxxx"
RESEND_API_KEY="re_xxxxxxxxxx"
TWILIO_ACCOUNT_SID="ACxxxxxxxxxx"

# Monitoramento
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

## 📖 Guias de Configuração Específicos

### PostgreSQL MCP
```bash
# 1. Instalar
npx @modelcontextprotocol/server-postgres

# 2. Configurar variável
export POSTGRES_CONNECTION_STRING="postgresql://user:pass@host:5432/db"

# 3. Testar conexão
psql $POSTGRES_CONNECTION_STRING -c "SELECT 1;"
```

### GitHub MCP
```bash
# 1. Instalar
npx @modelcontextprotocol/server-github

# 2. Criar token no GitHub
# Settings → Developer settings → Personal access tokens

# 3. Configurar
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxxxxxxx"
```

### OpenAI MCP
```bash
# 1. Instalar
npx @modelcontextprotocol/server-openai

# 2. Obter API key
# https://platform.openai.com/api-keys

# 3. Configurar
export OPENAI_API_KEY="sk-xxxxxxxxxx"
```

### Resend Email MCP
```bash
# 1. Instalar
npx @modelcontextprotocol/server-resend

# 2. Criar conta no Resend
# https://resend.com

# 3. Configurar
export RESEND_API_KEY="re_xxxxxxxxxx"
```

## 🔧 Scripts de Configuração

### Script de Instalação Completa
```bash
#!/bin/bash
# install-mcps.sh

echo "🔌 Instalando MCPs para CARIS SaaS Pro..."

# MCPs essenciais
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-filesystem  
npm install -g @modelcontextprotocol/server-git
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-openai
npm install -g @modelcontextprotocol/server-resend

# MCPs opcionais
npm install -g @modelcontextprotocol/server-redis
npm install -g @modelcontextprotocol/server-sentry
npm install -g @modelcontextprotocol/server-stripe

echo "✅ MCPs instalados com sucesso!"
echo "📝 Configure as variáveis de ambiente em .env.local"
```

### Script de Verificação
```bash
#!/bin/bash
# check-mcps.sh

echo "🔍 Verificando configuração dos MCPs..."

# Verificar variáveis obrigatórias
required_vars=("POSTGRES_URL" "OPENAI_API_KEY" "GITHUB_TOKEN")

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Variável $var não configurada"
  else
    echo "✅ Variável $var configurada"
  fi
done

# Testar conexões
echo "🔗 Testando conexões..."

# PostgreSQL
if psql $POSTGRES_URL -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ PostgreSQL conectado"
else
  echo "❌ Erro na conexão PostgreSQL"
fi

# GitHub API
if curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user > /dev/null; then
  echo "✅ GitHub API funcionando"
else
  echo "❌ Erro na GitHub API"
fi

echo "📋 Verificação concluída!"
```

## 🚀 Primeiros Passos

1. **Instale os MCPs essenciais:**
   ```bash
   chmod +x install-mcps.sh
   ./install-mcps.sh
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp env.template .env.local
   # Edite .env.local com suas credenciais
   ```

3. **Verifique a configuração:**
   ```bash
   chmod +x check-mcps.sh
   ./check-mcps.sh
   ```

4. **Configure o mcp-config.json:**
   ```bash
   # O arquivo já está configurado, ajuste conforme necessário
   ```

5. **Teste o sistema:**
   ```bash
   pnpm dev
   # Acesse http://localhost:3000
   ```

## 📚 Recursos Úteis

- **Documentação MCP:** [modelcontextprotocol.org](https://modelcontextprotocol.org)
- **GitHub Repository:** [microsoft/ModelContextProtocol](https://github.com/microsoft/ModelContextProtocol)
- **Examples:** [mcp-examples](https://github.com/microsoft/mcp-examples)

## 🆘 Problemas Comuns

### MCP não funciona
```bash
# Verificar instalação
npm list -g | grep modelcontextprotocol

# Reinstalar se necessário
npm install -g @modelcontextprotocol/server-[nome]
```

### Erro de permissão
```bash
# macOS/Linux
sudo npm install -g @modelcontextprotocol/server-[nome]

# Ou usar npx (sem instalação global)
npx @modelcontextprotocol/server-[nome]
```

### Variáveis não carregam
```bash
# Verificar sintaxe do .env.local
cat .env.local | grep -v '^#' | grep '='

# Reiniciar aplicação
pnpm dev
```

---

**🎉 Pronto!** Seu CARIS SaaS Pro agora está configurado com todos os MCPs necessários para máxima produtividade!

Para suporte: [kallebyevangelho03@gmail.com](mailto:kallebyevangelho03@gmail.com) 