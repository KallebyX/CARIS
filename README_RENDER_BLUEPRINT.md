# 🚀 Caris SaaS Pro - Render Blueprint

Deploy completo da plataforma de saúde mental com um clique usando Render Blueprint.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🎯 O que é o Caris SaaS Pro?

**Caris SaaS Pro** é uma plataforma completa de saúde mental que conecta psicólogos e pacientes através de tecnologia moderna, oferecendo:

### 🌟 Funcionalidades Principais
- **💬 Videoterapia Integrada** - Sessões online seguras
- **📝 Diário Emocional** - Acompanhamento diário do humor
- **🎯 Mapa Emocional com IA** - Insights preditivos
- **🏥 Prontuário Eletrônico** - Gestão completa de pacientes
- **💳 Checkout Integrado** - Pagamentos via MercadoPago
- **📱 Notificações Real-time** - Via Pusher
- **🔔 Sistema SOS** - Ferramentas de emergência

### 🛠️ Stack Tecnológico
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: Next.js API Routes + Drizzle ORM
- **Database**: PostgreSQL
- **Pagamentos**: MercadoPago (Brasil)
- **Real-time**: Pusher
- **Email**: Resend
- **UI**: Tailwind CSS + Radix UI

---

## 🚀 Deploy em 1 Clique

### 1. Clique no botão Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### 2. Configure seu repositório
- **Fork** este repositório para sua conta GitHub
- **Conecte** o Render ao seu GitHub
- **Selecione** o repositório forkado

### 3. Aguarde a configuração automática
O blueprint criará automaticamente:
- ✅ **Web Service** (caris-saas-pro)
- ✅ **PostgreSQL Database** (caris-database)
- ✅ **Variáveis de ambiente** essenciais

---

## ⚙️ Configurações Pós-Deploy

### Variáveis Obrigatórias
Configure estas no dashboard do Render após o deploy:

```env
# Email (Obrigatório)
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# Real-time (Obrigatório)
PUSHER_APP_ID=xxxxxx
NEXT_PUBLIC_PUSHER_KEY=xxxxxxxxxxxxxxxxxxxx
PUSHER_SECRET=xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Pagamentos Brasil (Obrigatório)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxxxxxx-xxxxxxxx
MERCADOPAGO_CLIENT_ID=xxxxxxxxxxxxxxxx
MERCADOPAGO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Variáveis Opcionais
```env
# SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# IA
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Monitoramento
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx
```

---

## 📋 Guias de Configuração

### 🔧 [Guia Completo de Deploy](./docs/RENDER_DEPLOYMENT.md)
Documentação detalhada com passo a passo completo.

### 🛠️ [Setup de Desenvolvimento](./mcp/docs/setup.md)
Para desenvolvimento local e configuração de MCPs.

### 🏗️ [Arquitetura do Sistema](./docs/ARCHITECTURE.md)
Entenda como o sistema funciona internamente.

### 🛒 [Sistema de Checkout](./mcp/docs/checkout-system.md)
Detalhes da integração com MercadoPago e MCPs.

---

## 🎯 Funcionalidades Incluídas

### 👥 **Multi-Tenant**
- **Pacientes**: Diário, sessões, SOS, progresso
- **Psicólogos**: Agenda, relatórios, pacientes
- **Admins**: Gestão completa da plataforma

### 💳 **Sistema de Pagamentos**
- **PIX** (5% desconto)
- **Cartão de Crédito/Débito**
- **Boleto Bancário**
- **Assinaturas Recorrentes**

### 🔄 **Real-time**
- **Chat** entre psicólogo e paciente
- **Notificações** instantâneas
- **Alertas SOS** em tempo real
- **Status** de sessões ao vivo

### 📊 **Analytics & Reports**
- **Dashboard** personalizado por role
- **Relatórios** de progresso
- **Métricas** de engajamento
- **Insights** com IA

---

## 🏗️ Custos Estimados

### **Starter** (~$20/mês)
- Web Service: $7/mês
- PostgreSQL: $7/mês  
- Pusher: $9/mês
- Resend: Grátis (3k emails)
- **Total**: ~$14-23/mês

### **Production** (~$50/mês)
- Web Service: $25/mês
- PostgreSQL: $20/mês
- Pusher: $9/mês
- Resend: $20/mês
- **Total**: ~$54/mês

---

## 🧪 Teste o Sistema

### URLs Principais
- **Home**: `/`
- **Login**: `/login`
- **Checkout**: `/checkout`
- **Dashboard**: `/dashboard`
- **Admin**: `/admin`

### Contas de Teste
```
Psicólogo:
Email: psicologo@teste.com
Senha: teste123

Paciente:
Email: paciente@teste.com  
Senha: teste123

Admin:
Email: admin@teste.com
Senha: admin123
```

---

## 🔧 Configurações de Serviços

### 📧 **Resend (Email)**
1. Crie conta em https://resend.com
2. Configure domínio
3. Copie API Key
4. Configure no Render

### 🔄 **Pusher (Real-time)**
1. Crie conta em https://pusher.com
2. Crie nova app
3. Copie credenciais (4 variáveis)
4. Configure no Render

### 💳 **MercadoPago (Pagamentos)**
1. Acesse https://www.mercadopago.com.br/developers
2. Crie aplicação
3. Copie credenciais (3 variáveis)
4. Configure webhooks

---

## 🚨 Troubleshooting

### ❌ Build Failed
```bash
# Verificar Node.js version no package.json
"engines": {
  "node": ">=18.0.0"
}
```

### ❌ Database Error
- Aguarde banco estar ready (~2min)
- Verifique região (mesma do app)
- Confirme POSTGRES_URL configurada

### ❌ Checkout Error
- Verifique credenciais MercadoPago
- Configure webhooks corretamente
- Teste com dados reais

---

## 📞 Suporte

### 📚 Documentação
- [Docs Completas](./docs/)
- [API Reference](./docs/API.md)
- [MCPs Guide](./mcp/docs/README.md)

### 🆘 Obter Ajuda
- 🐛 [GitHub Issues](https://github.com/seu-usuario/caris-saas-pro/issues)
- 💬 [Discussions](https://github.com/seu-usuario/caris-saas-pro/discussions)
- 📧 Email: support@caris.com

---

## 🎉 Próximos Passos

1. **Configure as variáveis** obrigatórias
2. **Teste o checkout** com dados reais
3. **Configure domínio** personalizado
4. **Configure SSL** (automático)
5. **Configure monitoramento**
6. **Teste todas as funcionalidades**

---

**Status**: ✅ Pronto para produção  
**Versão**: 2.0.0  
**Suporte**: 24/7  

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy) 