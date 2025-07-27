#!/usr/bin/env node

/**
 * MCP Manager - Caris SaaS Pro
 * Gerenciador centralizado para todos os Model Context Protocols
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MCPManager {
  constructor() {
    this.configPath = path.join(__dirname, '../config/mcp-config.json');
    this.config = this.loadConfig();
    this.runningProcesses = new Map();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('❌ Erro ao carregar configuração:', error.message);
      process.exit(1);
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('✅ Configuração salva com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error.message);
    }
  }

  listMCPs() {
    console.log('\n🔗 MCPs Disponíveis - Caris SaaS Pro\n');
    console.log('📊 Ambiente:', this.config.environment);
    console.log('🗓️  Última atualização:', this.config.lastUpdated);
    console.log('');

    const servers = this.config.environment === 'production' 
      ? this.config.mcpServersProduction 
      : this.config.mcpServers;

    console.log('┌─────────────────────────┬──────────────┬─────────────────────────────┐');
    console.log('│ MCP                     │ Status       │ Descrição                   │');
    console.log('├─────────────────────────┼──────────────┼─────────────────────────────┤');

    Object.entries(servers).forEach(([name, config]) => {
      const status = config.status || 'unknown';
      const statusIcon = {
        'active': '✅',
        'available': '⚠️',
        'inactive': '❌',
        'unknown': '❓'
      }[status] || '❓';

      const description = config.description.substring(0, 27);
      console.log(`│ ${name.padEnd(23)} │ ${statusIcon} ${status.padEnd(9)} │ ${description.padEnd(27)} │`);
    });

    console.log('└─────────────────────────┴──────────────┴─────────────────────────────┘');
    console.log('\n📈 Servidores ativos:', this.config.activeServers.length);
    console.log('🎯 Total disponível:', Object.keys(servers).length);
  }

  async startMCP(mcpName) {
    const servers = this.config.environment === 'production' 
      ? this.config.mcpServersProduction 
      : this.config.mcpServers;

    if (!servers[mcpName]) {
      console.error(`❌ MCP '${mcpName}' não encontrado`);
      return false;
    }

    const mcpConfig = servers[mcpName];
    console.log(`🚀 Iniciando MCP: ${mcpName}`);
    console.log(`📝 Descrição: ${mcpConfig.description}`);

    try {
      const process = spawn(mcpConfig.command, mcpConfig.args, {
        env: { ...process.env, ...mcpConfig.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.runningProcesses.set(mcpName, process);

      process.stdout.on('data', (data) => {
        console.log(`[${mcpName}] ${data.toString()}`);
      });

      process.stderr.on('data', (data) => {
        console.error(`[${mcpName}] ERROR: ${data.toString()}`);
      });

      process.on('close', (code) => {
        console.log(`[${mcpName}] Processo finalizado com código: ${code}`);
        this.runningProcesses.delete(mcpName);
      });

      console.log(`✅ MCP '${mcpName}' iniciado com PID: ${process.pid}`);
      return true;

    } catch (error) {
      console.error(`❌ Erro ao iniciar MCP '${mcpName}':`, error.message);
      return false;
    }
  }

  stopMCP(mcpName) {
    if (mcpName === 'all') {
      console.log('🛑 Parando todos os MCPs...');
      this.runningProcesses.forEach((process, name) => {
        console.log(`🛑 Parando ${name}...`);
        process.kill();
      });
      this.runningProcesses.clear();
      console.log('✅ Todos os MCPs foram parados');
      return;
    }

    const process = this.runningProcesses.get(mcpName);
    if (!process) {
      console.log(`⚠️ MCP '${mcpName}' não está em execução`);
      return;
    }

    console.log(`🛑 Parando MCP: ${mcpName}`);
    process.kill();
    this.runningProcesses.delete(mcpName);
    console.log(`✅ MCP '${mcpName}' foi parado`);
  }

  getStatus() {
    console.log('\n📊 Status dos MCPs\n');
    
    console.log('🔄 Processos em execução:', this.runningProcesses.size);
    this.runningProcesses.forEach((process, name) => {
      console.log(`  ✅ ${name} (PID: ${process.pid})`);
    });

    console.log('\n📋 Últimos testes:');
    if (this.config.testing) {
      console.log(`  🗓️  Data: ${this.config.testing.lastRun}`);
      console.log(`  🐘 PostgreSQL: ${this.config.testing.postgresTest}`);
      console.log(`  💳 MercadoPago: ${this.config.testing.mercadoPagoTest}`);
      console.log(`  ✅ Todos os testes: ${this.config.testing.allTestsPassed ? 'Passou' : 'Falhou'}`);
    }

    console.log('\n🎯 Ambiente atual:', this.config.environment);
    console.log('📦 Versão:', this.config.version);
  }

  switchEnvironment(env) {
    if (!['development', 'production'].includes(env)) {
      console.error('❌ Ambiente deve ser "development" ou "production"');
      return;
    }

    console.log(`🔄 Alterando ambiente de ${this.config.environment} para ${env}`);
    this.config.environment = env;
    this.config.lastUpdated = new Date().toISOString().split('T')[0];
    this.saveConfig();
    console.log(`✅ Ambiente alterado para: ${env}`);
  }

  showHelp() {
    console.log(`
🔗 MCP Manager - Caris SaaS Pro

Uso: node mcp-manager.js [comando] [argumentos]

Comandos:
  --list                    Lista todos os MCPs disponíveis
  --start <mcp-name>        Inicia um MCP específico
  --stop <mcp-name|all>     Para um MCP ou todos
  --status                  Mostra status atual dos MCPs
  --env <dev|prod>          Altera ambiente (development/production)
  --test                    Executa testes básicos
  --help                    Mostra esta ajuda

Exemplos:
  node mcp-manager.js --list
  node mcp-manager.js --start postgres
  node mcp-manager.js --stop all
  node mcp-manager.js --env production
  node mcp-manager.js --status

Para mais informações, consulte: ../docs/README.md
    `);
  }

  async runBasicTests() {
    console.log('🧪 Executando testes básicos dos MCPs...\n');

    // Teste de configuração
    console.log('1️⃣ Testando configuração...');
    if (this.config && this.config.version) {
      console.log('✅ Configuração carregada');
    } else {
      console.log('❌ Erro na configuração');
      return;
    }

    // Teste PostgreSQL (se disponível)
    console.log('2️⃣ Testando PostgreSQL...');
    if (process.env.POSTGRES_URL) {
      console.log('✅ String de conexão PostgreSQL encontrada');
    } else {
      console.log('⚠️ POSTGRES_URL não configurada');
    }

    // Teste de estrutura de arquivos
    console.log('3️⃣ Testando estrutura de arquivos...');
    const requiredDirs = ['config', 'docs', 'tests', 'utils'];
    const mcpDir = path.dirname(__dirname);
    
    let allDirsExist = true;
    requiredDirs.forEach(dir => {
      const dirPath = path.join(mcpDir, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`  ✅ ${dir}/`);
      } else {
        console.log(`  ❌ ${dir}/ não encontrado`);
        allDirsExist = false;
      }
    });

    console.log('\n📊 Resultado dos testes:');
    if (allDirsExist) {
      console.log('✅ Todos os testes básicos passaram');
    } else {
      console.log('⚠️ Alguns testes falharam');
    }
  }
}

// CLI Interface
async function main() {
  const manager = new MCPManager();
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    manager.showHelp();
    return;
  }

  const command = args[0];
  const argument = args[1];

  switch (command) {
    case '--list':
      manager.listMCPs();
      break;

    case '--start':
      if (!argument) {
        console.error('❌ Especifique o nome do MCP para iniciar');
        return;
      }
      await manager.startMCP(argument);
      break;

    case '--stop':
      if (!argument) {
        console.error('❌ Especifique o nome do MCP para parar (ou "all")');
        return;
      }
      manager.stopMCP(argument);
      break;

    case '--status':
      manager.getStatus();
      break;

    case '--env':
      if (!argument) {
        console.error('❌ Especifique o ambiente (development ou production)');
        return;
      }
      manager.switchEnvironment(argument);
      break;

    case '--test':
      await manager.runBasicTests();
      break;

    default:
      console.error(`❌ Comando desconhecido: ${command}`);
      manager.showHelp();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MCPManager; 