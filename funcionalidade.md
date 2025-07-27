# 🧠 CÁRIS – Plataforma Inteligente de Apoio Psicoterapêutico

> **Versão:** 1.0  
> **Data:** 27/07/2025  
> **Documento Técnico Funcional – Para uso por agentes de IA, MCPs e Desenvolvedores**

---

## 🌟 Visão Geral

O **CÁRIS** é uma plataforma digital de apoio psicoterapêutico, construída com foco em inteligência emocional, automação clínica, análise assistida por IA e experiências gamificadas. A solução atende desde psicólogos autônomos até clínicas com múltiplos profissionais, entregando segurança, personalização e insights preditivos para acompanhamento emocional de pacientes.

---

## 🧩 Funcionalidades Detalhadas

### 📔 Diário Emocional com IA

- Registro diário multimodal (texto, áudio, foto)
- Análise de sentimento por NLP (IA embutida com fine-tuning para linguagem emocional)
- Alertas automáticos de risco psicológico baseados em comportamento e semântica
- Tags personalizadas por terapeuta
- Exportação periódica para PDF, JSON ou planilha
- Modo “reflexão guiada” com IA interativa
- Detecção de variações abruptas de humor

---

### 🧭 Mapa Emocional Interativo

- Linha do tempo emocional com eventos marcados (sessões, tarefas, SOS, etc)
- Categorização Plutchik + emoções compostas
- Visualização interativa (SVG ou WebGL)
- Gráfico de radar e mapa de calor por semana/mês
- Insights preditivos baseados em IA contextual e aprendizagem contínua
- Correlação cruzada com atividades, tarefas, qualidade do sono e meditações
- Exportação de snapshots para relatórios clínicos

---

### 🗓️ Agenda Integrada

- Sincronização bidirecional com Google Calendar, Outlook, iCal
- Integração com Zapier e WhatsApp API
- Lembretes automatizados por e-mail, push e WhatsApp
- Reagendamento por parte do paciente com política customizável
- Relatório de assiduidade e pontualidade por paciente
- Link de pagamento por sessão via Mercado Pago / Stripe

---

### 🎥 Videoterapia Nativa

- WebRTC com criptografia de ponta (DTLS + SRTP)
- Compartilhamento de tela com redator integrado
- Bloco de anotações por sessão (visível apenas ao terapeuta)
- Modo “tela escura” para foco sensorial
- Gravação local e em nuvem com consentimento digital
- Plano B com integração via Zoom / Meet

---

### 📁 Gestão de Pacientes

- Prontuário eletrônico completo (evolução, CID, histórico de sessões)
- Upload de arquivos, fotos e relatórios médicos
- Campos personalizáveis por abordagem terapêutica
- Filtros por faixa etária, diagnóstico, sentimento dominante
- Permissões multiusuário (secretária, assistente, estagiário)
- Log de alterações com auditoria

---

### 💬 Chat Terapêutico Seguro

- Comunicação criptografada ponta-a-ponta (AES-256, JWT)
- Envio de áudios, arquivos e imagens
- Modo IA: pré-filtragem de crises, alertas ao terapeuta
- Histórico completo com busca semântica
- Mensagens programadas (ex: lembrete de tarefa)
- Política de resposta configurável por terapeuta

---

### 🚨 Sistema SOS de Crise

- Botão de emergência no app e na web
- Técnicas de regulação imediata (vídeos, áudios, respiração)
- IA emocional para acolhimento em crise (ChatGPT com prompt clínico)
- Alertas simultâneos para terapeuta e contatos autorizados
- Plano de segurança com rotinas personalizadas por paciente
- Log de uso de emergência

---

### 📚 Prescrição de Tarefas

- Biblioteca com +200 tarefas validadas por psicólogos
- Tarefas por objetivo terapêutico (TCC, ACT, DBT, Sistêmica)
- Integração com gamificação e cronograma
- Modo “acompanhamento ativo” com notificações diárias
- Exportação de progresso para o prontuário
- Opção de envio por WhatsApp e e-mail

---

### 🧘 Meditações Guiadas

- Biblioteca com +100 práticas divididas por foco (sono, ansiedade, foco)
- Áudios narrados por profissionais da psicologia
- Modo “trilha semanal” com progresso e lembretes
- Personalização de sugestões por IA (com base no humor e comportamento)
- Feedback do paciente por emoji, nota e comentário

---

### 🤖 IA de Suporte Clínico

- Assistente terapêutico com base em LLM (OpenAI, Mistral, Claude)
- Sugestões de técnica com base na sessão anterior e perfil do paciente
- Detecção de estagnação, recaída ou melhora
- Logs explicativos com justificativa de cada sugestão
- Suporte a múltiplos modelos (plugável via API)

---

### 🔐 Segurança e LGPD

- Criptografia AES-256 + HTTPS (TLS 1.3)
- Política de consentimento granular (por sessão, áudio, prontuário)
- Log de auditoria completo com rastreabilidade
- Exportação de dados sob solicitação (portabilidade LGPD)
- Servidores compatíveis com GDPR e HIPAA

---

### 🎮 Gamificação Terapêutica

- Sistema de pontos, XP e selos de evolução emocional
- Ranking interno do paciente com ele mesmo
- Desafios diários, semanais e mensais
- Recompensas virtuais (ex: “Medalha da Coragem”)
- Feedback visual e motivacional após tarefas e sessões

---

## 💼 Planos e Licenciamento

### 🔹 Plano Essencial – R$ 79/mês
- Até 10 pacientes ativos
- Diário e mapa básico
- Videoterapia integrada
- Prontuário completo
- Suporte por e-mail
- Backup mensal

### 🔸 Plano Profissional – R$ 129/mês
- Tudo do Essencial +
- Pacientes ilimitados
- Mapa emocional com IA
- Gamificação completa
- Relatórios preditivos
- Prescrição de tarefas
- Suporte via chat

### 🔷 Plano Clínica – Contato
- Tudo do Profissional +
- Múltiplos terapeutas
- Dashboard administrativo
- White-label
- Gerente de conta
- Faturamento por CNPJ
- Suporte WhatsApp e onboarding dedicado

---

## 🧠 Roadmap (2025+)

- Integração com wearables (MiBand, Apple Watch)
- Análise emocional facial em tempo real
- Plugins com sensores EMG para biofeedback
- Prescrição automatizada via IA com aprovação
- Comunidade segura de pacientes
- Protocolos integrados com universidades parceiras

---

## 🧰 Stack Técnica

- **Backend:** Python (FastAPI/Django), PostgreSQL, Redis, Celery
- **Frontend:** React + Tailwind + Shadcn UI
- **Infra:** Docker, Render/Vercel, Supabase
- **IA:** OpenAI API, Whisper, GPT-4o, Claude, HuggingFace, NLP local
- **Outros:** OAuth2, WebRTC, JWT, SMTP, Zapier

---

*Este documento pode ser adaptado como README.md, documentação oficial do projeto ou onboarding de novos membros da equipe técnica, agentes MCP ou investidores.*

