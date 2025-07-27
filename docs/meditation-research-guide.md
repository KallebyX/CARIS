# Guia Prático: Pesquisa e Integração de Áudios de Meditação em Português

## 🎯 Objetivo

Este guia fornece um roadmap prático para pesquisar, validar e integrar áudios de meditação em português brasileiro na plataforma CÁRIS, seguindo as melhores práticas de compliance legal e qualidade técnica.

## 📋 Lista de Verificação Rápida

### Para cada áudio encontrado:
- [ ] **Licença verificada** (CC0, CC BY, CC BY-SA, ou domínio público)
- [ ] **Qualidade técnica validada** (áudio limpo, boa qualidade)
- [ ] **Idioma apropriado** (português brasileiro claro)
- [ ] **Conteúdo terapêutico** (baseado em evidências, sem viés religioso)
- [ ] **Metadados completos** (título, instrutor, duração, categoria)
- [ ] **Documentação legal** (fonte, atribuição, termos de uso)

## 🔍 Roteiro de Pesquisa Semanal

### Semana 1: Fontes Institucionais
1. **Universidades Públicas**
   - UNIFESP - Centro de Mindfulness
   - USP - Instituto de Psiquiatria  
   - UFRJ - Núcleo de Estudos em Mindfulness
   - UFMG - Departamento de Psicologia

2. **Ações Práticas**:
   - Enviar emails para coordenadores
   - Explicar projeto de saúde mental
   - Solicitar material educativo livre
   - Propor parcerias acadêmicas

### Semana 2: Archive.org e Domínio Público
1. **Buscar por termos**:
   - "meditação português"
   - "mindfulness brasil"
   - "relaxamento português"
   - "respiração consciente"

2. **Filtros importantes**:
   - Idioma: Portuguese
   - Licença: Creative Commons
   - Tipo: Audio
   - Duração: 5-30 minutos

### Semana 3: Freesound.org e Sons Ambientais
1. **Categorias prioritárias**:
   - Natureza (chuva, oceano, floresta)
   - Instrumentos (sinos tibetanos, tigelas)
   - Frequências binaurais
   - Música instrumental relaxante

2. **Verificação obrigatória**:
   - Licença Creative Commons
   - Qualidade mínima 128kbps
   - Sem ruídos de fundo

### Semana 4: Criação de Conteúdo Próprio
1. **Parcerias com terapeutas**:
   - Psicólogos especialistas em mindfulness
   - Instrutores certificados de meditação
   - Professores de yoga experientes

2. **Produção local**:
   - Gravação em estúdio caseiro
   - Roteiros baseados em evidências
   - Revisão por psicólogo clínico

## 🎧 Checklist de Qualidade Técnica

### Análise de Áudio
```bash
# Verificar qualidade usando FFmpeg
ffprobe audio.mp3 2>&1 | grep -E "(Duration|bitrate|Hz)"

# Converter se necessário
ffmpeg -i input.wav -b:a 128k -ar 44100 output.mp3
```

### Critérios de Aceitação
- **Formato**: MP3 ou OGG
- **Bitrate**: Mínimo 128kbps
- **Sample Rate**: 44.1kHz ou superior
- **Duração**: 5-30 minutos
- **Volume**: Normalizado (-23 LUFS)
- **Ruído**: SNR > 60dB

## 📄 Template de Documentação Legal

Para cada áudio adicionado, criar arquivo metadata:

```json
{
  "id": "audio_unique_id",
  "title": "Título da Meditação",
  "description": "Descrição detalhada",
  "category": "ansiedade|sono|mindfulness|etc",
  "duration": 600,
  "instructor": "Nome do Instrutor",
  "source": {
    "url": "https://fonte-original.com/audio",
    "platform": "Archive.org",
    "date_accessed": "2025-01-XX"
  },
  "license": {
    "type": "CC BY-SA 4.0",
    "attribution": "Autor Original",
    "commercial_use": true,
    "modifications_allowed": true,
    "share_alike": true
  },
  "technical": {
    "format": "mp3",
    "bitrate": 128,
    "sample_rate": 44100,
    "file_size": 4800000
  },
  "validation": {
    "quality_checked": true,
    "legal_approved": true,
    "content_reviewed": true,
    "date_added": "2025-01-XX"
  }
}
```

## 🔧 Scripts de Integração

### 1. Validador de Áudio
```bash
#!/bin/bash
# validate-audio.sh

audio_file=$1
echo "Validando: $audio_file"

# Verificar formato
if [[ $audio_file == *.mp3 ]] || [[ $audio_file == *.ogg ]]; then
    echo "✓ Formato válido"
else
    echo "❌ Formato inválido - use MP3 ou OGG"
    exit 1
fi

# Verificar qualidade
bitrate=$(ffprobe -v quiet -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 "$audio_file")
if [ $bitrate -ge 128000 ]; then
    echo "✓ Qualidade adequada ($bitrate bps)"
else
    echo "❌ Qualidade baixa - mínimo 128kbps"
    exit 1
fi

echo "✅ Áudio validado com sucesso!"
```

### 2. Importador de Metadados
```javascript
// import-audio.js
const fs = require('fs')
const path = require('path')

async function importAudio(metadataFile) {
  const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'))
  
  // Validar campos obrigatórios
  const required = ['title', 'category', 'instructor', 'license']
  for (const field of required) {
    if (!metadata[field]) {
      throw new Error(`Campo obrigatório ausente: ${field}`)
    }
  }
  
  // Criar entrada no banco
  const audioData = {
    title: metadata.title,
    description: metadata.description,
    categoryId: metadata.category,
    duration: metadata.duration,
    instructor: metadata.instructor,
    audioUrl: metadata.source.url,
    license: metadata.license.type,
    attribution: metadata.license.attribution,
    // ... outros campos
  }
  
  console.log('✅ Pronto para importar:', audioData.title)
  return audioData
}
```

## 📊 Métricas de Progresso

### Metas por Categoria (mínimo):
- **Ansiedade**: 10 áudios
- **Sono**: 8 áudios  
- **Mindfulness**: 12 áudios
- **Autocompaixão**: 6 áudios
- **Estresse**: 8 áudios
- **Respiração**: 6 áudios
- **Relaxamento**: 8 áudios
- **Foco**: 6 áudios

### **Total mínimo**: 64 áudios únicos

### Indicadores de Qualidade:
- 100% com licença válida
- 95% com qualidade técnica adequada
- 90% avaliação positiva de terapeutas
- 85% satisfação dos usuários

## 🤝 Templates de Contato

### Email para Universidades
```
Assunto: Parceria Acadêmica - Plataforma de Saúde Mental CÁRIS

Prezado(a) Prof. [Nome],

Sou desenvolvedor da plataforma CÁRIS, um sistema de saúde mental que conecta pacientes e psicólogos no Brasil. Estamos implementando um módulo de meditação guiada em português e gostaríamos de estabelecer uma parceria acadêmica.

Objetivo: Integrar conteúdo educativo de mindfulness e meditação baseado em evidências científicas.

Benefícios da parceria:
- Visibilidade para pesquisas da universidade
- Impacto social em saúde mental
- Dados anonimizados para pesquisa
- Créditos e atribuição apropriada

Seria possível agendar uma conversa?

Atenciosamente,
[Nome]
CÁRIS Mental Health Platform
```

### Email para Content Creators
```
Assunto: Convite para Contribuir - Plataforma de Saúde Mental

Olá [Nome],

Descobri seu trabalho com meditação/mindfulness e fiquei impressionado com a qualidade do conteúdo.

Estamos desenvolvendo uma biblioteca gratuita de meditações em português para uma plataforma de saúde mental. Gostaria de convidar você para contribuir com alguns áudios.

Oferecemos:
- Atribuição completa do seu trabalho
- Exposição para milhares de usuários
- Contribuição para saúde mental no Brasil
- Possibilidade de parceria contínua

Tem interesse em conversar?

Abraços,
[Nome]
```

## ⚖️ Compliance Legal Essencial

### Checklist de Verificação Legal:
- [ ] **Licença explicitamente declarada**
- [ ] **Uso comercial permitido**
- [ ] **Atribuição documentada**
- [ ] **Termos de uso arquivados**
- [ ] **Prova de permissão (se necessário)**
- [ ] **Backup da documentação legal**

### Licenças Aceitas:
1. **Creative Commons Zero (CC0)** - Ideal, sem restrições
2. **Creative Commons Attribution (CC BY)** - Requer atribuição
3. **Creative Commons Attribution-ShareAlike (CC BY-SA)** - Requer atribuição e compartilhamento
4. **Domínio Público** - Sem restrições
5. **Licenças educacionais específicas** (caso a caso)

### Licenças NÃO Aceitas:
- Creative Commons NonCommercial (CC BY-NC)
- Creative Commons NoDerivatives (CC BY-ND)
- Todos os direitos reservados
- Licenças proprietárias sem permissão explícita

## 🚀 Cronograma de Implementação

### Fase 1: Infraestrutura (Concluída ✅)
- [x] Schema do banco de dados
- [x] APIs de gerenciamento
- [x] Interface administrativa
- [x] Documentação legal

### Fase 2: Conteúdo Inicial (Próximas 2 semanas)
- [ ] 20 áudios por categoria prioritária
- [ ] Validação legal completa
- [ ] Testes de qualidade
- [ ] Seed data no banco

### Fase 3: Refinamento (Próximas 2 semanas)
- [ ] Player aprimorado
- [ ] Sistema de recomendações
- [ ] Analytics de uso
- [ ] Feedback de usuários

### Fase 4: Expansão (1 mês)
- [ ] Parcerias estabelecidas
- [ ] Conteúdo adicional
- [ ] Trilhas estruturadas
- [ ] Compliance final

---

**📞 Precisa de ajuda?**
- Documente todas as decisões legais
- Mantenha registro de comunicações
- Priorize qualidade sobre quantidade
- Teste com usuários reais

**🎯 Lembre-se**: O objetivo é criar uma biblioteca sólida, legal e terapeuticamente eficaz de meditações em português brasileiro para apoiar a saúde mental dos usuários da plataforma CÁRIS.