#!/bin/bash
# Script de inicialização completa do sistema CARIS

echo "🚀 Inicializando sistema CARIS..."

# Verificar se o PostgreSQL está rodando
if ! docker ps | grep -q "caris-postgres"; then
    echo "📦 Iniciando container PostgreSQL..."
    docker run --name caris-postgres \
        -e POSTGRES_DB=caris \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=password \
        -p 5432:5432 \
        -d postgres:15
    
    echo "⏳ Aguardando PostgreSQL inicializar..."
    sleep 10
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📚 Instalando dependências Node.js..."
    npm install
fi

# Gerar e executar migrações do banco de dados
echo "🗄️ Configurando banco de dados..."
npm run db:generate
npm run db:migrate

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "⚙️ Copiando configurações de ambiente..."
    cp env.template .env.local
fi

echo "✅ Sistema CARIS configurado e pronto!"
echo "🌐 Acesse: http://localhost:3000"
echo "🗄️ Banco de dados PostgreSQL rodando na porta 5432"
echo ""
echo "Para iniciar o servidor de desenvolvimento:"
echo "  npm run dev"
echo ""
echo "Para acessar o banco de dados:"
echo "  docker exec -it caris-postgres psql -U postgres -d caris"
echo ""
echo "Para ver logs do PostgreSQL:"
echo "  docker logs caris-postgres"
