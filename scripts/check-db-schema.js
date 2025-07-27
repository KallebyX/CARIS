const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function checkAndUpdateSchema() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL
  })

  try {
    await client.connect()
    console.log('Conectado ao PostgreSQL')

    // Verificar estrutura atual da tabela diary_entries
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'diary_entries'
      ORDER BY ordinal_position;
    `)

    console.log('\nEstrutura atual da tabela diary_entries:')
    console.log('=' * 60)
    result.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} NULL: ${col.is_nullable.padEnd(3)} Default: ${col.column_default || 'NULL'}`)
    })

    // Verificar quais colunas de IA precisam ser adicionadas
    const aiColumns = [
      'ai_analyzed',
      'dominant_emotion', 
      'emotion_intensity',
      'sentiment_score',
      'risk_level',
      'ai_insights',
      'suggested_actions',
      'plutchik_categories'
    ]

    const existingColumns = result.rows.map(row => row.column_name)
    const missingColumns = aiColumns.filter(col => !existingColumns.includes(col))

    if (missingColumns.length > 0) {
      console.log('\nColunas de IA que precisam ser adicionadas:')
      missingColumns.forEach(col => console.log(`- ${col}`))

      // Adicionar colunas uma por uma
      for (const column of missingColumns) {
        let sql = ''
        switch (column) {
          case 'ai_analyzed':
            sql = 'ALTER TABLE diary_entries ADD COLUMN ai_analyzed BOOLEAN DEFAULT false;'
            break
          case 'dominant_emotion':
            sql = 'ALTER TABLE diary_entries ADD COLUMN dominant_emotion TEXT;'
            break
          case 'emotion_intensity':
            sql = 'ALTER TABLE diary_entries ADD COLUMN emotion_intensity INTEGER;'
            break
          case 'sentiment_score':
            sql = 'ALTER TABLE diary_entries ADD COLUMN sentiment_score INTEGER;'
            break
          case 'risk_level':
            sql = 'ALTER TABLE diary_entries ADD COLUMN risk_level TEXT;'
            break
          case 'ai_insights':
            sql = 'ALTER TABLE diary_entries ADD COLUMN ai_insights TEXT;'
            break
          case 'suggested_actions':
            sql = 'ALTER TABLE diary_entries ADD COLUMN suggested_actions TEXT;'
            break
          case 'plutchik_categories':
            sql = 'ALTER TABLE diary_entries ADD COLUMN plutchik_categories TEXT;'
            break
        }

        if (sql) {
          try {
            await client.query(sql)
            console.log(`✅ Coluna ${column} adicionada com sucesso`)
          } catch (error) {
            console.log(`❌ Erro ao adicionar coluna ${column}:`, error.message)
          }
        }
      }
    } else {
      console.log('\n✅ Todas as colunas de IA já existem!')
    }

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await client.end()
  }
}

checkAndUpdateSchema()