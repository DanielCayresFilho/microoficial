# 🚀 Meta-MicroService - WhatsApp Business API

<div align="center">

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Material-UI](https://img.shields.io/badge/Material--UI-0081CB?style=for-the-badge&logo=material-ui&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

**Sistema completo de atendimento ao cliente via WhatsApp Business API com relatórios analíticos**

[Funcionalidades](#-funcionalidades) • [Relatórios](#-relatórios-analíticos) • [Instalação](#-instalação) • [Uso](#-uso) • [API](#-api) • [Arquitetura](#-arquitetura)

</div>

---

## 📋 Sobre o Projeto

Sistema fullstack completo para gerenciamento de atendimento ao cliente via WhatsApp Business API. Integrado com microserviço backend NestJS que gerencia campanhas, conversas, operadores, relatórios analíticos e distribuição inteligente de mensagens em tempo real.

O sistema permite que operadores gerenciem múltiplas conversas simultaneamente, enviem campanhas em massa via CSV, controlem presença online/offline, apliquem regras de negócio como CPC (Contato Positivo com Cliente) e repescagem inteligente, além de gerar relatórios detalhados de produtividade e conversas.

### 🎯 **Destaques v2.0**

<div align="center">

| 🚀 Novidade | 📝 Descrição |
|:---:|:---|
| 📊 **Central de Relatórios** | Sistema completo de relatórios analíticos com 6 tipos de relatórios diferentes |
| 👥 **Relatório de Operadores** | Análise de produtividade com métricas detalhadas de desempenho |
| 💬 **Relatório de Conversas** | Exportação completa de conversas com 16 campos de dados |
| 📈 **Produtividade** | Taxa de resolução, tempo médio e métricas avançadas |
| 📥 **Exportação CSV** | Download direto de relatórios em formato CSV |
| 🎨 **Interface Moderna** | Cards interativos com design responsivo e intuitivo |
| 🔌 **API REST** | 5 novos endpoints para integração externa |

</div>

---

## ✨ Funcionalidades

### 🎯 **Gestão de Conversas**
- ✅ Visualização de conversas em tempo real
- ✅ Histórico completo de mensagens
- ✅ Atribuição automática de conversas a operadores
- ✅ Filtros por status, operador e data
- ✅ Indicadores de mensagens não lidas
- ✅ Badge de status CPC nas conversas

### 💬 **Envio de Mensagens**
- ✅ Envio de mensagens de texto
- ✅ Suporte a preview de URLs
- ✅ Atalho de teclado (Ctrl+Enter)
- ✅ Validação de elegibilidade em tempo real
- ✅ Feedback visual de bloqueios e limites
- ✅ Auto-scroll para última mensagem

### 📊 **Campanhas em Massa**
- ✅ Upload de arquivos CSV
- ✅ Envio de templates personalizados
- ✅ Acompanhamento de status da campanha
- ✅ Controle de rate limiting
- ✅ Estatísticas de entrega

### 👥 **Gestão de Operadores**
- ✅ Sistema de presença online/offline
- ✅ Heartbeat automático para manter sessão ativa
- ✅ Distribuição inteligente de conversas
- ✅ Controle de capacidade máxima por operador
- ✅ Sessões com expiração automática (12 horas)

### 🏷️ **Sistema de Tabulação**
- ✅ Categorização de conversas
- ✅ Notas obrigatórias por categoria
- ✅ Fechamento de conversas com tabulação
- ✅ Histórico de tabulações

### 🎯 **CPC (Contato Positivo com Cliente)**
- ✅ Marcação de números como CPC
- ✅ Bloqueio automático de campanhas para números CPC (24h)
- ✅ Registro de eventos CPC
- ✅ Visualização de status CPC nas conversas

### 🔄 **Sistema de Repescagem**
- ✅ **Campanhas**: Limite de 1 envio por número a cada 24 horas
- ✅ **Manual**: Limite de 2 tentativas por operador a cada 24 horas
- ✅ Intervalo mínimo de 3 horas entre repescagens manuais
- ✅ Liberação automática quando cliente responde
- ✅ Mensagens amigáveis de bloqueio

### 🔌 **Tempo Real**
- ✅ WebSocket para atualizações instantâneas
- ✅ Recebimento automático de novas mensagens
- ✅ Notificações de novas conversas
- ✅ Atualização automática de status
- ✅ Reconexão automática em caso de queda

### 🔐 **Autenticação e Segurança**
- ✅ Autenticação via API Key
- ✅ Integração com contexto de autenticação
- ✅ Suporte a múltiplas empresas
- ✅ Isolamento de dados por operador

### 📊 **Relatórios Analíticos**
- ✅ **Relatório de Operadores**: Produtividade, conversas atendidas, mensagens enviadas
- ✅ **Relatório de Conversas**: Detalhamento completo de todas as conversas
- ✅ **Relatório de Templates**: Análise de templates utilizados em campanhas
- ✅ **Relatório de Disparos**: Métricas de campanhas e entregas
- ✅ **Relatório CSV**: Exportação completa de dados
- ✅ **Dados Transacionados**: Histórico detalhado de transações
- ✅ **Filtros por período**: Seleção de data inicial e final
- ✅ **Exportação em CSV**: Download direto dos relatórios
- ✅ **Interface moderna**: Cards interativos com tooltips informativos

---

## 📊 Relatórios Analíticos

O sistema possui uma **Central de Relatórios** completa com diversos tipos de análises:

### 📈 **Relatório de Operadores**

Análise detalhada da produtividade dos operadores:

**Métricas disponíveis:**
- 👤 Nome e email do operador
- 💬 Total de conversas atendidas
- ✅ Conversas abertas e fechadas
- 📨 Total de mensagens enviadas
- 🏷️ Conversas marcadas como CPC
- 📊 Taxa de resolução

**Campos CSV exportados:**
```csv
Nome do Operador, Email, Total de Conversas, Conversas Abertas, 
Conversas Fechadas, Total de Mensagens, Conversas com CPC
```

### 💬 **Relatório de Conversas**

Informações completas sobre todas as conversas:

**Dados inclusos:**
- 🆔 ID da conversa
- 👤 Nome, telefone, CPF e contrato do cliente
- 🎧 Operador responsável
- 📊 Status da conversa (Aberta/Fechada)
- 🏷️ Tabulação aplicada
- 💬 Contadores de mensagens (total, recebidas, enviadas)
- 🎯 Status de CPC
- 📅 Datas de abertura e fechamento
- 📝 Observações do atendimento

**Campos CSV exportados:**
```csv
ID Conversa, Nome Cliente, Telefone, Contrato, CPF, Operador, 
Email Operador, Status, Tabulação, Total Mensagens, 
Mensagens Recebidas, Mensagens Enviadas, CPC Marcado, 
Data Abertura, Data Fechamento, Observações
```

### 📄 **Relatório de Templates**

Análise dos templates utilizados em campanhas:
- 📝 Nome e conteúdo do template
- 📊 Quantidade de disparos
- ✅ Estatísticas de envio, confirmação e leitura
- 🔄 Taxa de interação

### 🚀 **Relatório de Disparos**

Métricas detalhadas de campanhas:
- 📤 Campanhas executadas
- 📊 Listas importadas
- ✅ Mensagens enviadas e entregues
- 📅 Datas de criação e disparo
- 📈 Status das campanhas

### 📋 **Relatório CSV Geral**

Exportação completa de dados com:
- 🏢 Informações da carteira
- 👤 Dados completos do cliente
- 👨‍💼 Informações do operador
- 🏷️ Tabulações aplicadas
- 📊 Status e métricas de mensagens

### 💾 **Dados Transacionados**

Histórico detalhado de transações:
- 🎫 ID do ticket e origem
- 📝 Template utilizado
- 📊 Status e tabulações
- 📱 Dispositivos de envio e recebimento
- 📈 Métricas de interação

### 🎨 **Interface dos Relatórios**

A Central de Relatórios possui:
- 🎴 Cards modernos e interativos para cada tipo de relatório
- 🎨 Cores distintas por categoria (verde, azul, laranja, roxo, vermelho, ciano, índigo)
- 💡 Tooltips informativos explicando cada relatório
- 📅 Filtros de período flexíveis (data de/até)
- 📦 Seleção múltipla de carteiras (para usuários master)
- ⚡ Loading visual durante geração
- ✅ Notificações de sucesso/erro
- 📥 Download automático de arquivos CSV

---

## 🛠️ Stack Tecnológico

### Frontend
- **React** - Biblioteca JavaScript para interfaces
- **Material-UI v4** - Biblioteca de componentes UI
- **Socket.IO Client** - Comunicação em tempo real
- **Axios** - Cliente HTTP
- **React Router** - Roteamento
- **React Toastify** - Notificações
- **date-fns** - Manipulação de datas

### Backend (Microserviço)
- **NestJS** - Framework Node.js
- **PostgreSQL** - Banco de dados
- **Prisma** - ORM
- **BullMQ** - Gerenciamento de filas
- **Redis** - Cache e filas
- **Socket.IO** - WebSockets
- **WhatsApp Business API v21.0** - API oficial do WhatsApp

---

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Acesso ao microserviço backend (vend.covenos.com.br)
- API Key do microserviço

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd critic
```

### 2. Instale as dependências
```bash
npm install
# ou
yarn install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
REACT_APP_WHATSAPP_API_BASE_URL=https://vend.covenos.com.br/api
REACT_APP_WHATSAPP_API_KEY=sua_api_key_aqui
REACT_APP_WHATSAPP_SOCKET_URL=https://vend.covenos.com.br
```

### 4. Inicie o servidor de desenvolvimento
```bash
npm start
# ou
yarn start
```

A aplicação estará disponível em `http://localhost:3000`

---

## 🚀 Uso

### 1. **Conexão de Contas WhatsApp**
Acesse a página de **Conexões** para:
- Conectar contas do WhatsApp Business
- Adicionar números de telefone
- Configurar templates
- Gerenciar contas e números

### 2. **Ficar Online como Operador**
1. Acesse a página de **Tickets**
2. Clique em **"Ficar online"**
3. Selecione o número/queue/segmentos (se necessário)
4. O sistema iniciará o heartbeat automático
5. Você começará a receber conversas automaticamente

### 3. **Enviar Campanhas**
1. Acesse a página de **Agendamento**
2. Selecione ou crie uma campanha
3. Faça upload do arquivo CSV
   - O arquivo **deve conter exatamente** as colunas `telefone`, `nome`, `contrato`, `CPF`
     (nessa ordem). Esses dados alimentam a tabela `campaign_contacts` e são exibidos aos operadores.
4. Configure o template
5. Inicie a campanha
6. Acompanhe o progresso em tempo real

### 4. **Gerenciar Conversas**
1. Visualize conversas na lista lateral
2. Selecione uma conversa para ver o histórico
3. Envie mensagens usando o campo de texto
4. Marque como CPC se necessário
5. Encerre a conversa com tabulação

### 5. **Marcar CPC**
1. Abra a conversa
2. Role até a seção "Encerrar conversa"
3. Clique em **"Marcar como CPC"**
4. O número será bloqueado de campanhas por 24 horas

---

## 🏗️ Arquitetura

### Estrutura de Pastas

#### **Frontend**
```
archives_front/
├── Connections.js              # Gestão de contas e números
├── Tickets.js                  # Console do operador (interface WhatsApp)
├── TicketsAdvanced.js          # Lista de conversas
├── schedule.js                 # Campanhas CSV
├── tags.js                     # Tabulações
├── relatories.js               # Central de Relatórios ⭐ NOVO
├── queues.js                   # Filas de atendimento
└── microserviceApi.js          # Cliente HTTP do microserviço
```

#### **Backend**
```
src/
├── accounts/                   # Gestão de contas WhatsApp
├── campaigns/                  # Campanhas em massa
├── conversations/              # Conversas e mensagens
├── operators/                  # Operadores e presença
├── reports/                    # Relatórios analíticos ⭐ NOVO
│   ├── reports.controller.ts
│   ├── reports.service.ts
│   └── reports.module.ts
├── tabulations/                # Tabulações
├── templates/                  # Templates WhatsApp
├── webhooks/                   # Webhooks Meta API
├── whatsapp/                   # Integração WhatsApp Business API
├── queues/                     # Filas BullMQ
│   └── processors/             # Workers para processamento
├── events/                     # WebSocket (Socket.IO)
├── prisma/                     # ORM e migrações
└── scheduler/                  # Tarefas agendadas

prisma/
├── schema.prisma               # Schema do banco de dados
└── migrations/                 # Migrações SQL

docs/
├── API_ENDPOINTS.md            # Documentação de endpoints
├── API_KEY_AUTH.md             # Autenticação
├── REPORTS_API.md              # API de Relatórios ⭐ NOVO
└── SECURITY_AUTHENTICATION.md  # Segurança
```

### Fluxo de Dados

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │  WebSocket   │ ◄─────► │  Backend    │
│   (React)   │         │  (Socket.IO) │         │  (NestJS)   │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                              │
       │ HTTP (Axios)                                 │
       │                                              │
       ▼                                              ▼
┌─────────────┐                              ┌─────────────┐
│ microservice│                              │  WhatsApp   │
│     API     │─────────────────────────────►│  Business   │
│             │                              │     API     │
└─────────────┘                              └─────────────┘
```

### Componentes Principais

#### **Tickets.js**
Console principal do operador:
- Gerencia presença online/offline
- Exibe conversa atual
- Envia mensagens
- Controla elegibilidade de envio
- Gerencia CPC

#### **TicketsAdvanced.js**
Lista de conversas:
- Exibe todas as conversas do operador
- Filtra por status
- Indicadores de não lidas
- Badges de status (CPC, etc.)

#### **Connection.js**
Gestão de conexões:
- Conecta contas WhatsApp
- Adiciona números
- Gera templates

#### **Schedule.js**
Campanhas:
- Upload CSV
- Configuração de templates
- Início/pausa/exclusão de campanhas

---

## 📐 Regras de Negócio

### 🔄 **Repescagem (Retries)**

#### **Campanhas**
- ✅ **Limite**: 1 envio por número a cada 24 horas
- ✅ **Registro**: Todas as campanhas são registradas em `campaign_contacts`
- ✅ **Verificação**: Antes de enviar, verifica última campanha nas últimas 24h
- ✅ **Status**: `SKIPPED_24H` se já recebeu campanha recentemente

#### **Repescagem Manual**
- ✅ **Limite**: 2 tentativas por operador a cada 24 horas
- ✅ **Intervalo**: Mínimo de 3 horas entre tentativas
- ✅ **Contador**: Incrementa a cada mensagem enviada
- ✅ **Reset**: Reseta quando cliente responde
- ✅ **Bloqueio**: Bloqueia envio após 2 tentativas até cliente responder

### 🎯 **CPC (Contato Positivo com Cliente)**

#### **Marcação**
- ✅ Operador marca número como CPC
- ✅ Registro em `conversation_events` (tipo: `cpc_marked`)
- ✅ Atualização em `conversations.cpcMarkedAt`
- ✅ Atualização em `campaign_contacts.cpcMarkedAt`

#### **Bloqueio de Campanhas**
- ✅ Números CPC não recebem campanhas por 24 horas
- ✅ Verificação antes de enviar campanha
- ✅ Status: `SKIPPED_CPC_24H` se marcado como CPC recentemente

### 👥 **Distribuição de Conversas**

#### **Atribuição Automática**
- ✅ Round-robin por operador com menos conversas
- ✅ Filtro por `queueKey` (se configurado)
- ✅ Filtro por `numberId` (se configurado)
- ✅ Filtro por `segments` (se configurado)
- ✅ Verifica capacidade máxima do operador

#### **Persistência**
- ✅ Conversas permanecem atribuídas por 24 horas
- ✅ Operador pode ver conversas mesmo após logout
- ✅ Conversas não tabuladas permanecem visíveis
- ✅ Histórico completo preservado

### 🔌 **Presença de Operadores**

#### **Online/Offline**
- ✅ Operador pode ficar online/offline
- ✅ Heartbeat a cada 30 segundos
- ✅ Sessão expira após 12 horas
- ✅ Limpeza automática de sessões expiradas

#### **WebSocket**
- ✅ Conexão persistente com backend
- ✅ Eventos em tempo real:
  - `new_conversation`: Nova conversa atribuída
  - `new_message`: Nova mensagem recebida
  - `conversation:unassigned`: Conversa sem operador
  - `message:status`: Atualização de status

---

## 🔧 Configuração

### Variáveis de Ambiente

```env
# URL base da API do microserviço
REACT_APP_WHATSAPP_API_BASE_URL=https://vend.covenos.com.br/api

# API Key para autenticação
REACT_APP_WHATSAPP_API_KEY=sua_api_key_aqui

# URL do WebSocket (opcional, usa API_BASE_URL se não definido)
REACT_APP_WHATSAPP_SOCKET_URL=https://vend.covenos.com.br
```

### Armazenamento Local

O sistema utiliza `localStorage` para:
- `operatorId`: ID do operador logado
- `companyId`: ID da empresa
- `userId`: ID do usuário (fallback)

### Autenticação

A autenticação é feita via:
1. **Contexto de Autenticação** (`AuthContext`)
2. **LocalStorage** (fallback)
3. **API Key** no header `X-API-Key`

---

## 📱 Telas Principais

### 🎫 **Tickets (Console do Operador)**
- Visualização de conversa atual
- Envio de mensagens
- Controle de presença
- Status de elegibilidade
- Marcação CPC
- Fechamento de conversa

### 📋 **TicketsAdvanced (Lista de Conversas)**
- Lista de todas as conversas
- Filtros e busca
- Indicadores de não lidas
- Badges de status
- Seleção de conversa

### 🔌 **Connections (Conexões)**
- Gestão de contas WhatsApp
- Adição de números
- Configuração de templates
- OAuth integration

### 📅 **Schedule (Campanhas)**
- Criação de campanhas
- Upload de CSV (colunas: telefone, nome, contrato, CPF)
- Configuração de templates
- Controle de campanhas

### 🏷️ **Tags (Tabulações)**
- Criação de tabulações
- Configuração de notas obrigatórias
- Gestão de categorias

### 📊 **Relatórios (Reports)** ⭐ **NOVO**
- Central de relatórios analíticos
- Relatório de operadores e produtividade
- Relatório de conversas detalhadas
- Relatórios de templates e campanhas
- Dados transacionados
- Exportação em CSV
- Filtros por período e carteira
- Interface moderna com 6 tipos de relatórios

### 🎨 **Design e UX**
- Interface estilo WhatsApp Web (tema claro e escuro)
- Cards interativos e responsivos
- Tooltips informativos
- Feedback visual em tempo real
- Notificações toast elegantes
- Animações suaves
- Loading states informativos

---

## 📸 Preview

<div align="center">

### 💬 **Console de Atendimento**
Interface moderna inspirada no WhatsApp Web com tema claro e escuro

### 📊 **Central de Relatórios**
Dashboard intuitivo com 6 tipos de relatórios analíticos

### 📈 **Métricas em Tempo Real**
Acompanhamento de produtividade e KPIs dos operadores

</div>

---

## 🔌 API de Relatórios

O sistema possui endpoints REST para geração de relatórios via API:

### **Base URL**
```
/reports
```

### **Endpoints Disponíveis**

#### 1. **GET `/reports/operators`**
Retorna estatísticas detalhadas dos operadores

**Parâmetros Query:**
- `dateFrom` (opcional): Data inicial (YYYY-MM-DD)
- `dateTo` (opcional): Data final (YYYY-MM-DD)
- `operatorId` (opcional): Filtrar por operador específico

**Resposta:**
```json
[
  {
    "operatorId": "uuid-123",
    "operatorName": "João Silva",
    "operatorEmail": "joao@example.com",
    "totalConversations": 150,
    "openConversations": 20,
    "closedConversations": 130,
    "totalMessages": 450,
    "conversationsWithCpc": 15
  }
]
```

#### 2. **GET `/reports/conversations`**
Retorna informações detalhadas das conversas

**Parâmetros Query:**
- `dateFrom` (opcional): Data inicial
- `dateTo` (opcional): Data final
- `operatorId` (opcional): Filtrar por operador
- `status` (opcional): Filtrar por status (OPEN, CLOSED)
- `tabulationId` (opcional): Filtrar por tabulação

**Resposta:**
```json
[
  {
    "conversationId": "conv-uuid-123",
    "customerPhone": "5511999999999",
    "customerName": "Maria Santos",
    "customerContract": "12345",
    "customerCpf": "12345678900",
    "operatorName": "João Silva",
    "status": "CLOSED",
    "tabulationName": "Pagamento Realizado",
    "totalMessages": 15,
    "inboundMessages": 8,
    "outboundMessages": 7,
    "cpcMarked": "Não",
    "createdAt": "2025-01-15T10:30:00Z",
    "closedAt": "2025-01-15T12:00:00Z"
  }
]
```

#### 3. **GET `/reports/operators/productivity`**
Retorna métricas de produtividade dos operadores

**Parâmetros Query:**
- `dateFrom` (opcional): Data inicial
- `dateTo` (opcional): Data final

**Resposta:**
```json
[
  {
    "operatorId": "uuid-123",
    "operatorName": "João Silva",
    "operatorEmail": "joao@example.com",
    "totalConversations": 150,
    "closedConversations": 130,
    "openConversations": 20,
    "totalMessagesSent": 450,
    "conversationsWithCpc": 15,
    "resolutionRate": "86.67%"
  }
]
```

#### 4. **GET `/reports/conversations/by-period`**
Agrupa conversas por período (dia, semana ou mês)

**Parâmetros Query:**
- `dateFrom` (opcional): Data inicial
- `dateTo` (opcional): Data final
- `groupBy` (opcional): day, week, month (padrão: day)

#### 5. **GET `/reports/conversations/by-tabulation`**
Agrupa conversas por tipo de tabulação

**Exemplo de uso:**
```bash
curl -X GET "https://api.example.com/reports/operators?dateFrom=2025-01-01&dateTo=2025-01-31" \
  -H "x-api-key: your-api-key"
```

**Documentação completa:** Consulte `/docs/REPORTS_API.md` para detalhes completos.

---

## 🔄 Fluxo de Mensagens

### **Mensagem Recebida (Cliente → Operador)**
1. Webhook recebe mensagem do WhatsApp
2. Backend processa e enfileira
3. Worker processa mensagem
4. Verifica/cria conversa
5. Atribui a operador (se necessário)
6. Emite evento WebSocket `new_message`
7. Frontend recebe evento
8. Atualiza conversa em tempo real
9. Recarrega elegibilidade (libera envio)

### **Mensagem Enviada (Operador → Cliente)**
1. Operador digita mensagem
2. Frontend valida elegibilidade
3. Envia via API
4. Backend processa e envia via WhatsApp API
5. Atualiza contadores de repescagem
6. Bloqueia envio por 3 horas (se necessário)
7. Frontend recarrega conversa
8. Atualiza UI

### **Campanha Enviada**
1. Upload de CSV (telefone, nome, contrato, CPF)
2. Backend processa CSV
3. Cria jobs no BullMQ
4. Worker processa cada contato
5. Verifica limites (24h, CPC)
6. Envia template via WhatsApp API
7. Registra em `campaign_contacts`
8. Atualiza estatísticas

---

## 🐛 Troubleshooting

### **Mensagens não chegam em tempo real**
- ✅ Verifique conexão WebSocket
- ✅ Verifique se operador está online
- ✅ Verifique logs do backend
- ✅ Verifique se `operatorId` está correto

### **Operador não recebe conversas**
- ✅ Verifique se está online
- ✅ Verifique `queueKey` e `segments`
- ✅ Verifique capacidade máxima
- ✅ Verifique se há operadores online

### **Não consigo enviar mensagem**
- ✅ Verifique elegibilidade (mensagem de bloqueio)
- ✅ Verifique se cliente respondeu recentemente
- ✅ Verifique limite de repescagens
- ✅ Verifique se conversa está aberta

### **Campanha não envia**
- ✅ Verifique formato do CSV
- ✅ Verifique se template existe
- ✅ Verifique limites de 24h
- ✅ Verifique status CPC dos números
- ✅ Verifique logs do BullMQ

---

## 📝 Desenvolvimento

### Scripts Disponíveis
```bash
# Desenvolvimento
npm start

# Build de produção
npm run build

# Testes
npm test

# Lint
npm run lint
```

### Estrutura de Código
- **Hooks**: `useState`, `useEffect`, `useCallback`, `useMemo`
- **Contextos**: `AuthContext`, `SocketContext`
- **Componentes**: Funcionais com hooks
- **Estilos**: Material-UI `makeStyles`
- **HTTP**: Axios via `microserviceApi.js`
- **WebSocket**: Socket.IO client

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 👥 Desenvolvedores

<div align="center">

### 💻 Core Team

| [<img src="https://github.com/DanielCayresFilho.png" width="100px;"/><br/><sub><b>Daniel Cayres Filho</b></sub>](https://github.com/DanielCayresFilho) | [<img src="https://github.com/guilhermebertolaccini.png" width="100px;"/><br/><sub><b>Guilherme Bertolaccini</b></sub>](https://github.com/guilhermebertolaccini) |
|:---:|:---:|
| Backend & Architecture | Frontend & UX |

**Desenvolvido com ❤️ e dedicação para revolucionar o atendimento via WhatsApp**

</div>

---

## 🙏 Agradecimentos

- WhatsApp Business API
- Meta for Developers
- Comunidade open source

---

## 📝 Changelog

### v2.0.0 - Sistema de Relatórios Analíticos (2025-01)

#### ✨ Novidades
- 📊 **Central de Relatórios**: Nova página dedicada a relatórios analíticos
- 👥 **Relatório de Operadores**: Análise completa de produtividade
- 💬 **Relatório de Conversas**: Exportação detalhada de conversas
- 📈 **Métricas Avançadas**: Taxa de resolução, tempo médio, KPIs
- 🔌 **API REST**: 5 novos endpoints para relatórios
- 📥 **Exportação CSV**: Download direto de todos os relatórios
- 🎨 **Interface Moderna**: Cards interativos e responsivos

#### 🛠️ Backend
- Novo módulo `reports/` com controller e service
- 5 endpoints REST para relatórios
- Integração com Prisma para queries otimizadas
- Filtros avançados por período e operador
- Agrupamento por período e tabulação

#### 🎨 Frontend
- Nova página `relatories.js` reformulada
- 6 cards de relatórios com cores distintas
- Modal de filtros com seleção de período
- Integração com API de relatórios
- Loading states e notificações
- Tema claro/escuro consistente

#### 📚 Documentação
- Novo arquivo `/docs/REPORTS_API.md`
- README atualizado com novas funcionalidades
- Exemplos de uso da API
- Campos CSV documentados

### v1.0.0 - Sistema Base (2024)
- Sistema completo de atendimento WhatsApp
- Gestão de conversas e operadores
- Campanhas em massa via CSV
- Sistema CPC e repescagem
- Interface estilo WhatsApp Web
- WebSocket em tempo real

---

<div align="center">

**Meta-MicroService** - Sistema completo de atendimento via WhatsApp Business API

[![Made with ❤️](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red.svg)](https://github.com/DanielCayresFilho/Meta-MicroService)
[![NestJS](https://img.shields.io/badge/NestJS-v10-E0234E.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-v18-61DAFB.svg)](https://react.dev/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp%20Business%20API-v21.0-25D366.svg)](https://developers.facebook.com/docs/whatsapp)

[⬆ Voltar ao topo](#-meta-microservice---whatsapp-business-api)

</div>

