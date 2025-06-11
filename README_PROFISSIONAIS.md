# 🏥 CÁRIS B2B2C - Profissionais da Saúde

## Visão Geral

A funcionalidade **B2B2C** do CÁRIS permite que profissionais da saúde (psicólogos, terapeutas, coaches, etc.) tenham acesso controlado aos dados dos seus pacientes, mediante consentimento explícito.

## 🚀 Configuração Inicial

### 1. Execute o banco de dados padrão
```bash
python create_demo_db.py
```

### 2. Adicione dados de profissionais demo
```bash
python create_demo_professional.py
```

### 3. Execute a aplicação
```bash
python app.py
```

## 👨‍⚕️ Acesso para Profissionais

### URLs Principais
- **Login:** http://localhost:5000/professional/login
- **Registro:** http://localhost:5000/professional/registro  
- **Painel:** http://localhost:5000/professional/painel

### Credenciais Demo
```
Email: ana.silva@demo.com
Senha: demo123

Email: carlos.mendes@demo.com  
Senha: demo123

Email: maria.coach@demo.com
Senha: demo123
```

## 🔗 Como Funciona o Vínculo

### 1. Profissional convida paciente
- Acessa `/professional/convidar-paciente`
- Insere email do paciente (deve estar registrado no CÁRIS)
- Sistema gera código único

### 2. Paciente aceita convite
- Acessa link com código ou usa `/professional/aceitar-convite/{CODIGO}`
- Escolhe nível de consentimento:
  - **Completo:** Acesso total aos dados
  - **Limitado:** Apenas últimas 2 semanas

### 3. Profissional acessa dados
- Vê pacientes no painel principal
- Acessa análises detalhadas
- Exporta relatórios (em desenvolvimento)

## 🛡️ Controles de Privacidade

### Permissões Granulares
- ✅ **Emoções:** Ver estados emocionais registrados
- ✅ **Ciclos:** Acessar dados dos 4 ciclos (Criar, Cuidar, Crescer, Curar)
- ✅ **Histórico:** Completo vs. últimas 2 semanas
- ✅ **Rituais:** Informações sobre práticas (opcional)

### Controle do Paciente
- Pode revogar acesso a qualquer momento
- Altera permissões quando desejar
- Histórico completo de consentimentos
- Reativação posterior possível

## 📊 Funcionalidades do Painel Profissional

### Dashboard Principal
- Estatísticas agregadas de todos os pacientes
- Gráficos de emoções e ciclos dominantes
- Cards individuais por paciente
- Métricas de atividade recente

### Detalhes do Paciente  
- Linha do tempo de entradas do diário
- Análises visuais (Chart.js)
- Filtros por emoção e ciclo
- Estatísticas personalizadas

### Gestão de Vínculos
- Lista de pacientes ativos
- Status de consentimentos
- Opção de revogar acesso próprio
- Códigos de convite gerados

## 🏗️ Estrutura Técnica

### Novos Modelos
```python
# models/professional.py
- ProfissionalSaude
- VinculoProfissionalPaciente  
- ConsentimentoPaciente
```

### Rotas Implementadas
```python
# routes/professional.py
- /professional/login
- /professional/registro
- /professional/painel
- /professional/convidar-paciente
- /professional/paciente/<id>
- /professional/aceitar-convite/<codigo>
- /professional/meus-profissionais (para pacientes)
```

### Templates Criados
```
templates/professional/
├── base_professional.html      # Layout base
├── login.html                  # Login profissionais
├── register.html               # Registro profissionais
├── painel.html                # Dashboard principal
├── convidar_paciente.html     # Formulário de convite
├── paciente_detalhes.html     # Análises do paciente
├── aceitar_convite.html       # Aceitar convite (pacientes)
└── meus_profissionais.html    # Gerenciar profissionais (pacientes)
```

## 🔐 Segurança Implementada

### Autenticação Dupla
- Flask-Login adaptado para User + ProfissionalSaude
- Senhas hasheadas com Werkzeug
- Sessões separadas e controláveis

### Autorização Granular
- Verificação de permissões em cada acesso
- Middleware de verificação de vínculos ativos
- Logs de auditoria para compliance

### Privacidade LGPD
- Consentimento explícito e documentado
- Revogação simples e imediata
- Transparência total sobre dados acessados
- Histórico de todas as ações

## 🚧 Próximos Passos

### Funcionalidades Planejadas
- [ ] Exportação de relatórios PDF
- [ ] Chat/mensagens entre profissional e paciente
- [ ] Notificações push para novos registros
- [ ] Analytics avançados com ML
- [ ] Integração com agenda/consultas
- [ ] APIs REST para integração externa

### Melhorias Técnicas
- [ ] Testes unitários e integração
- [ ] Rate limiting nas APIs
- [ ] Cache Redis para performance
- [ ] Deployment automatizado
- [ ] Monitoramento e alertas

## 📞 Suporte

Para dúvidas técnicas ou comerciais:
- **Email:** kallebyevangelho03@gmail.com
- **Documentação:** Este arquivo
- **Issues:** GitHub do projeto

---

**CÁRIS B2B2C** - Conectando profissionais e pacientes com segurança e transparência. 