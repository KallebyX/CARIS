# 🔗 Model Context Protocol (MCP) - Caris SaaS Pro

Este diretório contém toda a configuração e documentação dos **Model Context Protocols (MCPs)** utilizados no projeto Caris SaaS Pro.

## 📁 Estrutura do Diretório

```
mcp/
├── config/           # Configurações dos MCPs
│   ├── mcp-config.json      # Configuração principal
│   ├── development.json     # Configurações de desenvolvimento
│   └── production.json      # Configurações de produção
├── servers/          # Configurações específicas por servidor
│   ├── postgres/           # PostgreSQL MCP
│   ├── mercadopago/        # MercadoPago MCP
│   ├── redis/              # Redis MCP
│   └── ...
├── tests/           # Scripts de teste dos MCPs
│   ├── test-postgres-mcp.js   # Teste PostgreSQL
│   ├── test-mercadopago.js    # Teste MercadoPago
│   └── test-all.js            # Teste de todos os MCPs
├── docs/            # Documentação
│   ├── README.md              # Este arquivo
│   ├── postgres.md            # Documentação PostgreSQL
│   ├── setup.md               # Guia de configuração
│   └── troubleshooting.md     # Solução de problemas
└── utils/           # Utilitários e helpers
    ├── mcp-manager.js         # Gerenciador de MCPs
    ├── health-check.js        # Verificação de saúde
    └── config-validator.js    # Validador de configurações
```

## 🚀 MCPs Disponíveis

### 🔧 Desenvolvimento
- **filesystem**: Acesso ao sistema de arquivos
- **git**: Controle de versão Git local
- **sqlite**: Banco de dados SQLite local
- **memory**: Cache em memória
- **github**: Integração com GitHub
- **analytics**: Google Analytics
- **pdf**: Processamento de PDFs
- **puppeteer**: Automação de navegador

### 🏭 Produção
- **database**: PostgreSQL para produção ✅
- **redis**: Cache Redis
- **email**: Email transacional (Resend)
- **sms**: SMS via Twilio
- **ai-openai**: OpenAI GPT
- **ai-anthropic**: Anthropic Claude
- **real-time**: Real-time com Pusher
- **payments-stripe**: Pagamentos Stripe
- **payments-mercadopago**: Pagamentos MercadoPago ✅
- **monitoring**: Monitoramento com Sentry
- **cloud-storage**: Armazenamento Cloudflare R2

## ⚙️ Configuração

### Desenvolvimento
```bash
# Configurar variáveis de ambiente
cp .env.example .env

# Instalar dependências dos MCPs
npm run mcp:install

# Testar MCPs
npm run mcp:test
```

### Produção
```bash
# Alterar ambiente
export MCP_ENVIRONMENT=production

# Configurar todas as variáveis de ambiente necessárias
# Ver: mcp/docs/setup.md
```

## 📊 Status dos MCPs

| MCP | Desenvolvimento | Produção | Último Teste |
|-----|----------------|----------|--------------|
| PostgreSQL | ✅ | ✅ | 2025-07-27 ✅ |
| MercadoPago | ✅ | ✅ | 2025-07-27 ✅ |
| SQLite | ✅ | - | ✅ |
| GitHub | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ |
| Redis | - | ⚠️ | Não testado |
| Email | - | ⚠️ | Não testado |
| SMS | - | ⚠️ | Não testado |

## 🛠️ Scripts Úteis

### Testar um MCP específico
```bash
node mcp/tests/test-postgres-mcp.js
```

### Verificar saúde de todos os MCPs
```bash
node mcp/utils/health-check.js
```

### Gerenciar MCPs
```bash
node mcp/utils/mcp-manager.js --list
node mcp/utils/mcp-manager.js --start postgres
node mcp/utils/mcp-manager.js --stop all
```

## 🔍 Debugging

### Logs
Os logs dos MCPs ficam em:
- Desenvolvimento: `./logs/mcp-dev.log`
- Produção: `./logs/mcp-prod.log`

### Problemas Comuns
Ver: [mcp/docs/troubleshooting.md](./troubleshooting.md)

## 📚 Documentação Detalhada

- [PostgreSQL MCP](./postgres.md) - Configuração e uso do PostgreSQL
- [Sistema de Checkout](./checkout-system.md) - **NOVO** Checkout integrado com MCPs
- [Guia de Setup](./setup.md) - Configuração inicial completa
- [Troubleshooting](./troubleshooting.md) - Solução de problemas

## 🔄 Versionamento

- **v1.0**: Configuração inicial básica
- **v2.0**: Estrutura organizada e documentação completa ← **Atual**

## 👥 Contribuição

Para adicionar novos MCPs:

1. Criar pasta em `mcp/servers/[nome-mcp]/`
2. Adicionar configuração em `mcp/config/`
3. Criar teste em `mcp/tests/`
4. Documentar em `mcp/docs/`
5. Atualizar este README

## 🎯 Próximos Passos

- [ ] Implementar health checks automatizados
- [ ] Criar dashboard de monitoramento dos MCPs
- [ ] Adicionar testes automatizados
- [ ] Configurar alertas de falha
- [ ] Implementar failover automático

---

**Caris SaaS Pro** - Sistema de MCPs v2.0 | Última atualização: 27/07/2025 