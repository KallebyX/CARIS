# 🌟 CÁRIS SaaS Pro

**Plataforma de Saúde Mental Inteligente - Conectando Tempo, Emoção e Tecnologia**

![CARIS Logo](./public/images/caris-logo-v2.png)

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Características Principais](#características-principais)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [MCPs Configurados](#mcps-configurados)
- [API Documentation](#api-documentation)
- [Deploy](#deploy)
- [Contribuição](#contribuição)
- [Licença](#licença)

---

## 🎯 Sobre o Projeto

**CÁRIS SaaS Pro** é uma plataforma avançada de saúde mental que revoluciona a forma como pacientes e psicólogos se conectam e trabalham juntos. Desenvolvido por **Kalleby Evangelho** (Oryum Tech), o sistema integra inteligência artificial, comunicação em tempo real e ferramentas terapêuticas inovadoras.

### 🌱 Visão

Criar uma ponte tecnológica entre tempo, emoção e autoconhecimento, facilitando jornadas terapêuticas mais eficazes e acessíveis.

### 🎭 Metodologia

Baseado nos **4 Ciclos da Vida**:
- 🌱 **Criar** - Novos começos e possibilidades
- 🌿 **Cuidar** - Desenvolvimento e crescimento
- 🌳 **Crescer** - Expansão e florescimento
- 🍂 **Curar** - Transformação e renovação

---

## ✨ Características Principais

### 👥 Para Pacientes
- 📖 **Diário Emocional Inteligente** - Registro com análise de padrões
- 🎯 **Mapa Emocional Interativo** - Visualização dos ciclos emocionais
- 🆘 **Ferramentas SOS** - Recursos para momentos de crise
- 💬 **Chat em Tempo Real** - Comunicação segura com o psicólogo
- 📊 **Acompanhamento de Progresso** - Métricas e insights personalizados
- 🎮 **Gamificação** - Sistema de conquistas motivacional

### 👨‍⚕️ Para Psicólogos
- 📋 **Dashboard Profissional** - Visão completa dos pacientes
- 📅 **Agenda Inteligente** - Sistema de agendamento avançado
- 📈 **Relatórios Detalhados** - Analytics e insights terapêuticos
- 🔔 **Notificações em Tempo Real** - Alertas importantes
- 📚 **Biblioteca de Recursos** - Materiais terapêuticos
- 🤖 **Assistente IA** - Suporte para decisões clínicas

### 🔧 Para Administradores
- 👑 **Painel de Controle** - Gestão completa da plataforma
- 👥 **Gestão de Usuários** - Controle de acesso e permissões
- 💰 **Gestão de Planos** - Sistema de assinaturas
- 📊 **Analytics Avançados** - Métricas de uso e performance

---

## 🛠 Tecnologias Utilizadas

### Frontend
- **Next.js 15** - Framework React de última geração
- **TypeScript** - Tipagem estática robusta
- **Tailwind CSS** - Design system responsivo
- **Framer Motion** - Animações fluidas
- **Radix UI** - Componentes acessíveis
- **Recharts** - Visualização de dados

### Backend
- **Next.js API Routes** - Backend serverless
- **Drizzle ORM** - Type-safe database operations
- **PostgreSQL/Neon** - Banco de dados principal
- **Pusher** - Real-time communication
- **JWT** - Autenticação segura

### Integrações & Services
- **Resend** - Email transacional
- **Twilio** - SMS e comunicação
- **Web Push** - Notificações push
- **Stripe/MercadoPago** - Processamento de pagamentos
- **OpenAI/Anthropic** - Inteligência artificial
- **Cloudflare R2** - Armazenamento de arquivos

### DevOps & Monitoring
- **Vercel** - Deploy e hosting
- **Sentry** - Error tracking
- **Google Analytics** - Analytics
- **Docker** - Containerização
- **GitHub Actions** - CI/CD

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 8.0.0 (recomendado) ou **npm** ≥ 9.0.0
- **Git** ≥ 2.40.0
- **PostgreSQL** ≥ 14 (local) ou conta no **Neon**

### Contas de Serviços (Opcionais)
- [Neon Database](https://neon.tech) - Database
- [Resend](https://resend.com) - Email
- [Twilio](https://twilio.com) - SMS
- [Pusher](https://pusher.com) - Real-time
- [Vercel](https://vercel.com) - Deploy

---

## 🚀 Instalação e Configuração

### 1. Clone o Repositório

```bash
git clone https://github.com/KallebyX/CARIS.git
cd "Caris SaaS Pro (1)"
```

### 2. Instale as Dependências

```bash
# Com pnpm (recomendado)
pnpm install

# Ou com npm
npm install
```

### 3. Configure as Variáveis de Ambiente

```bash
# Copie o template
cp env.template .env.local

# Edite com seus valores
nano .env.local
```

**Variáveis Obrigatórias:**
```env
# Database
POSTGRES_URL="postgresql://user:pass@host/db"

# Auth
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Configure o Banco de Dados

```bash
# Execute as migrations
pnpm db:generate
pnpm db:migrate

# Seed inicial (opcional)
pnpm db:seed
```

### 5. Inicie o Servidor de Desenvolvimento

```bash
pnpm dev
```

🎉 **Acesse**: http://localhost:3000

---

## 📁 Estrutura do Projeto

```
Caris SaaS Pro (1)/
├── app/                          # Next.js 13+ App Router
│   ├── (auth)/                   # Rotas de autenticação
│   ├── admin/                    # Painel administrativo
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticação
│   │   ├── patient/              # APIs do paciente
│   │   ├── psychologist/         # APIs do psicólogo
│   │   └── notifications/        # Sistema de notificações
│   ├── dashboard/                # Dashboards principais
│   │   ├── (patient)/           # Interface do paciente
│   │   └── (psychologist)/      # Interface do psicólogo
│   └── globals.css              # Estilos globais
├── components/                   # Componentes React
│   ├── ui/                      # Componentes base (Radix)
│   ├── chat/                    # Sistema de chat
│   ├── landing/                 # Landing page
│   └── notifications/           # Notificações
├── db/                          # Database
│   ├── schema.ts               # Schema Drizzle
│   └── index.ts                # Configuração DB
├── lib/                         # Utilitários e serviços
│   ├── auth.ts                 # Autenticação
│   ├── email.ts                # Serviço de email
│   ├── sms.ts                  # Serviço de SMS
│   ├── pusher.ts               # Real-time
│   └── utils.ts                # Funções auxiliares
├── hooks/                       # Custom React Hooks
├── scripts/                     # Scripts de deploy e seed
├── public/                      # Assets estáticos
├── docs/                        # Documentação
├── mcp-config.json             # Configuração MCPs
└── env.template                # Template de variáveis
```

---

## 🔌 MCPs Configurados

O projeto inclui configuração completa de **Model Context Protocols** para máxima produtividade:

### 🗄️ Dados & Banco
- **PostgreSQL** - Banco principal
- **SQLite** - Desenvolvimento local
- **Redis** - Cache
- **MongoDB** - Dados não-estruturados
- **Elasticsearch** - Busca avançada

### 🌐 Integrações
- **GitHub** - Controle de versão
- **Google Drive** - Armazenamento
- **AWS S3** - Cloud storage
- **Cloudflare R2** - CDN e storage

### 📧 Comunicação
- **Resend** - Email transacional
- **Twilio** - SMS
- **Pusher** - Real-time
- **Slack** - Notificações de equipe
- **Discord** - Comunicação

### 🤖 IA & ML
- **OpenAI** - GPT models
- **Anthropic** - Claude
- **Google AI** - Gemini

### 💳 Pagamentos
- **Stripe** - Internacional
- **MercadoPago** - Brasil

### 📊 Analytics & Monitoring
- **Google Analytics** - Web analytics
- **Sentry** - Error tracking
- **Mixpanel** - Product analytics

### Para ativar um MCP específico:

```bash
# Instale o servidor MCP
npx @modelcontextprotocol/server-[nome]

# Configure no mcp-config.json
# Adicione as variáveis de ambiente
```

---

## 📖 API Documentation

### 🔐 Autenticação

Todas as APIs protegidas requerem um token JWT no header:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### 👤 Endpoints de Usuário

#### `GET /api/users/me`
Retorna informações do usuário logado.

**Response:**
```json
{
  "id": 1,
  "email": "user@email.com",
  "name": "Nome do Usuário",
  "role": "patient",
  "profile": { ... }
}
```

#### `PUT /api/user/settings`
Atualiza configurações do usuário.

**Body:**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "theme": "dark"
}
```

### 🧠 Endpoints do Paciente

#### `GET /api/patient/diary`
Lista entradas do diário.

**Query Params:**
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 10)
- `mood` - Filtrar por humor (1-5)

#### `POST /api/patient/diary`
Cria nova entrada no diário.

**Body:**
```json
{
  "title": "Meu dia",
  "content": "Descrição da entrada...",
  "mood": 4,
  "tags": ["trabalho", "família"],
  "isPrivate": false
}
```

#### `GET /api/patient/sessions`
Lista sessões do paciente.

#### `POST /api/patient/sos`
Registra uso de ferramenta SOS.

**Body:**
```json
{
  "toolName": "breathing",
  "durationMinutes": 5
}
```

### 👨‍⚕️ Endpoints do Psicólogo

#### `GET /api/psychologist/patients`
Lista pacientes do psicólogo.

#### `GET /api/psychologist/patients/[id]`
Detalhes de um paciente específico.

#### `POST /api/psychologist/sessions`
Agenda nova sessão.

**Body:**
```json
{
  "patientId": 123,
  "sessionDate": "2024-01-15T10:00:00Z",
  "durationMinutes": 50,
  "type": "online"
}
```

#### `GET /api/psychologist/reports/patient/[id]`
Relatório detalhado do paciente.

### 💬 Endpoints de Chat

#### `GET /api/chat`
Lista mensagens do chat.

**Query Params:**
- `userId` - ID do usuário para conversar
- `page` - Página
- `limit` - Limite de mensagens

#### `POST /api/chat`
Envia nova mensagem.

**Body:**
```json
{
  "receiverId": 456,
  "content": "Olá! Como você está?"
}
```

### 🔔 Endpoints de Notificações

#### `GET /api/notifications/realtime`
Endpoint SSE para notificações em tempo real.

#### `POST /api/notifications/subscribe`
Registra subscription para push notifications.

**Body:**
```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### 📊 Status Codes

- **200** - Sucesso
- **201** - Criado
- **400** - Requisição inválida
- **401** - Não autorizado
- **403** - Proibido
- **404** - Não encontrado
- **500** - Erro interno

---

## 🚀 Deploy

### Deploy na Vercel (Recomendado)

1. **Conecte o repositório no Vercel:**
   ```bash
   npx vercel
   ```

2. **Configure as variáveis de ambiente:**
   - Acesse o dashboard da Vercel
   - Vá em Settings → Environment Variables
   - Adicione todas as variáveis do `env.template`

3. **Configure o banco de dados:**
   - Crie um database no [Neon](https://neon.tech)
   - Configure a `POSTGRES_URL`
   - Execute as migrations

### Deploy com Docker

1. **Build da imagem:**
   ```bash
   docker build -t caris-saas-pro .
   ```

2. **Execute o container:**
   ```bash
   docker run -p 3000:3000 \
     -e POSTGRES_URL="your-db-url" \
     -e JWT_SECRET="your-secret" \
     caris-saas-pro
   ```

### Deploy Manual

1. **Build do projeto:**
   ```bash
   pnpm build
   ```

2. **Inicie o servidor:**
   ```bash
   pnpm start
   ```

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento
pnpm build            # Build para produção
pnpm start            # Inicia servidor de produção
pnpm lint             # Executa linting
pnpm type-check       # Verificação de tipos

# Banco de Dados
pnpm db:generate      # Gera migrations
pnpm db:migrate       # Executa migrations
pnpm db:seed          # Popula banco com dados iniciais
pnpm db:studio        # Interface visual do banco

# Testes
pnpm test             # Executa testes
pnpm test:watch       # Testes em modo watch
pnpm test:coverage    # Cobertura de testes

# Utilitários
pnpm check-all        # Verifica tudo (lint + types + tests)
pnpm clean            # Limpa builds e caches
```

---

## 🧪 Testando a Aplicação

### Usuários de Demonstração

#### Psicólogo Demo
- **Email:** `psicologo@demo.com`
- **Senha:** `demo123456`

#### Paciente Demo
- **Email:** `paciente@demo.com`
- **Senha:** `demo123456`

#### Admin Demo
- **Email:** `admin@demo.com`
- **Senha:** `admin123456`

---

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. **Fork o projeto**
2. **Crie uma branch para sua feature**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit suas mudanças**
   ```bash
   git commit -m 'Add: amazing feature'
   ```
4. **Push para a branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Abra um Pull Request**

### 📝 Padrões de Commit

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação, CSS
- `refactor:` - Refatoração de código
- `test:` - Testes
- `chore:` - Tarefas de build, configs

---

## 📄 Licença

Este projeto é licenciado sob a **Business Source License 1.1 (BUSL-1.1)**

### ✅ Permitido:
- Uso pessoal e educacional
- Modificações para uso próprio
- Contribuições para o projeto

### ❌ Não Permitido:
- Uso comercial sem licença
- Redistribuição sem autorização
- Criação de produtos concorrentes

### 📧 Contato para Licenciamento

Para uso comercial ou parcerias:
- **Email:** kallebyevangelho03@gmail.com
- **LinkedIn:** [Kalleby Evangelho](https://linkedin.com/in/kallebyevangelho)
- **Website:** [carisapp.com.br](https://carisapp.com.br)

---

## 🔮 Roadmap

### 🏗️ Em Desenvolvimento (Q1 2024)
- [ ] Sistema de videochamadas integrado
- [ ] IA para análise de sentimentos em tempo real
- [ ] App mobile React Native
- [ ] Integração com wearables (Apple Watch, Fitbit)

### 🌟 Próximas Features (Q2 2024)
- [ ] Marketplace de recursos terapêuticos
- [ ] Sistema de grupos de apoio
- [ ] Inteligência artificial para recomendações
- [ ] Dashboard para familiares (com permissão)

### 🚀 Futuro (Q3-Q4 2024)
- [ ] Integração com sistemas hospitalares
- [ ] Telepsiquiatria integrada
- [ ] Realidade virtual para terapias
- [ ] Blockchain para privacidade de dados

---

## 📞 Suporte

Precisa de ajuda? Entre em contato:

- 📧 **Email:** suporte@caris.com
- 💬 **Chat:** [Acesse nossa plataforma](https://carisapp.com.br)
- 📱 **WhatsApp:** +55 (11) 99999-9999
- 🌐 **Documentação:** [docs.caris.com](https://docs.caris.com)

---

## 🙏 Agradecimentos

Agradecemos a todos que contribuíram para este projeto:

- **Equipe Oryum Tech** - Desenvolvimento e design
- **Comunidade Open Source** - Ferramentas e inspiração
- **Profissionais de Saúde Mental** - Feedback e validação
- **Beta Testers** - Testes e sugestões

---

<div align="center">

**CÁRIS SaaS Pro** - Desenvolvido com 💚 por [Kalleby Evangelho](https://github.com/KallebyX)

*Conectando tempo, emoção e tecnologia para transformar vidas*

[![Website](https://img.shields.io/badge/Website-carisapp.com.br-blue)](https://carisapp.com.br)
[![GitHub](https://img.shields.io/badge/GitHub-KallebyX%2FCARIS-green)](https://github.com/KallebyX/CARIS)
[![License](https://img.shields.io/badge/License-BUSL--1.1-red)](./LICENSE)

</div> 