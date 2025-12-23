# Setup do CÁRIS no Vercel com Neon PostgreSQL

Este guia explica como configurar o banco de dados CÁRIS no Neon PostgreSQL através do Vercel.

## Pré-requisitos

1. Conta no [Vercel](https://vercel.com)
2. Conta no [Neon](https://neon.tech) (PostgreSQL serverless)
3. Projeto CÁRIS deployado no Vercel

## Passo 1: Criar Banco no Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto (ex: "caris-production")
3. Copie a connection string (será algo como):
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Passo 2: Configurar Variáveis de Ambiente no Vercel

No dashboard do Vercel, vá em **Settings > Environment Variables** e adicione:

### Variáveis Obrigatórias:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `POSTGRES_URL` | `postgresql://...` | Connection string do Neon |
| `JWT_SECRET` | `openssl rand -hex 32` | Chave secreta para JWT |
| `SETUP_SECRET_KEY` | `openssl rand -hex 32` | Chave para setup inicial |

### Variáveis Opcionais (Super Admin):

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `SUPER_ADMIN_EMAIL` | `admin@caris.com.br` | Email do super admin |
| `SUPER_ADMIN_PASSWORD` | `Admin@Caris2024!` | Senha inicial (MUDE!) |
| `SUPER_ADMIN_NAME` | `Administrador CÁRIS` | Nome do admin |

## Passo 3: Executar Setup do Banco de Dados

### Opção A: Via API (Recomendado para Vercel)

Após o deploy, faça uma requisição POST para a API de setup:

```bash
# Substitua pelos seus valores
curl -X POST https://seu-app.vercel.app/api/admin/setup \
  -H "Authorization: Bearer SUA_SETUP_SECRET_KEY" \
  -H "Content-Type: application/json"
```

Ou use uma ferramenta como Postman/Insomnia:
- **URL**: `https://seu-app.vercel.app/api/admin/setup`
- **Método**: POST
- **Header**: `Authorization: Bearer {SETUP_SECRET_KEY}`

### Opção B: Via Terminal Local

Se tiver acesso ao ambiente local com a connection string:

```bash
# Defina a variável de ambiente
export POSTGRES_URL="postgresql://..."

# Execute o script de setup
npx tsx scripts/setup-database.ts
```

## Passo 4: Verificar Setup

1. Acesse `https://seu-app.vercel.app/login`
2. Faça login com:
   - **Email**: `admin@caris.com.br` (ou o que configurou)
   - **Senha**: `Admin@Caris2024!` (ou a que configurou)

## Passo 5: Segurança Pós-Setup

**IMPORTANTE**: Após o setup inicial:

1. **Altere a senha do Super Admin** imediatamente
2. **Remova `SETUP_SECRET_KEY`** das variáveis de ambiente do Vercel
3. **Remova `SUPER_ADMIN_PASSWORD`** das variáveis de ambiente

## Resolução de Problemas

### Erro: "SETUP_SECRET_KEY não está configurada"
- Adicione a variável `SETUP_SECRET_KEY` nas Environment Variables do Vercel
- Faça redeploy do projeto

### Erro: "Database connection failed"
- Verifique se `POSTGRES_URL` está correta
- Certifique-se de que o IP do Vercel está liberado no Neon (normalmente não precisa)

### Erro: "Não autorizado"
- Verifique se o header `Authorization: Bearer {KEY}` está correto
- A chave deve ser exatamente igual à configurada em `SETUP_SECRET_KEY`

### Erro: "Table already exists"
- O setup é idempotente (pode ser executado múltiplas vezes)
- Tabelas existentes não são recriadas, apenas as novas são adicionadas

## Credenciais de Teste

Após o setup, os seguintes usuários estão disponíveis:

| Tipo | Email | Senha | Descrição |
|------|-------|-------|-----------|
| Admin | `admin@caris.com.br` | Configurada em env | Super administrador |

Para dados de exemplo adicionais, execute o seed:

```bash
node scripts/seed.js
```

Isso criará:
- Psicólogo: `psicologo@caris.com.br` / `Teste@123456`
- Paciente 1: `paciente1@caris.com.br` / `Teste@123456`
- Paciente 2: `paciente2@caris.com.br` / `Teste@123456`

## Suporte

Se encontrar problemas:
1. Verifique os logs do Vercel
2. Confira se todas as variáveis de ambiente estão configuradas
3. Teste a conexão com o banco de dados
