# 🤖 Assistente Clínico com IA - CÁRIS

## Visão Geral

O Assistente Clínico com IA é uma funcionalidade avançada do CÁRIS que fornece insights automáticos, análises de progresso e alertas clínicos para psicólogos, auxiliando no acompanhamento e tratamento de pacientes.

## 🎯 Funcionalidades Implementadas

### ✅ Sistema de IA Clínica
- **Análise Emocional Automática**: Análise de entradas de diário usando IA (OpenAI GPT-4)
- **Detecção de Padrões**: Identificação automática de tendências emocionais e comportamentais
- **Categorização Plutchik**: Classificação de emoções baseada no modelo de Plutchik
- **Avaliação de Risco**: Detecção automática de níveis de risco (baixo, médio, alto, crítico)

### ✅ Análise de Sessões
- **Progresso Terapêutico**: Avaliação do progresso geral do paciente
- **Temas Principais**: Identificação de temas recorrentes nas sessões
- **Tendências Emocionais**: Análise da direção e consistência emocional
- **Oportunidades Terapêuticas**: Sugestões de áreas de foco

### ✅ Sistema de Alertas Clínicos
- **Alertas Automáticos**: Detecção de situações que requerem atenção
- **Classificação por Severidade**: Low, Medium, High, Critical
- **Tipos de Alerta**:
  - Escalação de risco
  - Mudança de padrões
  - Declínio de humor
  - Preocupações de sessão
- **Recomendações**: Sugestões automáticas de ações

### ✅ Relatórios de Progresso Automáticos
- **Relatórios Semanais/Mensais**: Geração automática com IA
- **Score de Progresso**: Métrica calculada (0-100%)
- **Análise de Tendências**: Melhoria, estabilidade ou declínio
- **Conquistas e Desafios**: Identificação automática de pontos principais

### ✅ Dashboard de Insights
- **Interface Intuitiva**: Design responsivo e moderno
- **Seleção de Pacientes**: Análise focada por paciente
- **Visualizações**: Cards, gráficos e badges informativos
- **Navegação por Tabs**: Insights, Alertas, Relatórios, Analytics

## 🔧 Arquitetura Técnica

### Componentes Principais

```
components/ai-clinical/
├── ai-clinical-dashboard.tsx    # Dashboard principal
└── index.ts                     # Exports

lib/
├── ai-analysis.ts              # Funções de análise de IA
└── clinical-ai-service.ts      # Serviço de processamento

app/api/psychologist/
├── ai-insights/               # API para insights
├── clinical-alerts/           # API para alertas
└── progress-reports/         # API para relatórios

app/dashboard/(psychologist)/
└── ai-assistant/             # Página do assistente
```

### Banco de Dados

```sql
-- Tabelas adicionadas
clinical_insights      # Insights gerados por IA
clinical_alerts        # Alertas clínicos automáticos
progress_reports       # Relatórios de progresso

-- Colunas adicionadas em diary_entries
ai_analyzed           # Flag de análise processada
dominant_emotion      # Emoção dominante detectada
emotion_intensity     # Intensidade emocional (0-10)
sentiment_score       # Score de sentimento (-100 a 100)
risk_level           # Nível de risco detectado
ai_insights          # Insights da IA (JSON)
suggested_actions    # Ações sugeridas (JSON)
plutchik_categories  # Categorias Plutchik (JSON)
```

### APIs Implementadas

#### GET `/api/psychologist/ai-insights`
Gera insights de IA para um paciente específico
- **Parâmetros**: `patientId`, `type` (session_analysis, clinical_alerts, progress_report, all)
- **Retorna**: Análises de sessão, alertas detectados, relatório de progresso

#### GET/POST/PATCH `/api/psychologist/clinical-alerts`
Gestão de alertas clínicos
- **GET**: Lista alertas por status, severidade, paciente
- **POST**: Cria novo alerta customizado
- **PATCH**: Reconhece ou resolve alertas

#### GET/POST/PATCH `/api/psychologist/progress-reports`
Gestão de relatórios de progresso
- **GET**: Lista relatórios por paciente e tipo
- **POST**: Gera novo relatório automático
- **PATCH**: Compartilha relatório com paciente

#### POST `/api/admin/ai-processing`
Processamento administrativo de IA
- Analisa entradas de diário não processadas
- Gera insights periódicos
- Detecta e cria alertas automáticos

## 🚀 Como Usar

### Para Psicólogos

1. **Acessar o Assistente IA**
   - No dashboard, clique em "Assistente IA" na navegação
   - Ou use o botão "Assistente IA" no dashboard principal

2. **Selecionar Paciente**
   - Escolha um paciente na lista dropdown
   - O sistema carregará automaticamente os insights

3. **Visualizar Insights**
   - **Tab Insights**: Análise de sessão, tendências, recomendações
   - **Tab Alertas**: Alertas ativos e histórico
   - **Tab Relatórios**: Relatórios gerados e opções de compartilhamento
   - **Tab Analytics**: Métricas avançadas (em desenvolvimento)

4. **Gerenciar Alertas**
   - Reconhecer alertas visualizados
   - Resolver alertas atendidos
   - Ver recomendações específicas

5. **Gerar Relatórios**
   - Criar relatórios semanais ou mensais
   - Compartilhar com pacientes quando apropriado
   - Exportar para PDF (planejado)

### Para Administradores

1. **Processamento Manual**
   ```bash
   curl -X POST /api/admin/ai-processing
   ```

2. **Configuração de Processamento Automático**
   - Configurar cron job ou scheduler
   - Recomendação: Executar a cada 4-6 horas

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Obrigatório para funcionalidade completa
OPENAI_API_KEY=sua_chave_openai

# Opcional - fallback para Claude
ANTHROPIC_API_KEY=sua_chave_anthropic
```

### Migrações de Banco

```bash
# Aplicar migration das tabelas de IA
npm run db:migrate

# Ou executar manualmente
psql -d sua_database -f scripts/0004_add_ai_clinical_tables.sql
```

## 🧪 Testes

### Teste das Funcionalidades de IA
```bash
node scripts/test-ai-clinical.js
```

### Teste Manual
1. Criar alguns pacientes de teste
2. Adicionar entradas de diário variadas
3. Executar processamento de IA
4. Verificar insights gerados no dashboard

## 📊 Métricas e Performance

### Processamento de IA
- **Batch Size**: 50 entradas por execução
- **Rate Limiting**: Respeita limites da OpenAI API
- **Fallback**: Responses padrão se API indisponível
- **Caching**: Resultados salvos no banco

### Performance
- **Indexes**: Otimizados para consultas frequentes
- **Lazy Loading**: Componentes carregam sob demanda
- **Error Handling**: Graceful degradation

## 🛠️ Desenvolvimento

### Extensões Planejadas
- [ ] Analytics dashboard avançado
- [ ] Exportação de relatórios em PDF
- [ ] Integração com calendário para alertas
- [ ] Notificações push para alertas críticos
- [ ] Machine learning personalizado
- [ ] Comparação entre pacientes (anonimizada)

### Contribuindo
1. Fork o repositório
2. Crie uma branch para sua feature
3. Implemente seguindo os padrões existentes
4. Adicione testes quando aplicável
5. Submeta um Pull Request

## 🔒 Segurança e Privacidade

### Proteções Implementadas
- ✅ Verificação de autorização em todas as APIs
- ✅ Dados de IA criptografados no banco
- ✅ Logs não incluem conteúdo sensível
- ✅ Rate limiting nas chamadas de IA

### Conformidade
- 🔄 **LGPD**: Implementação em andamento
- 🔄 **HIPAA**: Auditoria planejada
- ✅ **Ética de IA**: Transparência nos insights gerados

## 📞 Suporte

Para questões sobre o Assistente Clínico IA:
1. Consulte a documentação
2. Execute os testes de verificação
3. Verifique logs de erro
4. Contate a equipe de desenvolvimento

---

*Desenvolvido com ❤️ para melhorar o cuidado em saúde mental*