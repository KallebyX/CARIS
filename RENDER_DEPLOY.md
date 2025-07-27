# 🚀 Deploy no Render

Este guia detalha como fazer o deploy da aplicação CÁRIS SaaS Pro no Render.

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com)
2. Repositório GitHub com o código
3. Chaves API necessárias

## 🔧 Configuração Automática

### 1. Deploy via Blueprint

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em "New" → "Blueprint"
3. Conecte seu repositório GitHub
4. O Render detectará automaticamente o arquivo `render.yaml`

### 2. Configuração do render.yaml

O arquivo `render.yaml` já está configurado com:

- ✅ Aplicação web Node.js (plano gratuito)
- ✅ Banco PostgreSQL (plano gratuito)
- ✅ Variáveis de ambiente automáticas
- ✅ Health checks
- ✅ Scripts de setup

### 3. Variáveis de Ambiente

#### Configuradas Automaticamente:
- `NODE_ENV=production`
- `POSTGRES_URL` (conecta ao banco automaticamente)
- `JWT_SECRET` (gerado automaticamente)
- `NEXT_PUBLIC_APP_URL` (URL do serviço)

#### Configuradas Manualmente:
- `RESEND_API_KEY=re_CKYKinHQ_86DVLzkwPcbtossyuSdw35hx` ✅
- `PUSHER_APP_ID` (opcional - para chat)
- `NEXT_PUBLIC_PUSHER_KEY` (opcional - para chat)
- `PUSHER_SECRET` (opcional - para chat)
- `OPENAI_API_KEY` (opcional - para IA)

## 🗄️ Banco de Dados

### Configuração Automática
- PostgreSQL 15 (plano gratuito)
- Nome: `caris-database`
- Usuário: `caris_user`
- Região: Oregon

### Migrações
As migrações são executadas automaticamente via script `postbuild`:
```bash
npm run postbuild → npm run render:setup
```

## 🚀 Processo de Deploy

### 1. Build Automatizado
```bash
npm install && npm run build
```

### 2. Setup Pós-Build
- Verifica variáveis de ambiente
- Executa migrações do banco
- Configura aplicação

### 3. Início da Aplicação
```bash
npm start
```

## ⚡ Funcionalidades Disponíveis

### ✅ Funcionando Imediatamente:
- Sistema de autenticação (JWT)
- Registro e login de usuários
- Dashboard responsivo
- API endpoints
- Banco de dados PostgreSQL

### 🔧 Requer Configuração:
- **Chat em tempo real** - Configure Pusher
- **IA para análise** - Configure OpenAI
- **Notificações** - Configure Twilio
- **Pagamentos** - Configure MercadoPago

### 📱 Recursos Avançados Implementados:
- Sistema de meditação com 100+ práticas
- Análise emocional de diário
- Videoterapia WebRTC
- Sistema SOS de crise
- Biblioteca de tarefas terapêuticas
- Rastreamento de humor
- Mapeamento emocional interativo

## 🔍 Monitoramento

### Health Check
- Endpoint: `/api/health`
- Verifica conexão com banco
- Status da aplicação

### Logs
- Build logs no Render Dashboard
- Application logs em tempo real
- Error tracking via console

## 🛠️ Troubleshooting

### Problemas Comuns:

#### 1. Erro de Build
```bash
# Verificar se todas as dependências estão corretas
npm install
npm run build
```

#### 2. Erro de Conexão com Banco
- Verificar se `POSTGRES_URL` está configurado
- Checar se migrações foram executadas

#### 3. Erro de Variáveis de Ambiente
- Verificar configuração no Render Dashboard
- Confirmar se valores estão corretos

### Como Debugar:

1. **Logs de Build**:
   - Acesse Render Dashboard → Service → Logs

2. **Logs de Runtime**:
   - Monitore logs em tempo real no dashboard

3. **Teste Local**:
   ```bash
   # Testar build localmente
   npm run build
   npm start
   ```

## 📊 Limitações do Plano Gratuito

### Web Service:
- 750 horas/mês (suficiente para uso 24/7)
- Sleep após 15min de inatividade
- Limite de bandwidth

### Database:
- 1GB de armazenamento
- 1 conexão simultânea
- Backup limitado

### Upgrade Recomendado:
Para produção real, considere planos pagos para:
- Maior estabilidade
- Mais recursos
- Backups automáticos
- SSL customizado

## 🔗 URLs Importantes

- **Aplicação**: https://caris-saas-pro.onrender.com
- **Health Check**: https://caris-saas-pro.onrender.com/api/health
- **Admin**: https://caris-saas-pro.onrender.com/admin

## 📞 Suporte

Em caso de problemas:
1. Verificar logs no Render Dashboard
2. Consultar documentação do Render
3. Revisar configurações de ambiente
4. Testar localmente primeiro

---

**✨ Pronto para Deploy!** O sistema está otimizado e preparado para funcionar no Render com configuração mínima.