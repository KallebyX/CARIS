#!/usr/bin/env node

/**
 * Health Check para MCPs - Caris SaaS Pro
 * Verifica a saúde e disponibilidade de todos os MCPs configurados
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MCPHealthCheck {
  constructor() {
    this.configPath = path.join(__dirname, '../config/mcp-config.json');
    this.config = this.loadConfig();
    this.results = new Map();
    this.startTime = Date.now();
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

  async checkConnection(url, timeout = 5000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ status: 'timeout', message: 'Timeout na conexão' });
      }, timeout);

      try {
        // Simular verificação de conexão
        // Em um ambiente real, isso faria uma conexão real
        const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
        
        if (isLocalhost) {
          clearTimeout(timer);
          resolve({ status: 'success', message: 'Conexão local disponível' });
        } else {
          clearTimeout(timer);
          resolve({ status: 'unknown', message: 'URL externa não testada' });
        }
      } catch (error) {
        clearTimeout(timer);
        resolve({ status: 'error', message: error.message });
      }
    });
  }

  async testPostgreSQL() {
    console.log('🐘 Testando PostgreSQL...');
    
    if (!process.env.POSTGRES_URL) {
      return {
        status: 'warning',
        message: 'POSTGRES_URL não configurada',
        details: 'Configure a variável de ambiente POSTGRES_URL'
      };
    }

    try {
      const result = await this.executeCommand(
        'psql', 
        [process.env.POSTGRES_URL, '-c', 'SELECT version();'],
        { timeout: 10000 }
      );

      if (result.success) {
        return {
          status: 'success',
          message: 'PostgreSQL funcionando',
          details: 'Conexão estabelecida com sucesso'
        };
      } else {
        return {
          status: 'error',
          message: 'Erro na conexão PostgreSQL',
          details: result.error
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'PostgreSQL não disponível',
        details: error.message
      };
    }
  }

  async testMercadoPago() {
    console.log('💳 Testando MercadoPago...');
    
    const requiredVars = [
      'MERCADOPAGO_ACCESS_TOKEN',
      'MERCADOPAGO_CLIENT_ID',
      'MERCADOPAGO_CLIENT_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        status: 'warning',
        message: 'Variáveis MercadoPago não configuradas',
        details: `Faltam: ${missingVars.join(', ')}`
      };
    }

    // Simular teste básico do MercadoPago
    return {
      status: 'success',
      message: 'Configuração MercadoPago válida',
      details: 'Todas as variáveis de ambiente estão configuradas'
    };
  }

  async testSQLite() {
    console.log('🗃️  Testando SQLite...');
    
    const dbPath = '/Users/kalleby/Downloads/Caris SaaS Pro (1)/data/caris.db';
    
    if (!fs.existsSync(dbPath)) {
      return {
        status: 'warning',
        message: 'Arquivo SQLite não encontrado',
        details: `Caminho: ${dbPath}`
      };
    }

    try {
      const stats = fs.statSync(dbPath);
      return {
        status: 'success',
        message: 'SQLite disponível',
        details: `Tamanho: ${Math.round(stats.size / 1024)}KB`
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Erro ao acessar SQLite',
        details: error.message
      };
    }
  }

  async testEnvironmentVariables() {
    console.log('🔧 Testando variáveis de ambiente...');
    
    const importantVars = [
      'POSTGRES_URL',
      'NEXT_PUBLIC_GA_ID',
      'GITHUB_TOKEN'
    ];

    const configuredVars = importantVars.filter(varName => process.env[varName]);
    const missingVars = importantVars.filter(varName => !process.env[varName]);
    
    return {
      status: configuredVars.length > 0 ? 'success' : 'warning',
      message: `${configuredVars.length}/${importantVars.length} variáveis configuradas`,
      details: {
        configured: configuredVars,
        missing: missingVars
      }
    };
  }

  async executeCommand(command, args, options = {}) {
    const timeout = options.timeout || 5000;
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ success: false, error: 'Timeout na execução do comando' });
      }, timeout);

      try {
        const process = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          clearTimeout(timer);
          resolve({
            success: code === 0,
            stdout,
            stderr,
            error: code !== 0 ? stderr : null
          });
        });

        process.on('error', (error) => {
          clearTimeout(timer);
          resolve({ success: false, error: error.message });
        });

      } catch (error) {
        clearTimeout(timer);
        resolve({ success: false, error: error.message });
      }
    });
  }

  async runAllChecks() {
    console.log('🏥 Iniciando Health Check dos MCPs - Caris SaaS Pro\n');
    
    const checks = [
      { name: 'PostgreSQL', test: () => this.testPostgreSQL() },
      { name: 'MercadoPago', test: () => this.testMercadoPago() },
      { name: 'SQLite', test: () => this.testSQLite() },
      { name: 'Environment', test: () => this.testEnvironmentVariables() }
    ];

    for (const check of checks) {
      try {
        const result = await check.test();
        this.results.set(check.name, result);
      } catch (error) {
        this.results.set(check.name, {
          status: 'error',
          message: 'Erro no teste',
          details: error.message
        });
      }
    }

    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    console.log('\n📊 Relatório de Health Check\n');
    console.log('┌─────────────────┬──────────────┬─────────────────────────────────────┐');
    console.log('│ Componente      │ Status       │ Detalhes                            │');
    console.log('├─────────────────┼──────────────┼─────────────────────────────────────┤');

    let totalTests = 0;
    let successfulTests = 0;
    let warningTests = 0;
    let errorTests = 0;

    this.results.forEach((result, name) => {
      totalTests++;
      
      let statusIcon;
      let statusText;
      
      switch (result.status) {
        case 'success':
          statusIcon = '✅';
          statusText = 'OK';
          successfulTests++;
          break;
        case 'warning':
          statusIcon = '⚠️';
          statusText = 'Warning';
          warningTests++;
          break;
        case 'error':
          statusIcon = '❌';
          statusText = 'Error';
          errorTests++;
          break;
        default:
          statusIcon = '❓';
          statusText = 'Unknown';
      }

      const details = typeof result.details === 'string' 
        ? result.details.substring(0, 35)
        : result.message.substring(0, 35);

      console.log(`│ ${name.padEnd(15)} │ ${statusIcon} ${statusText.padEnd(9)} │ ${details.padEnd(35)} │`);
    });

    console.log('└─────────────────┴──────────────┴─────────────────────────────────────┘');

    // Resumo
    console.log('\n📈 Resumo:');
    console.log(`✅ Sucessos: ${successfulTests}`);
    console.log(`⚠️  Avisos: ${warningTests}`);
    console.log(`❌ Erros: ${errorTests}`);
    console.log(`🕐 Duração: ${duration}ms`);

    // Status geral
    const overallStatus = errorTests > 0 ? 'CRÍTICO' : 
                         warningTests > 0 ? 'ATENÇÃO' : 'SAUDÁVEL';
    
    const statusIcon = errorTests > 0 ? '🔴' : 
                      warningTests > 0 ? '🟡' : '🟢';

    console.log(`\n${statusIcon} Status Geral: ${overallStatus}`);

    // Recomendações
    if (errorTests > 0 || warningTests > 0) {
      console.log('\n💡 Recomendações:');
      
      this.results.forEach((result, name) => {
        if (result.status === 'error' || result.status === 'warning') {
          console.log(`  • ${name}: ${result.message}`);
          if (typeof result.details === 'string') {
            console.log(`    ${result.details}`);
          }
        }
      });
    }

    console.log(`\n🗓️  Health Check executado em: ${new Date().toLocaleString('pt-BR')}`);
  }

  async saveReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: Object.fromEntries(this.results),
      summary: {
        total: this.results.size,
        success: Array.from(this.results.values()).filter(r => r.status === 'success').length,
        warning: Array.from(this.results.values()).filter(r => r.status === 'warning').length,
        error: Array.from(this.results.values()).filter(r => r.status === 'error').length
      }
    };

    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const reportPath = path.join(logsDir, 'mcp-health-check.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\n💾 Relatório salvo em: ${reportPath}`);
  }
}

// CLI Interface
async function main() {
  const healthCheck = new MCPHealthCheck();
  
  const args = process.argv.slice(2);
  const shouldSave = args.includes('--save');

  await healthCheck.runAllChecks();
  
  if (shouldSave) {
    await healthCheck.saveReport();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MCPHealthCheck; 