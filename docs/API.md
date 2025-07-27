# 📖 CÁRIS SaaS Pro - API Documentation

Documentação completa da API do sistema CÁRIS SaaS Pro.

## 📋 Índice

- [Autenticação](#autenticação)
- [Estrutura de Resposta](#estrutura-de-resposta)
- [Códigos de Status](#códigos-de-status)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Autenticação](#endpoints-de-autenticação)
  - [Usuários](#endpoints-de-usuários)
  - [Pacientes](#endpoints-de-pacientes)
  - [Psicólogos](#endpoints-de-psicólogos)
  - [Chat](#endpoints-de-chat)
  - [Notificações](#endpoints-de-notificações)
  - [Admin](#endpoints-administrativos)
- [Webhooks](#webhooks)
- [SDKs](#sdks)

---

## 🔐 Autenticação

A API utiliza autenticação JWT (JSON Web Tokens) para proteger endpoints.

### Obtendo Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "João Silva",
      "role": "patient"
    },
    "expiresIn": "24h"
  }
}
```

### Usando o Token

Inclua o token no header Authorization:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

---

## 📄 Estrutura de Resposta

Todas as respostas seguem este padrão:

### Sucesso
```json
{
  "success": true,
  "data": { /* dados da resposta */ },
  "message": "Operação realizada com sucesso",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": {
      "field": "email",
      "message": "Email inválido"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Paginação
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 📊 Códigos de Status

| Código | Significado | Descrição |
|--------|-------------|-----------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Recurso criado com sucesso |
| 204 | No Content | Sucesso sem conteúdo de resposta |
| 400 | Bad Request | Dados da requisição inválidos |
| 401 | Unauthorized | Autenticação necessária |
| 403 | Forbidden | Acesso negado |
| 404 | Not Found | Recurso não encontrado |
| 409 | Conflict | Conflito com estado atual |
| 422 | Unprocessable Entity | Erro de validação |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro interno do servidor |

---

## ⚡ Rate Limiting

A API possui limitações de taxa para prevenir abuso:

- **Padrão**: 100 requisições por minuto
- **Login**: 10 tentativas por minuto
- **Upload**: 5 uploads por minuto
- **SMS**: 5 envios por hora
- **Email**: 10 envios por hora

Headers de resposta:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

---

## 🔐 Endpoints de Autenticação

### Login
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "your-password",
  "rememberMe": true
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "João Silva",
      "role": "patient",
      "profile": { /* dados do perfil */ }
    },
    "expiresIn": "24h"
  }
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Refresh Token
```http
POST /api/auth/refresh
```

**Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### Esqueci minha senha
```http
POST /api/auth/forgot-password
```

**Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset senha
```http
POST /api/auth/reset-password
```

**Body:**
```json
{
  "token": "reset_token",
  "password": "new_your-password",
  "confirmPassword": "new_your-password"
}
```

---

## 👤 Endpoints de Usuários

### Obter usuário atual
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "João Silva",
    "role": "patient",
    "profile": {
      "avatar": "https://...",
      "birthDate": "1990-05-15",
      "phone": "+5511999999999",
      "currentCycle": "Criar"
    },
    "settings": {
      "emailNotifications": true,
      "pushNotifications": true,
      "theme": "light"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Atualizar perfil
```http
PUT /api/user/profile
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "João Silva Santos",
  "phone": "+5511888888888",
  "birthDate": "1990-05-15"
}
```

### Atualizar configurações
```http
PUT /api/user/settings
Authorization: Bearer <token>
```

**Body:**
```json
{
  "emailNotifications": false,
  "pushNotifications": true,
  "sessionReminders": true,
  "diaryReminders": true,
  "theme": "dark",
  "language": "pt-BR"
}
```

### Upload de avatar
```http
POST /api/user/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `avatar`: arquivo de imagem (max 5MB, jpg/png/gif)

### Alterar senha
```http
POST /api/user/change-password
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_your-password",
  "confirmPassword": "new_your-password"
}
```

---

## 🧠 Endpoints de Pacientes

### Listar entradas do diário
```http
GET /api/patient/diary?page=1&limit=10&mood=4&tag=trabalho
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Página (default: 1)
- `limit` (int): Itens por página (default: 10, max: 50)
- `mood` (int): Filtrar por humor (1-5)
- `tag` (string): Filtrar por tag
- `startDate` (date): Data inicial (YYYY-MM-DD)
- `endDate` (date): Data final (YYYY-MM-DD)

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Meu dia no trabalho",
      "content": "Hoje foi um dia desafiador...",
      "mood": 4,
      "tags": ["trabalho", "stress"],
      "isPrivate": false,
      "createdAt": "2024-01-15T08:30:00Z",
      "updatedAt": "2024-01-15T08:35:00Z"
    }
  ],
  "pagination": { /* dados de paginação */ }
}
```

### Criar entrada no diário
```http
POST /api/patient/diary
Authorization: Bearer <token>
```

**Body:**
```json
{
  "title": "Meu dia",
  "content": "Hoje me senti bem...",
  "mood": 4,
  "tags": ["família", "felicidade"],
  "isPrivate": false
}
```

### Atualizar entrada do diário
```http
PUT /api/patient/diary/:id
Authorization: Bearer <token>
```

### Deletar entrada do diário
```http
DELETE /api/patient/diary/:id
Authorization: Bearer <token>
```

### Registrar humor
```http
POST /api/patient/mood
Authorization: Bearer <token>
```

**Body:**
```json
{
  "mood": 4,
  "energy": 3,
  "anxiety": 2,
  "notes": "Me senti bem hoje",
  "date": "2024-01-15"
}
```

### Obter histórico de humor
```http
GET /api/patient/mood?period=week
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: day, week, month, year
- `startDate`: Data inicial
- `endDate`: Data final

### Usar ferramenta SOS
```http
POST /api/patient/sos
Authorization: Bearer <token>
```

**Body:**
```json
{
  "toolName": "breathing",
  "durationMinutes": 5,
  "effectivenessRating": 4,
  "notes": "Me ajudou a relaxar"
}
```

### Listar sessões
```http
GET /api/patient/sessions?status=agendada
Authorization: Bearer <token>
```

### Obter mapa emocional
```http
GET /api/patient/emotional-map?period=month
Authorization: Bearer <token>
```

### Obter progresso
```http
GET /api/patient/progress?metric=mood&period=3months
Authorization: Bearer <token>
```

---

## 👨‍⚕️ Endpoints de Psicólogos

### Listar pacientes
```http
GET /api/psychologist/patients?status=active
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "João Silva",
      "email": "joao@email.com",
      "avatar": "https://...",
      "currentCycle": "Criar",
      "lastSession": "2024-01-10T10:00:00Z",
      "nextSession": "2024-01-17T10:00:00Z",
      "riskLevel": "low",
      "therapyStartDate": "2023-06-01T00:00:00Z",
      "totalSessions": 12
    }
  ]
}
```

### Obter detalhes do paciente
```http
GET /api/psychologist/patients/:id
Authorization: Bearer <token>
```

### Criar nova sessão
```http
POST /api/psychologist/sessions
Authorization: Bearer <token>
```

**Body:**
```json
{
  "patientId": 123,
  "sessionDate": "2024-01-20T10:00:00Z",
  "durationMinutes": 50,
  "type": "online",
  "notes": "Sessão de acompanhamento"
}
```

### Atualizar sessão
```http
PUT /api/psychologist/sessions/:id
Authorization: Bearer <token>
```

### Cancelar sessão
```http
DELETE /api/psychologist/sessions/:id
Authorization: Bearer <token>
```

**Body:**
```json
{
  "reason": "Reagendamento solicitado pelo paciente",
  "notifyPatient": true
}
```

### Obter relatório do paciente
```http
GET /api/psychologist/reports/patient/:id?period=3months
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "patient": { /* dados do paciente */ },
    "summary": {
      "averageMood": 3.8,
      "totalDiaryEntries": 45,
      "sessionsAttended": 10,
      "sessionsScheduled": 12,
      "sosUsage": 3,
      "progressTrend": "improving"
    },
    "moodChart": [...],
    "diaryInsights": [...],
    "recommendations": [...]
  }
}
```

### Dashboard
```http
GET /api/psychologist/dashboard
Authorization: Bearer <token>
```

### Disponibilidade
```http
GET /api/psychologist/availability
Authorization: Bearer <token>
```

```http
PUT /api/psychologist/availability
Authorization: Bearer <token>
```

**Body:**
```json
{
  "schedule": {
    "monday": [
      { "start": "09:00", "end": "12:00" },
      { "start": "14:00", "end": "18:00" }
    ],
    "tuesday": [
      { "start": "09:00", "end": "17:00" }
    ]
  },
  "exceptions": [
    {
      "date": "2024-01-20",
      "available": false,
      "reason": "Férias"
    }
  ]
}
```

---

## 💬 Endpoints de Chat

### Listar conversas
```http
GET /api/chat/conversations
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "participant": {
        "id": 2,
        "name": "Dr. Ana Silva",
        "avatar": "https://...",
        "role": "psychologist"
      },
      "lastMessage": {
        "content": "Como você está se sentindo hoje?",
        "timestamp": "2024-01-15T14:30:00Z",
        "senderId": 2
      },
      "unreadCount": 2,
      "isOnline": true
    }
  ]
}
```

### Listar mensagens
```http
GET /api/chat/messages?conversationId=1&page=1&limit=50
Authorization: Bearer <token>
```

### Enviar mensagem
```http
POST /api/chat/messages
Authorization: Bearer <token>
```

**Body:**
```json
{
  "receiverId": 2,
  "content": "Estou me sentindo melhor hoje!",
  "type": "text"
}
```

### Marcar mensagens como lidas
```http
PUT /api/chat/messages/read
Authorization: Bearer <token>
```

**Body:**
```json
{
  "conversationId": 1,
  "messageIds": [1, 2, 3]
}
```

### Upload de arquivo no chat
```http
POST /api/chat/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Informações do chat (paciente)
```http
GET /api/patient/chat-info
Authorization: Bearer <token>
```

---

## 🔔 Endpoints de Notificações

### Listar notificações
```http
GET /api/notifications?page=1&limit=20&type=session&unread=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: session, diary, sos, chat, system
- `unread`: true/false
- `priority`: low, normal, high, urgent

### Marcar como lida
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### Marcar todas como lidas
```http
PUT /api/notifications/mark-all-read
Authorization: Bearer <token>
```

### Registrar subscription para push
```http
POST /api/notifications/subscribe
Authorization: Bearer <token>
```

**Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BGg...",
    "auth": "auth_key_here"
  },
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "platform": "web"
  }
}
```

### Real-time notifications (SSE)
```http
GET /api/notifications/realtime
Authorization: Bearer <token>
Accept: text/event-stream
```

### Testar notificação
```http
POST /api/notifications/test
Authorization: Bearer <token>
```

---

## 👑 Endpoints Administrativos

### Dashboard admin
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>
```

### Listar usuários
```http
GET /api/admin/users?role=patient&status=active&page=1
Authorization: Bearer <admin_token>
```

### Criar usuário
```http
POST /api/admin/users
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "name": "Novo Usuário",
  "email": "novo@email.com",
  "password": "your-password",
  "role": "patient",
  "profile": {
    "phone": "+5511999999999",
    "psychologistId": 2
  }
}
```

### Atualizar usuário
```http
PUT /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### Desativar usuário
```http
PUT /api/admin/users/:id/deactivate
Authorization: Bearer <admin_token>
```

### Estatísticas do sistema
```http
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "patients": 850,
      "psychologists": 149,
      "admins": 1,
      "active": 950,
      "newThisMonth": 45
    },
    "sessions": {
      "totalScheduled": 2500,
      "totalCompleted": 2100,
      "thisMonth": 180,
      "completionRate": 84
    },
    "engagement": {
      "dailyActiveUsers": 320,
      "diaryEntries": 4500,
      "sosUsage": 125,
      "averageSessionsPerUser": 2.8
    }
  }
}
```

### Planos de assinatura
```http
GET /api/admin/plans
Authorization: Bearer <admin_token>
```

```http
POST /api/admin/plans
Authorization: Bearer <admin_token>
```

```http
PUT /api/admin/plans/:id
Authorization: Bearer <admin_token>
```

---

## 🎣 Webhooks

### Configuração de Webhooks

```http
POST /api/webhooks/configure
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["session.created", "sos.triggered", "user.registered"],
  "secret": "webhook_secret_key"
}
```

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `user.registered` | Novo usuário cadastrado |
| `user.deactivated` | Usuário desativado |
| `session.created` | Nova sessão agendada |
| `session.completed` | Sessão realizada |
| `session.cancelled` | Sessão cancelada |
| `diary.entry_created` | Nova entrada no diário |
| `sos.triggered` | Ferramenta SOS utilizada |
| `payment.succeeded` | Pagamento realizado |
| `payment.failed` | Falha no pagamento |

### Exemplo de Payload

```json
{
  "event": "sos.triggered",
  "timestamp": "2024-01-15T15:30:00Z",
  "data": {
    "patient": {
      "id": 123,
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "psychologist": {
      "id": 456,
      "name": "Dr. Ana Silva"
    },
    "tool": "breathing",
    "duration": 5,
    "severity": "high"
  },
  "signature": "sha256=..."
}
```

### Verificação de Webhook

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

---

## 🛠 SDKs

### JavaScript/TypeScript SDK

```bash
npm install @caris/sdk
```

```typescript
import { CarisSDK } from '@caris/sdk';

const caris = new CarisSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.caris.com',
});

// Login
const { user, token } = await caris.auth.login('user@email.com', 'password');

// Criar entrada no diário
const diaryEntry = await caris.patient.diary.create({
  title: 'Meu dia',
  content: 'Hoje foi um bom dia...',
  mood: 4
});

// Listar pacientes (psicólogo)
const patients = await caris.psychologist.patients.list();
```

### Python SDK

```bash
pip install caris-sdk
```

```python
from caris_sdk import CarisClient

client = CarisClient(api_key='your-api-key')

# Login
user = client.auth.login('user@email.com', 'password')

# Criar sessão
session = client.psychologist.sessions.create(
    patient_id=123,
    session_date='2024-01-20T10:00:00Z',
    duration_minutes=50,
    type='online'
)
```

---

## 📊 Limites e Quotas

| Recurso | Limite |
|---------|--------|
| Requisições por minuto | 100 |
| Upload de arquivo | 50MB |
| Mensagens de chat por dia | 1000 |
| Entradas de diário por dia | 10 |
| Sessões por mês | 20 |
| Notificações push por dia | 100 |

---

## 🔍 Exemplos de Uso

### Fluxo completo: Login → Criar entrada no diário

```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'paciente@demo.com',
    password: 'demo123456'
  })
});

const { data: { token } } = await loginResponse.json();

// 2. Criar entrada no diário
const diaryResponse = await fetch('/api/patient/diary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Meu primeiro dia',
    content: 'Hoje comecei minha jornada no CARIS...',
    mood: 5,
    tags: ['início', 'esperança'],
    isPrivate: false
  })
});

const diaryEntry = await diaryResponse.json();
console.log('Entrada criada:', diaryEntry);
```

### Real-time notifications com SSE

```javascript
function setupRealTimeNotifications(token) {
  const eventSource = new EventSource(
    `/api/notifications/realtime?token=${token}`
  );
  
  eventSource.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    showNotification(notification);
  };
  
  eventSource.onerror = (error) => {
    console.error('Erro nas notificações:', error);
    // Reconectar após 5 segundos
    setTimeout(() => setupRealTimeNotifications(token), 5000);
  };
}
```

---

## 🚨 Tratamento de Erros

### Códigos de Erro Específicos

| Código | Descrição |
|--------|-----------|
| `AUTH_INVALID_CREDENTIALS` | Credenciais inválidas |
| `AUTH_TOKEN_EXPIRED` | Token expirado |
| `AUTH_INSUFFICIENT_PERMISSIONS` | Permissões insuficientes |
| `VALIDATION_ERROR` | Erro de validação |
| `RESOURCE_NOT_FOUND` | Recurso não encontrado |
| `CONFLICT_ERROR` | Conflito (ex: email já existe) |
| `RATE_LIMIT_EXCEEDED` | Limite de taxa excedido |
| `SERVICE_UNAVAILABLE` | Serviço temporariamente indisponível |

### Exemplo de Tratamento

```javascript
async function apiCall(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!data.success) {
      switch (data.error.code) {
        case 'AUTH_TOKEN_EXPIRED':
          // Renovar token
          await refreshToken();
          return apiCall(endpoint, options);
          
        case 'RATE_LIMIT_EXCEEDED':
          // Aguardar e tentar novamente
          await sleep(60000);
          return apiCall(endpoint, options);
          
        default:
          throw new Error(data.error.message);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Erro na API:', error);
    throw error;
  }
}
```

---

**CÁRIS SaaS Pro API** - Desenvolvido com 💚 por [Kalleby Evangelho](https://github.com/KallebyX)

Para mais informações, acesse: [docs.caris.com](https://docs.caris.com) 