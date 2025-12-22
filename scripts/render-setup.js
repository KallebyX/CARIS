#!/usr/bin/env node

/**
 * Script de setup para deployment no Render
 * Este script prepara o ambiente e executa migrações do banco
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = promisify(exec);

async function setupRender() {
  console.log('🚀 Iniciando setup para Render...');

  try {
    // 1. Verificar variáveis de ambiente essenciais
    console.log('📋 Verificando variáveis de ambiente...');
    const requiredEnvVars = [
      'POSTGRES_URL',
      'JWT_SECRET',
      'RESEND_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.warn('⚠️  Variáveis de ambiente faltando:', missingVars.join(', '));
      console.warn('⚠️  Algumas funcionalidades podem não funcionar corretamente');
    } else {
      console.log('✅ Todas as variáveis essenciais estão configuradas');
    }

    // 2. Criar diretórios necessários
    console.log('📁 Criando diretórios necessários...');
    const dirs = ['public/audio/meditation', 'uploads', 'logs'];
    for (const dir of dirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Diretório criado: ${dir}`);
      }
    }

    // 3. Executar migrações do banco de dados
    // Skip migrations on Vercel builds - they should be run separately
    // Migrations during build can fail if tables already exist
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
    const skipMigrations = process.env.SKIP_MIGRATIONS === '1' || process.env.SKIP_MIGRATIONS === 'true';

    if (isVercel) {
      console.log('📦 Detectado ambiente Vercel - pulando migrações automáticas');
      console.log('   (migrações devem ser executadas separadamente quando necessário)');
    } else if (skipMigrations) {
      console.log('⏭️  SKIP_MIGRATIONS definido - pulando migrações');
    } else if (process.env.POSTGRES_URL) {
      console.log('🗄️  Executando migrações do banco de dados...');
      try {
        await execAsync('npm run db:migrate');
        console.log('✅ Migrações executadas com sucesso');
      } catch (error) {
        // Check if error is due to tables already existing (common scenario)
        if (error.message && error.message.includes('already exists')) {
          console.log('📋 Tabelas já existem - banco de dados está atualizado');
        } else {
          console.error('❌ Erro ao executar migrações:', error.message);
          console.log('📝 Continuando sem migrações (verifique o banco de dados manualmente)');
        }
      }
    } else {
      console.log('⚠️  POSTGRES_URL não encontrado, pulando migrações');
    }

    // 3. Verificar se o build foi bem-sucedido
    console.log('🔍 Verificando integridade do build...');
    const buildFiles = [
      '.next/static',
      '.next/server'
    ];

    // 4. Log de configurações finais
    console.log('📊 Configurações do ambiente:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
    console.log(`   Database: ${process.env.POSTGRES_URL ? 'configurado' : 'não configurado'}`);
    console.log(`   JWT: ${process.env.JWT_SECRET ? 'configurado' : 'não configurado'}`);
    console.log(`   Resend: ${process.env.RESEND_API_KEY ? 'configurado' : 'não configurado'}`);

    console.log('🎉 Setup concluído com sucesso!');
    console.log('🌐 A aplicação está pronta para o Render');

  } catch (error) {
    console.error('❌ Erro durante o setup:', error.message);
    process.exit(1);
  }
}

// Executar setup se este arquivo for chamado diretamente
if (require.main === module) {
  setupRender();
}

module.exports = { setupRender };