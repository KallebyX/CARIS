#!/bin/bash

echo "🔍 CÁRIS SaaS Pro - Status da Configuração"
echo "=========================================="
echo ""

# Verificar arquivo .env.local
if [ -f ".env.local" ]; then
    echo "✅ .env.local encontrado"
    echo "📊 Google Analytics: $(grep NEXT_PUBLIC_GA_ID .env.local | cut -d= -f2 | tr -d '"')"
    echo "🗄️ Banco de dados: $(grep DATABASE_URL .env.local | cut -d= -f2 | tr -d '"')"
    echo "🌐 URL da aplicação: $(grep NEXT_PUBLIC_APP_URL .env.local | cut -d= -f2 | tr -d '"')"
else
    echo "❌ .env.local não encontrado"
fi

echo ""

# Verificar diretório data
if [ -d "data" ]; then
    echo "✅ Diretório 'data' existe (SQLite)"
else
    echo "❌ Diretório 'data' não existe - criando..."
    mkdir -p data
    echo "✅ Diretório 'data' criado"
fi

echo ""

# Verificar servidor Next.js
if pgrep -f "next dev" > /dev/null; then
    echo "✅ Servidor Next.js está rodando"
    echo "🌐 Acesse: http://localhost:3000"
else
    echo "❌ Servidor Next.js não está rodando"
    echo "💡 Execute: pnpm dev"
fi

echo ""

# Funcionalidades habilitadas
echo "⚙️ Funcionalidades habilitadas no .env.local:"
if [ -f ".env.local" ]; then
    grep "ENABLE_" .env.local | while read line; do
        feature=$(echo $line | cut -d= -f1)
        status=$(echo $line | cut -d= -f2 | tr -d '"')
        if [ "$status" = "true" ]; then
            echo "  ✅ $feature"
        else
            echo "  ❌ $feature"
        fi
    done
else
    echo "  ❓ Não é possível verificar (arquivo .env.local não encontrado)"
fi

echo ""

# MCPs configurados
echo "🔌 MCPs configurados para desenvolvimento:"
echo "  📁 filesystem - Sistema de arquivos"
echo "  🔧 git - Controle de versão"
echo "  🗄️ sqlite - Banco SQLite"
echo "  🧠 memory - Cache memória"
echo "  🐙 github - GitHub"
echo "  📊 analytics - Google Analytics"
echo "  📄 pdf - Processamento PDF"
echo "  🤖 puppeteer - Automação navegador"

echo ""
echo "🎯 Configuração otimizada para desenvolvimento local!"
echo "📚 Veja MCP_SETUP.md para mais detalhes" 