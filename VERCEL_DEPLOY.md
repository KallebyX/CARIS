# Deploy CÁRIS no Vercel

## Passo 1: Conectar Repositório ao Vercel

1. Acesse: https://vercel.com/new
2. Importe seu repositório do GitHub
3. Selecione o projeto "CARIS"
4. Framework Preset: **Next.js** (auto-detectado)

## Passo 2: Configurar Variáveis de Ambiente

Vá para **Settings > Environment Variables** e adicione as seguintes variáveis:

---

## Variáveis Essenciais (OBRIGATÓRIAS)

### Database - PostgreSQL
**Recomendado: Vercel Postgres ou Neon**

| Link | Descrição |
|------|-----------|
| https://vercel.com/dashboard/stores | Vercel Postgres (integração nativa) |
| https://neon.tech | Neon PostgreSQL (alternativa gratuita) |

```
POSTGRES_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### Segurança JWT
Gere com o comando: `openssl rand -hex 32`

```
JWT_SECRET=<gerar-valor-seguro>
NEXTAUTH_SECRET=<gerar-valor-seguro>
```

---

## Email (Obrigatório para notificações)

### Resend
| Link | Descrição |
|------|-----------|
| https://resend.com/signup | Criar conta |
| https://resend.com/api-keys | Obter API Key |
| https://resend.com/domains | Configurar domínio |

```
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@seudominio.com
```

---

## Real-Time Chat (Obrigatório para chat)

### Pusher
| Link | Descrição |
|------|-----------|
| https://dashboard.pusher.com/accounts/sign_up | Criar conta |
| https://dashboard.pusher.com/apps | Criar app e obter credenciais |

```
PUSHER_APP_ID=seu-app-id
NEXT_PUBLIC_PUSHER_KEY=sua-chave-publica
PUSHER_SECRET=seu-secret
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

---

## Pagamentos (Obrigatório para assinaturas)

### Stripe
| Link | Descrição |
|------|-----------|
| https://dashboard.stripe.com/register | Criar conta |
| https://dashboard.stripe.com/apikeys | API Keys |
| https://dashboard.stripe.com/webhooks | Configurar Webhook |

```
STRIPE_SECRET_KEY=sk_live_xxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

**Webhook URL:** `https://seu-app.vercel.app/api/webhooks/stripe`

### MercadoPago (Brasil)
| Link | Descrição |
|------|-----------|
| https://www.mercadopago.com.br/developers/panel | Painel de Desenvolvedor |
| https://www.mercadopago.com.br/developers/panel/app | Criar Aplicação |

```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx
MERCADOPAGO_CLIENT_ID=seu-client-id
MERCADOPAGO_CLIENT_SECRET=seu-client-secret
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx
```

---

## Push Notifications (Recomendado)

### VAPID Keys
Gere com o comando:
```bash
npx web-push generate-vapid-keys
```

```
VAPID_PUBLIC_KEY=<chave-publica-gerada>
VAPID_PRIVATE_KEY=<chave-privada-gerada>
```

---

## SMS (Opcional)

### Twilio
| Link | Descrição |
|------|-----------|
| https://www.twilio.com/try-twilio | Criar conta |
| https://console.twilio.com/ | Console principal |
| https://console.twilio.com/us1/account/keys-credentials/api-keys | API Keys |

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## IA (Opcional)

### OpenAI
| Link | Descrição |
|------|-----------|
| https://platform.openai.com/signup | Criar conta |
| https://platform.openai.com/api-keys | API Keys |

```
OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

### Anthropic Claude
| Link | Descrição |
|------|-----------|
| https://console.anthropic.com/ | Console |
| https://console.anthropic.com/settings/keys | API Keys |

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxx
```

---

## Monitoramento (Altamente Recomendado)

### Sentry
| Link | Descrição |
|------|-----------|
| https://sentry.io/signup/ | Criar conta |
| https://sentry.io/settings/account/api/auth-tokens/ | Auth Tokens |

```
SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
SENTRY_ORG=seu-org-slug
SENTRY_PROJECT=caris-saas-pro
SENTRY_AUTH_TOKEN=sntrys_xxxx
```

### Google Analytics
| Link | Descrição |
|------|-----------|
| https://analytics.google.com/ | Console Analytics |
| https://analytics.google.com/analytics/web/#/a000000000p000000000/admin/streams | Streams de dados |

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## Cloud Storage (Opcional)

### AWS S3
| Link | Descrição |
|------|-----------|
| https://aws.amazon.com/free/ | Conta gratuita |
| https://console.aws.amazon.com/iam/home#/security_credentials | Credenciais |
| https://s3.console.aws.amazon.com/s3/buckets | Buckets |

```
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=seu-bucket
```

---

## Calendário (Opcional)

### Google Calendar
| Link | Descrição |
|------|-----------|
| https://console.cloud.google.com/ | Console GCP |
| https://console.cloud.google.com/apis/credentials | Credenciais OAuth |
| https://console.cloud.google.com/apis/library/calendar-json.googleapis.com | Ativar API |

```
GOOGLE_CALENDAR_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_CALENDAR_REDIRECT_URI=https://seu-app.vercel.app/api/calendar/google/callback
```

### Microsoft Outlook
| Link | Descrição |
|------|-----------|
| https://portal.azure.com/ | Portal Azure |
| https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade | Registrar App |

```
MICROSOFT_CLIENT_ID=seu-client-id
MICROSOFT_CLIENT_SECRET=seu-client-secret
MICROSOFT_TENANT_ID=seu-tenant-id
MICROSOFT_REDIRECT_URI=https://seu-app.vercel.app/api/calendar/outlook/callback
```

---

## Cron Jobs

Gere com: `openssl rand -hex 32`

```
DATA_RETENTION_CRON_SECRET=<valor-seguro-gerado>
```

---

## Passo 3: Deploy

1. Após configurar todas as variáveis, clique em **Deploy**
2. Aguarde o build completar
3. Acesse a URL gerada pelo Vercel

---

## Passo 4: Pós-Deploy

### Configurar Webhooks

1. **Stripe Webhook:**
   - URL: `https://seu-app.vercel.app/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `customer.subscription.*`

2. **MercadoPago Webhook:**
   - URL: `https://seu-app.vercel.app/api/webhooks/mercadopago`

### Verificar Domínio de Email

1. Adicione os registros DNS do Resend ao seu domínio
2. Verifique em https://resend.com/domains

### Migrar Banco de Dados

Execute via Vercel CLI ou localmente:
```bash
pnpm db:migrate
```

---

## Checklist de Configuração

- [ ] Banco de dados PostgreSQL configurado
- [ ] JWT_SECRET e NEXTAUTH_SECRET gerados
- [ ] Resend configurado e domínio verificado
- [ ] Pusher configurado para chat em tempo real
- [ ] Stripe/MercadoPago configurados para pagamentos
- [ ] VAPID keys geradas para push notifications
- [ ] Sentry configurado para monitoramento
- [ ] Webhooks de pagamento configurados
- [ ] Migrações do banco executadas
