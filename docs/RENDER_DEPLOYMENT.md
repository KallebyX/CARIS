# 🚀 Deploy no Render - Caris SaaS Pro

Guia completo para fazer deploy do Caris SaaS Pro no Render usando o blueprint.

## 📋 Pré-requisitos

### Contas Necessárias
- [ ] **Render** - Para hosting e banco
- [ ] **GitHub** - Para código-fonte
- [ ] **Resend** - Para emails
- [ ] **Pusher** - Para real-time
- [ ] **MercadoPago** - Para pagamentos (Brasil)
- [ ] **Twilio** - Para SMS (opcional)

### Serviços Opcionais
- [ ] **OpenAI** - Para IA (opcional)
- [ ] **Sentry** - Para monitoramento (opcional)

---

## 🎯 Deploy Rápido (Blueprint)

### 1. Fazer Fork do Projeto
```bash
# 1. Fork no GitHub
https://github.com/seu-usuario/caris-saas-pro

# 2. Clone seu fork
git clone https://github.com/seu-usuario/caris-saas-pro.git
cd caris-saas-pro
```

### 2. Deploy com Blueprint
1. **Acesse o Render**: https://render.com
2. **Conecte seu GitHub**
3. **Novo Blueprint**: 
   - Selecione "New → Blueprint"
   - Conecte seu repositório
   - O arquivo `render.yaml` será detectado automaticamente

### 3. Configuração Automática
O blueprint criará automaticamente:
- ✅ **Web Service** (caris-saas-pro)
- ✅ **PostgreSQL Database** (caris-database)
- ✅ **Variáveis de ambiente** básicas

---

## ⚙️ Configuração de Variáveis

### Variáveis Automáticas ✅
Estas são configuradas automaticamente pelo blueprint:
- `NODE_ENV=production`
- `POSTGRES_URL` (conectado ao banco)
- `JWT_SECRET` (gerado automaticamente)
- `VAPID_PUBLIC_KEY` (gerado automaticamente)
- `VAPID_PRIVATE_KEY` (gerado automaticamente)
- `NEXT_PUBLIC_APP_URL` (URL do serviço)

### Variáveis Manuais ⚙️
Configure estas no dashboard do Render:

#### 📧 **Email (Obrigatório)**
```env
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```

#### 🔄 **Real-time (Obrigatório)**
```env
PUSHER_APP_ID=xxxxxx
NEXT_PUBLIC_PUSHER_KEY=xxxxxxxxxxxxxxxxxxxx
PUSHER_SECRET=xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

#### 💳 **Pagamentos (Obrigatório para Brasil)**
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
MERCADOPAGO_CLIENT_ID=xxxxxxxxxxxxxxxx
MERCADOPAGO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 📱 **SMS (Opcional)**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

#### 🤖 **IA (Opcional)**
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 📊 **Monitoramento (Opcional)**
```env
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx
SENTRY_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔧 Passo a Passo das Configurações

### 1. Configurar Email (Resend)
1. **Acesse**: https://resend.com
2. **Crie conta** e domínio
3. **API Key**: Dashboard → API Keys
4. **Configure DNS** do seu domínio
5. **Adicione no Render**:
   ```
   RESEND_API_KEY=re_xxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```

### 2. Configurar Real-time (Pusher)
1. **Acesse**: https://pusher.com
2. **Crie uma app** no dashboard
3. **Copie as credenciais**:
   - App ID
   - Key (pública)
   - Secret (privada)
   - Cluster
4. **Adicione no Render** as 4 variáveis

### 3. Configurar Pagamentos (MercadoPago)
1. **Acesse**: https://www.mercadopago.com.br/developers
2. **Crie uma aplicação**
3. **Copie as credenciais**:
   - Access Token
   - Client ID
   - Client Secret
4. **Configure webhooks**:
   ```
   URL: https://your-app.onrender.com/api/webhooks/mercadopago
   Eventos: payment, subscription
   ```

### 4. Configurar Domínio Personalizado
1. **Render Dashboard** → Seu serviço → Settings
2. **Custom Domain** → Add Custom Domain
3. **Configure DNS**:
   ```
   CNAME: your-domain.com → your-app.onrender.com
   ```

---

## 🏗️ Estrutura de Custos Estimados

### **Starter Plan** (~$20/mês)
- Web Service: $7/mês
- PostgreSQL: $7/mês
- Pusher: $9/mês (grátis até 200k mensagens)
- Resend: $0 (até 3k emails/mês)
- **Total**: ~$14-23/mês

### **Production Plan** (~$50/mês)
- Web Service: $25/mês (standard)
- PostgreSQL: $20/mês (standard)
- Pusher: $9/mês
- Resend: $20/mês
- **Total**: ~$54/mês

---

## 🧪 Verificação Pós-Deploy

### 1. Health Check
```bash
curl https://your-app.onrender.com/api/health
```

### 2. Teste de MCPs
1. **Acesse**: https://your-app.onrender.com/checkout
2. **Teste checkout** com dados reais
3. **Verifique emails** de confirmação
4. **Teste notificações** real-time

### 3. Monitoramento
- **Logs**: Render Dashboard → Logs
- **Métricas**: Render Dashboard → Metrics
- **Uptime**: https://uptimerobot.com (recomendado)

---

## 🚨 Troubleshooting

### ❌ Build Failed
```bash
# Verificar logs de build
render logs --service=caris-saas-pro --type=build

# Problemas comuns:
# 1. Node version incompatível
# 2. Dependências faltando
# 3. Build script failure
```

### ❌ Database Connection Failed
- Verificar se `POSTGRES_URL` está configurada
- Aguardar banco estar ready (pode demorar ~2min)
- Verificar região (banco e app devem estar na mesma)

### ❌ Environment Variables
```bash
# Verificar variáveis no dashboard
Render → Service → Environment

# Variáveis essenciais:
- POSTGRES_URL ✅
- JWT_SECRET ✅  
- RESEND_API_KEY ⚙️
- PUSHER_* ⚙️
```

### ❌ Checkout Não Funciona
1. **Verificar MercadoPago**:
   - Access Token válido
   - Webhooks configurados
   - URLs corretas

2. **Verificar Logs**:
   ```bash
   render logs --service=caris-saas-pro --num=100
   ```

---

## 🔄 Atualizações e Deploy

### Deploy Automático
- **Push para main** → Deploy automático
- **PR merged** → Deploy automático

### Deploy Manual
```bash
# Render Dashboard
Service → Manual Deploy → Deploy Latest Commit
```

### Rollback
```bash
# Render Dashboard  
Service → Deployments → Redeploy previous version
```

---

## 📊 Monitoramento de Produção

### Métricas Importantes
- **Response Time**: < 500ms
- **Error Rate**: < 1%
- **Uptime**: > 99.9%
- **Database Connections**: < 80%

### Alertas Recomendados
- High error rate
- Slow response time
- Database connection issues
- Failed payments

### Backup do Banco
```bash
# Configurar backup automático
Render → Database → Backups → Enable Daily Backups
```

---

## 🎯 Próximos Passos

1. **Configurar domínio personalizado**
2. **Configurar SSL** (automático no Render)
3. **Configurar CDN** para assets estáticos
4. **Configurar monitoramento** (Sentry, Uptime Robot)
5. **Configurar analytics** (Google Analytics)
6. **Teste de carga** com ferramentas como k6

---

## 📞 Suporte

### Links Úteis
- 📚 **Render Docs**: https://render.com/docs
- 💬 **Render Support**: https://render.com/support
- 🔧 **Status Page**: https://status.render.com

### Comunidade
- 🐛 **Issues**: GitHub Issues do projeto
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: support@caris.com

---

**Status**: ✅ Pronto para produção  
**Última atualização**: 27 de Janeiro de 2025  
**Versão**: 2.0.0 