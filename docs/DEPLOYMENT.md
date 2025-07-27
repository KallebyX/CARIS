# 🚀 CÁRIS SaaS Pro - Guia de Deployment

Guia completo para deploy e configuração da plataforma CÁRIS SaaS Pro em diferentes ambientes.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Configuração de Ambiente](#configuração-de-ambiente)
- [Deploy na Vercel](#deploy-na-vercel)
- [Deploy no AWS](#deploy-no-aws)
- [Deploy no Azure](#deploy-no-azure)
- [Deploy no Google Cloud](#deploy-no-google-cloud)
- [Deploy com Docker](#deploy-com-docker)
- [Deploy em VPS/Servidor](#deploy-em-vpsservidor)
- [Configuração de Banco de Dados](#configuração-de-banco-de-dados)
- [Configuração de CDN](#configuração-de-cdn)
- [Configuração de SSL](#configuração-de-ssl)
- [Monitoramento](#monitoramento)
- [Backup e Recuperação](#backup-e-recuperação)
- [Segurança](#segurança)
- [Troubleshooting](#troubleshooting)

---

## ⚡ Pré-requisitos

### Sistema
- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 8.0.0 ou **npm** ≥ 9.0.0
- **Git** ≥ 2.40.0
- **Docker** ≥ 20.10 (opcional)

### Contas e Serviços
- [ ] Repositório Git (GitHub/GitLab)
- [ ] Banco de dados PostgreSQL (Neon, Supabase, AWS RDS)
- [ ] Provedor de cloud (Vercel, AWS, Azure, GCP)
- [ ] Serviço de email (Resend, SendGrid)
- [ ] Serviço de SMS (Twilio)
- [ ] Real-time (Pusher)
- [ ] Domínio personalizado

---

## 🔧 Configuração de Ambiente

### 1. Preparação do Código

```bash
# Clone o repositório
git clone https://github.com/KallebyX/CARIS.git
cd "Caris SaaS Pro (1)"

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp env.template .env.local
```

### 2. Configuração de Variáveis

**Variáveis Obrigatórias para Produção:**

```env
# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://caris.com"
NEXTAUTH_URL="https://caris.com"

# Database
POSTGRES_URL="postgresql://user:pass@host/db?sslmode=require"

# Auth
JWT_SECRET="your-production-jwt-secret"
NEXTAUTH_SECRET="your-production-nextauth-secret"

# Email
RESEND_API_KEY="re_xxxxxxxxxx"
FROM_EMAIL="noreply@caris.com"

# SMS
TWILIO_ACCOUNT_SID="ACxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+5511999999999"

# Real-time
PUSHER_APP_ID="your-app-id"
NEXT_PUBLIC_PUSHER_KEY="your-public-key"
PUSHER_SECRET="your-secret-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"

# Push Notifications
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

# Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

### 3. Build e Teste Local

```bash
# Build do projeto
pnpm build

# Teste local da build
pnpm start

# Verificar funcionamento
curl http://localhost:3000/api/health
```

---

## ☁️ Deploy na Vercel

### Configuração Automática

1. **Conecte o repositório:**
   ```bash
   npx vercel
   ```

2. **Configure no dashboard da Vercel:**
   - Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
   - Import project → Conecte seu GitHub
   - Configure as variáveis de ambiente
   - Deploy automático

### Configuração Manual

1. **Arquivo vercel.json:**
   ```json
   {
     "version": 2,
     "framework": "nextjs",
     "buildCommand": "pnpm build",
     "devCommand": "pnpm dev",
     "installCommand": "pnpm install",
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 30
       }
     },
     "regions": ["gru1", "sfo1"],
     "env": {
       "POSTGRES_URL": "@postgres-url",
       "JWT_SECRET": "@jwt-secret"
     },
     "headers": [
       {
         "source": "/api/(.*)",
         "headers": [
           {
             "key": "Access-Control-Allow-Origin",
             "value": "https://caris.com"
           }
         ]
       }
     ],
     "redirects": [
       {
         "source": "/admin",
         "destination": "/admin/dashboard",
         "permanent": false
       }
     ]
   }
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

### Configuração de Domínio

```bash
# Adicionar domínio personalizado
vercel domains add caris.com
vercel domains add www.caris.com

# Configurar DNS
# A record: caris.com → 76.76.19.61
# CNAME: www.caris.com → cname.vercel-dns.com
```

---

## 🌐 Deploy no AWS

### Usando AWS Amplify

1. **Configuração inicial:**
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

2. **Inicializar projeto:**
   ```bash
   amplify init
   amplify add hosting
   amplify publish
   ```

3. **amplify.yml:**
   ```yaml
   version: 1
   applications:
     - frontend:
         phases:
           preBuild:
             commands:
               - npm install -g pnpm
               - pnpm install
           build:
             commands:
               - pnpm build
         artifacts:
           baseDirectory: .next
           files:
             - '**/*'
         cache:
           paths:
             - node_modules/**/*
             - .next/cache/**/*
   ```

### Usando EC2 + Application Load Balancer

1. **Instância EC2:**
   ```bash
   # Script de inicialização (user-data)
   #!/bin/bash
   yum update -y
   yum install -y docker
   service docker start
   usermod -a -G docker ec2-user
   
   # Clone e build
   git clone https://github.com/KallebyX/CARIS.git
   cd CARIS
   docker build -t caris .
   docker run -d -p 80:3000 caris
   ```

2. **Auto Scaling Group:**
   ```json
   {
     "LaunchTemplate": {
       "LaunchTemplateName": "caris-template",
       "ImageId": "ami-0abcdef1234567890",
       "InstanceType": "t3.medium",
       "SecurityGroupIds": ["sg-12345678"],
       "UserData": "base64-encoded-script"
     },
     "MinSize": 2,
     "MaxSize": 10,
     "DesiredCapacity": 2
   }
   ```

### RDS PostgreSQL

```bash
# Criar instância RDS
aws rds create-db-instance \
  --db-instance-identifier caris-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username carisuser \
  --master-user-password yourpassword \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-12345678
```

---

## 🔷 Deploy no Azure

### Usando Azure Static Web Apps

1. **azure-static-web-apps-config.json:**
   ```json
   {
     "routes": [
       {
         "route": "/api/*",
         "allowedRoles": ["authenticated"]
       }
     ],
     "navigationFallback": {
       "rewrite": "/index.html",
       "exclude": ["/api/*"]
     },
     "mimeTypes": {
       ".json": "application/json"
     }
   }
   ```

2. **GitHub Actions (auto-gerado):**
   ```yaml
   name: Azure Static Web Apps CI/CD
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     build_and_deploy_job:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v2
       - name: Build And Deploy
         uses: Azure/static-web-apps-deploy@v1
         with:
           azure_static_web_apps_api_token: ${{ secrets.AZURE_TOKEN }}
           repo_token: ${{ secrets.GITHUB_TOKEN }}
           action: "upload"
           app_location: "/"
           output_location: ".next"
   ```

### Usando Azure Container Instances

```bash
# Criar container registry
az acr create --resource-group caris-rg --name carisregistry --sku Basic

# Build e push da imagem
docker build -t caris .
docker tag caris carisregistry.azurecr.io/caris:latest
docker push carisregistry.azurecr.io/caris:latest

# Deploy container
az container create \
  --resource-group caris-rg \
  --name caris-app \
  --image carisregistry.azurecr.io/caris:latest \
  --cpu 2 \
  --memory 4 \
  --ports 3000
```

---

## 🌟 Deploy no Google Cloud

### Usando Cloud Run

1. **Dockerfile otimizado:**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Deploy:**
   ```bash
   # Build e push
   gcloud builds submit --tag gcr.io/PROJECT_ID/caris
   
   # Deploy no Cloud Run
   gcloud run deploy caris \
     --image gcr.io/PROJECT_ID/caris \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars POSTGRES_URL=$POSTGRES_URL
   ```

### Usando App Engine

1. **app.yaml:**
   ```yaml
   runtime: nodejs18
   
   env_variables:
     POSTGRES_URL: "postgresql://..."
     JWT_SECRET: "your-secret"
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
     target_cpu_utilization: 0.6
   
   handlers:
   - url: /.*
     script: auto
   ```

2. **Deploy:**
   ```bash
   gcloud app deploy
   ```

---

## 🐳 Deploy com Docker

### Dockerfile Produção

```dockerfile
# Multi-stage build
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm install -g pnpm && pnpm build

FROM node:18-alpine AS runtime
WORKDIR /app

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose para Desenvolvimento

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=postgresql://postgres:password@db:5432/caris
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: caris
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
```

### Build e Deploy

```bash
# Build da imagem
docker build -t caris:latest .

# Push para registry
docker tag caris:latest your-registry/caris:latest
docker push your-registry/caris:latest

# Deploy em produção
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🖥️ Deploy em VPS/Servidor

### Configuração do Servidor (Ubuntu 22.04)

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl git nginx postgresql-client

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar PM2
npm install -g pm2
```

### Configuração da Aplicação

```bash
# Clone e configuração
git clone https://github.com/KallebyX/CARIS.git /var/www/caris
cd /var/www/caris

# Instalar dependências e build
pnpm install
pnpm build

# Configurar PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'caris',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/caris',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/caris-error.log',
    out_file: '/var/log/pm2/caris-out.log',
    log_file: '/var/log/pm2/caris.log'
  }]
}
EOF

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Configuração do Nginx

```nginx
# /etc/nginx/sites-available/caris
server {
    listen 80;
    server_name caris.com www.caris.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name caris.com www.caris.com;

    ssl_certificate /etc/letsencrypt/live/caris.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/caris.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static/ {
        alias /var/www/caris/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /public/ {
        alias /var/www/caris/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/caris /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 💾 Configuração de Banco de Dados

### PostgreSQL no Neon (Recomendado)

```bash
# 1. Criar conta no Neon.tech
# 2. Criar novo projeto
# 3. Copiar connection string
POSTGRES_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# 4. Executar migrations
npx drizzle-kit push:pg
```

### PostgreSQL Self-Hosted

```bash
# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Configurar usuário e database
sudo -u postgres psql << EOF
CREATE USER carisuser WITH PASSWORD 'securepassword';
CREATE DATABASE caris_prod OWNER carisuser;
GRANT ALL PRIVILEGES ON DATABASE caris_prod TO carisuser;
\q
EOF

# Configurar conexão
POSTGRES_URL="postgresql://carisuser:securepassword@localhost:5432/caris_prod"
```

### Backup Automático

```bash
# Script de backup
cat > /usr/local/bin/backup-caris.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/caris"
mkdir -p $BACKUP_DIR

# Backup do banco
pg_dump $POSTGRES_URL > $BACKUP_DIR/db_backup_$DATE.sql

# Backup dos arquivos
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/caris/uploads

# Remover backups antigos (manter 7 dias)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-caris.sh

# Cron job (backup diário às 2h)
echo "0 2 * * * /usr/local/bin/backup-caris.sh" | sudo crontab -
```

---

## 🚀 Configuração de CDN

### Cloudflare

1. **Adicionar domínio no Cloudflare**
2. **Configurar Page Rules:**
   ```
   caris.com/_next/static/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: a month
   
   caris.com/api/*
   - Cache Level: Bypass
   ```

3. **SSL/TLS:** Full (strict)
4. **Speed → Optimization:**
   - Auto Minify: CSS, JavaScript
   - Brotli: On
   - Rocket Loader: Off (conflita com Next.js)

### AWS CloudFront

```json
{
  "DistributionConfig": {
    "Origins": [{
      "Id": "caris-origin",
      "DomainName": "caris.com",
      "CustomOriginConfig": {
        "HTTPPort": 443,
        "OriginProtocolPolicy": "https-only"
      }
    }],
    "DefaultCacheBehavior": {
      "TargetOriginId": "caris-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "managed-caching-optimized"
    },
    "CacheBehaviors": [{
      "PathPattern": "/_next/static/*",
      "TargetOriginId": "caris-origin",
      "CachePolicyId": "managed-caching-optimized-for-uncompressed-objects"
    }]
  }
}
```

---

## 🔒 Configuração de SSL

### Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d caris.com -d www.caris.com

# Auto-renovação
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare SSL

1. **SSL/TLS → Origin Server**
2. **Create Certificate**
3. **Copiar certificado e chave para servidor:**
   ```bash
   sudo mkdir /etc/ssl/cloudflare
   sudo nano /etc/ssl/cloudflare/cert.pem  # Colar certificado
   sudo nano /etc/ssl/cloudflare/key.pem   # Colar chave privada
   ```

---

## 📊 Monitoramento

### Configuração do Sentry

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ["localhost", /^https:\/\/caris\.com/],
    }),
  ],
});

// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
});
```

### Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET() {
  try {
    // Verificar conexão com o banco
    await db.select().from(users).limit(1);
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
```

### Uptime Monitoring

```bash
# Script de monitoramento
cat > /usr/local/bin/monitor-caris.sh << 'EOF'
#!/bin/bash
URL="https://caris.com/api/health"
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -ne 200 ]; then
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 CARIS está fora do ar! Status: '$RESPONSE'"}' \
    $WEBHOOK_URL
fi
EOF

# Executar a cada 5 minutos
echo "*/5 * * * * /usr/local/bin/monitor-caris.sh" | crontab -
```

---

## 🔐 Segurança

### Firewall (UFW)

```bash
# Configurar firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Fail2Ban

```bash
# Instalar Fail2Ban
sudo apt install fail2ban

# Configurar
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true

[nginx-noproxy]
enabled = true
```

### Configurações de Segurança do Node.js

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Rate limiting
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429 }
      );
    }
  }

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
```

---

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Build Falha
```bash
# Limpar cache
rm -rf .next node_modules
pnpm install
pnpm build

# Verificar versão do Node.js
node --version  # Deve ser >= 18

# Verificar variáveis de ambiente
env | grep POSTGRES_URL
```

#### 2. Erro de Conexão com Banco
```bash
# Testar conexão
psql $POSTGRES_URL -c "SELECT 1;"

# Verificar SSL
ping your-database-host.com

# Verificar firewall
telnet your-database-host.com 5432
```

#### 3. Problemas de Performance
```bash
# Verificar uso de recursos
htop
iotop
netstat -tuln

# Logs da aplicação
pm2 logs caris
journalctl -u nginx -f
```

#### 4. Problemas de SSL
```bash
# Verificar certificado
openssl s_client -connect caris.com:443

# Renovar Let's Encrypt
sudo certbot renew --dry-run

# Verificar configuração Nginx
sudo nginx -t
```

### Logs Importantes

```bash
# Logs da aplicação
tail -f /var/log/pm2/caris.log

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs do sistema
journalctl -f

# Logs do PostgreSQL
tail -f /var/log/postgresql/postgresql-15-main.log
```

### Comandos de Diagnóstico

```bash
# Verificar status dos serviços
systemctl status nginx
systemctl status postgresql
pm2 status

# Verificar conectividade
curl -I https://caris.com
curl https://caris.com/api/health

# Verificar certificados
curl -vI https://caris.com 2>&1 | grep -A 10 -B 10 certificate

# Verificar DNS
nslookup caris.com
dig caris.com
```

---

## 📈 Otimização de Performance

### Configuração do Next.js

```typescript
// next.config.mjs
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  
  images: {
    domains: ['cdn.caris.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        }
      ]
    }
  ]
};
```

### Caching Strategy

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export const cache = {
  async get(key: string) {
    return await redis.get(key);
  },
  
  async set(key: string, value: any, ttl: number = 3600) {
    return await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  async del(key: string) {
    return await redis.del(key);
  }
};
```

---

## 📋 Checklist de Deploy

### Pré-Deploy
- [ ] Código testado localmente
- [ ] Build executada com sucesso
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Banco de dados configurado e migrations executadas
- [ ] SSL configurado
- [ ] DNS configurado

### Durante Deploy
- [ ] Backup do banco de dados atual
- [ ] Deploy em ambiente de staging primeiro
- [ ] Smoke tests básicos
- [ ] Verificar logs durante deploy

### Pós-Deploy
- [ ] Verificar health check
- [ ] Testar funcionalidades críticas
- [ ] Verificar performance
- [ ] Configurar monitoramento
- [ ] Notificar equipe sobre deploy

---

**CÁRIS SaaS Pro Deployment Guide** - Desenvolvido com 💚 por [Kalleby Evangelho](https://github.com/KallebyX)

Para suporte técnico: [suporte@caris.com](mailto:suporte@caris.com) 