#!/bin/bash

# CÁRIS SaaS Pro - Render Deployment Script
# Este script automatiza o deploy no Render usando a CLI

set -e

echo "🚀 CÁRIS SaaS Pro - Render Deployment"
echo "===================================="

# Verificar se a CLI do Render está instalada
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI não encontrada. Instalando..."
    npm install -g @render-com/cli
fi

# Login no Render (se necessário)
echo "🔐 Fazendo login no Render..."
render auth login

# Criar o banco de dados PostgreSQL
echo "📊 Criando banco de dados PostgreSQL..."
render services create \
  --type postgres \
  --name caris-database \
  --plan starter \
  --region oregon \
  --postgres-version 15

# Aguardar a criação do banco
echo "⏳ Aguardando criação do banco de dados..."
sleep 30

# Obter a URL do banco de dados
DB_URL=$(render services get caris-database --format json | jq -r '.internalConnectionString')

# Criar o web service
echo "🌐 Criando web service..."
render services create \
  --type web \
  --name caris-saas-pro \
  --repo KallebyX/CARIS \
  --branch main \
  --plan starter \
  --region oregon \
  --build-command "pnpm install && pnpm build" \
  --start-command "pnpm start" \
  --env-vars NODE_ENV=production \
  --env-vars POSTGRES_URL="$DB_URL" \
  --env-vars NEXT_PUBLIC_APP_URL=https://caris-saas-pro.onrender.com \
  --env-vars JWT_SECRET=$(openssl rand -hex 32) \
  --env-vars NEXTAUTH_SECRET=$(openssl rand -hex 32) \
  --env-vars SESSION_SECRET=$(openssl rand -hex 32) \
  --env-vars NEXTAUTH_URL=https://caris-saas-pro.onrender.com

echo "✅ Serviços criados com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente restantes no dashboard"
echo "2. Adicione suas chaves de API reais"
echo "3. Execute as migrações do banco de dados"
echo ""
echo "🌐 URL do app: https://caris-saas-pro.onrender.com"
echo "📊 Database: caris-database"