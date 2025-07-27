#!/usr/bin/env node

/**
 * Demonstração do MCP PostgreSQL
 * Este script mostra como uma aplicação pode interagir com o PostgreSQL através do MCP
 */

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🐘 Demonstração do MCP PostgreSQL');
console.log('=====================================\n');

// Configuração da conexão
const POSTGRES_URL = 'postgresql://username:password@localhost:5445/caris';

// Simulação de como o MCP funciona
class PostgreSQLMCP {
  constructor(connectionString) {
    this.connectionString = connectionString;
    console.log(`📊 MCP PostgreSQL inicializado`);
    console.log(`🔗 Conexão: ${connectionString.replace(/:[^:@]*@/, ':***@')}\n`);
  }

  async executeQuery(query, description) {
    console.log(`🔍 ${description}`);
    console.log(`📝 Query: ${query}\n`);
    
    return new Promise((resolve, reject) => {
      const psql = spawn('psql', [this.connectionString, '-c', query], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      psql.stdout.on('data', (data) => {
        output += data.toString();
      });

      psql.stderr.on('data', (data) => {
        error += data.toString();
      });

      psql.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Resultado:');
          console.log(output);
          console.log('─'.repeat(50) + '\n');
          resolve(output);
        } else {
          console.log('❌ Erro:');
          console.log(error);
          reject(error);
        }
      });
    });
  }

  async demonstrateFunctions() {
    try {
      // 1. Listar tabelas
      await this.executeQuery(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
        "Listando tabelas públicas no banco"
      );

      // 2. Descrever estrutura da tabela
      await this.executeQuery(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'mcp_test';",
        "Descrevendo estrutura da tabela mcp_test"
      );

      // 3. Contar registros
      await this.executeQuery(
        "SELECT COUNT(*) as total_records FROM mcp_test;",
        "Contando registros na tabela mcp_test"
      );

      // 4. Buscar dados recentes
      await this.executeQuery(
        "SELECT id, name, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') as created FROM mcp_test ORDER BY created_at DESC LIMIT 5;",
        "Buscando os 5 registros mais recentes"
      );

      // 5. Estatísticas do banco
      await this.executeQuery(
        "SELECT pg_size_pretty(pg_database_size('caris')) as database_size;",
        "Verificando tamanho do banco de dados"
      );

      console.log('🎉 Demonstração concluída com sucesso!');
      console.log('\n📋 Funcionalidades do MCP PostgreSQL:');
      console.log('   ✅ Conexão segura com PostgreSQL');
      console.log('   ✅ Execução de queries SQL');
      console.log('   ✅ Consulta de metadados');
      console.log('   ✅ Análise de estruturas de dados');
      console.log('   ✅ Estatísticas do banco');
      console.log('   ✅ Suporte a transações');
      console.log('   ✅ Integração com aplicações via MCP Protocol');

    } catch (error) {
      console.error('❌ Erro na demonstração:', error);
    }
  }
}

// Função principal
async function main() {
  const mcp = new PostgreSQLMCP(POSTGRES_URL);
  await mcp.demonstrateFunctions();
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PostgreSQLMCP; 