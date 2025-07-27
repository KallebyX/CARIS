# 🔌 CÁRIS - Configuração MCPs para Claude Code

## ✅ Status Atual

Os seguintes MCPs foram configurados para o Claude Code:

### MCPs Configurados
- ✅ **filesystem** - Acesso ao sistema de arquivos do projeto
- ✅ **memory** - Cache em memória para desenvolvimento  
- ✅ **github** - Integração com GitHub (precisa GITHUB_TOKEN)
- ✅ **enhanced-postgres** - PostgreSQL com read/write (precisa POSTGRES_URL)
- ✅ **puppeteer-enhanced** - Automação de navegador

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` com suas credenciais reais:

```bash
# GitHub (obrigatório para MCP github)
GITHUB_TOKEN=ghp_seu_token_github_aqui

# PostgreSQL (obrigatório para MCP enhanced-postgres) 
POSTGRES_URL=postgresql://username:password@host:5432/database

# Opcional - outras integrações
NEXT_PUBLIC_GA_ID=G-YOUR_GA_ID
RESEND_API_KEY=re_your_api_key
```

### 2. Verificar MCPs

```bash
# Listar MCPs configurados
claude mcp list

# Verificar saúde dos MCPs 
claude mcp list --health
```

### 3. Reiniciar Claude Code

Após configurar as variáveis de ambiente:
1. Feche o Claude Code
2. Reabra o projeto 
3. Os MCPs devem conectar automaticamente

## 🔧 MCPs Disponíveis

### filesystem
- **Função**: Acesso completo ao sistema de arquivos
- **Status**: ✅ Ativo
- **Pré-requisitos**: Nenhum

### memory  
- **Função**: Cache em memória para Claude
- **Status**: ✅ Ativo
- **Pré-requisitos**: Nenhum

### github
- **Função**: Acesso à API do GitHub
- **Status**: ⚠️ Precisa GITHUB_TOKEN
- **Configuração**: 
  ```bash
  # Obter token em: https://github.com/settings/tokens
  GITHUB_TOKEN=ghp_seu_token_aqui
  ```

### enhanced-postgres
- **Função**: Acesso read/write ao PostgreSQL
- **Status**: ⚠️ Precisa POSTGRES_URL
- **Configuração**:
  ```bash
  # Local
  POSTGRES_URL=postgresql://username:password@localhost:5432/caris
  
  # Neon (produção)
  POSTGRES_URL=postgresql://username:password@host.neon.tech/caris?sslmode=require
  ```

### puppeteer-enhanced
- **Função**: Automação de navegador para testes
- **Status**: ✅ Ativo
- **Pré-requisitos**: Nenhum (instala Chromium automaticamente)

## 🛠️ Comandos Úteis

### Gerenciar MCPs
```bash
# Adicionar novo MCP
claude mcp add nome-mcp "npx pacote-mcp" argumentos

# Remover MCP
claude mcp remove nome-mcp

# Ver detalhes de um MCP
claude mcp get nome-mcp
```

### Debug
```bash
# Testar conexão individual
npx @modelcontextprotocol/server-filesystem .
npx enhanced-postgres-mcp-server

# Verificar variáveis de ambiente
echo $GITHUB_TOKEN
echo $POSTGRES_URL
```

## 📚 Recursos Adicionais

### MCPs que podem ser adicionados:
```bash
# Mais MCPs úteis (instalar com npm install -g primeiro)
claude mcp add sequential-thinking "npx @modelcontextprotocol/server-sequential-thinking"
claude mcp add everything "npx @modelcontextprotocol/server-everything"
```

### Links Úteis
- [Documentação MCP](https://modelcontextprotocol.org)
- [Pacotes MCP no NPM](https://www.npmjs.com/search?q=%40modelcontextprotocol)
- [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)

## ⚠️ Troubleshooting

### MCPs não conectam
1. Verificar se as variáveis de ambiente estão definidas
2. Reiniciar Claude Code
3. Verificar se os pacotes estão instalados: `npm list -g | grep mcp`

### Erro de permissão
```bash
# Usar npx em vez de instalação global
claude mcp remove nome-mcp
claude mcp add nome-mcp "npx pacote-mcp" argumentos
```

### PostgreSQL não conecta
1. Verificar URL de conexão
2. Testar conexão manual: `psql $POSTGRES_URL -c "SELECT 1;"`
3. Verificar firewall/rede

---

🎉 **MCPs configurados com sucesso!** 

Agora o Claude Code tem acesso a:
- Sistema de arquivos local
- Controle de versão Git (via filesystem)
- Cache em memória
- GitHub API (com token)
- PostgreSQL (com URL)
- Automação de navegador