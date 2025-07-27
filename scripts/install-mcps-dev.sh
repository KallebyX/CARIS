#!/bin/bash

echo "🔌 Instalando MCPs para CARIS - Modo Desenvolvimento"
echo "=================================================="

# MCPs essenciais para desenvolvimento local
echo "📁 Instalando MCP de sistema de arquivos..."
npx @modelcontextprotocol/server-filesystem

echo "🔧 Instalando MCP do Git..."
npx @modelcontextprotocol/server-git

echo "🗄️ Instalando MCP do SQLite..."
npx @modelcontextprotocol/server-sqlite

echo "🧠 Instalando MCP de memória..."
npx @modelcontextprotocol/server-memory

echo "🐙 Instalando MCP do GitHub..."
npx @modelcontextprotocol/server-github

echo "📊 Instalando MCP do Google Analytics..."
npx @modelcontextprotocol/server-google-analytics

echo "📄 Instalando MCP de PDF..."
npx @modelcontextprotocol/server-pdf

echo "🤖 Instalando MCP do Puppeteer..."
npx @modelcontextprotocol/server-puppeteer

echo ""
echo "✅ MCPs de desenvolvimento instalados com sucesso!"
echo ""
echo "📋 MCPs ativos:"
echo "  ✅ filesystem - Acesso aos arquivos do projeto"
echo "  ✅ git - Controle de versão"
echo "  ✅ sqlite - Banco de dados local"
echo "  ✅ memory - Cache em memória"
echo "  ✅ github - Integração GitHub"
echo "  ✅ analytics - Google Analytics (G-ZC76X199S2)"
echo "  ✅ pdf - Processamento de PDFs"
echo "  ✅ puppeteer - Automação de navegador"
echo ""
echo "🌐 Banco de dados: SQLite (./data/caris.db)"
echo "📊 Analytics: Google Analytics habilitado"
echo "⚡ Outras funcionalidades: Desabilitadas para desenvolvimento"
echo ""
echo "🚀 Execute 'pnpm dev' para iniciar o servidor!" 