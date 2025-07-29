#!/bin/bash

# CÁRIS SaaS Pro - Quick Deploy Script
# Execute este script para deploy rápido no Render

set -e

echo "🚀 CÁRIS SaaS Pro - Quick Deploy"
echo "================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verificar se Git está limpo
if ! git diff --quiet HEAD; then
    echo "⚠️  Aviso: Existem mudanças não commitadas"
    read -p "Deseja continuar? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "Deploy cancelado"
        exit 1
    fi
fi

echo "📋 Executando pré-verificações..."

# 1. Teste build local
echo "🔧 Testando build local..."
pnpm build || {
    echo "❌ Build local falhou. Corrija os erros antes do deploy."
    exit 1
}

echo "✅ Build local bem-sucedido"

# 2. Verificar se arquivos essenciais existem
echo "📁 Verificando arquivos essenciais..."
required_files=(
    "package.json"
    "next.config.js"
    "render.yaml"
    ".env.production"
    "RENDER_DEPLOY.md"
    "scripts/deploy-render.sh"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - AUSENTE"
        missing_files=true
    fi
done

if [ "$missing_files" = true ]; then
    echo "❌ Arquivos essenciais estão ausentes"
    exit 1
fi

# 3. Gerar template de environment variables
echo "🔧 Gerando template de variáveis de ambiente..."
./scripts/render-env-template.sh > render-env-vars.txt
echo "✅ Template salvo em: render-env-vars.txt"

# 4. Mostrar próximos passos
echo ""
echo "🎯 PRÓXIMOS PASSOS PARA DEPLOY:"
echo "=============================="
echo ""
echo "1. 💳 UPGRADE CONTA RENDER:"
echo "   - Acesse: https://dashboard.render.com"
echo "   - Vá em Account Settings → Billing"
echo "   - Escolha plano Starter (\$7/mês)"
echo ""
echo "2. 🚀 DEPLOY AUTOMÁTICO:"
echo "   Execute: ./scripts/deploy-render.sh"
echo ""
echo "   OU"
echo ""
echo "3. 📱 DEPLOY MANUAL:"
echo "   - Acesse: https://dashboard.render.com"
echo "   - New → Blueprint"
echo "   - Conecte repositório: KallebyX/CARIS"
echo "   - Configure environment variables do arquivo: render-env-vars.txt"
echo ""
echo "4. ✅ VERIFICAÇÃO:"
echo "   - Use o checklist: DEPLOYMENT_CHECKLIST.md"
echo "   - Teste a URL: https://caris-saas-pro.onrender.com"
echo ""
echo "📋 ARQUIVOS DE REFERÊNCIA:"
echo "- 📖 Guia completo: RENDER_DEPLOY.md"
echo "- ✅ Checklist: DEPLOYMENT_CHECKLIST.md" 
echo "- 🔧 Env vars: render-env-vars.txt"
echo "- 🤖 Script auto: scripts/deploy-render.sh"
echo ""
echo "🎉 TUDO PRONTO PARA DEPLOY!"
echo ""
echo "⚠️  LEMBRE-SE:"
echo "- Upgrade da conta Render é obrigatório"
echo "- Configure todas as environment variables"
echo "- Teste cada funcionalidade após deploy"
echo ""

# 5. Opcional: Abrir URLs úteis
if command -v open &> /dev/null; then
    read -p "🌐 Abrir Render Dashboard? (y/N): " open_dashboard
    if [[ $open_dashboard == [yY] ]]; then
        open "https://dashboard.render.com"
    fi
fi

echo "🚀 Quick Deploy script concluído!"
echo "Siga os próximos passos acima para completar o deploy."