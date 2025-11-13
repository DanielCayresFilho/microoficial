# 🚀 Sistema de Atendimento WhatsApp - Frontend

<div align="center">

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Material-UI](https://img.shields.io/badge/Material--UI-0081CB?style=for-the-badge&logo=material-ui&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

**Sistema completo de atendimento ao cliente via WhatsApp Business API**

[Funcionalidades](#-funcionalidades) • [Instalação](#-instalação) • [Uso](#-uso) • [Arquitetura](#-arquitetura) • [Regras de Negócio](#-regras-de-negócio)

</div>

---

## 📋 Sobre o Projeto

Sistema frontend completo para gerenciamento de atendimento ao cliente via WhatsApp Business API. Integrado com microserviço backend que gerencia campanhas, conversas, operadores e distribuição inteligente de mensagens em tempo real.

O sistema permite que operadores gerenciem múltiplas conversas simultaneamente, enviem campanhas em massa via CSV, controlem presença online/offline, e apliquem regras de negócio como CPC (Contato Positivo com Cliente) e repescagem inteligente.

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
```
critic/
├── src/
│   ├── pages/
│   │   ├── Connections/          # Gestão de contas e números
│   │   ├── Tickets/              # Console do operador
│   │   ├── TicketsAdvanced/      # Lista de conversas
│   │   ├── Schedule/             # Campanhas CSV
│   │   └── Tags/                 # Tabulações
│   ├── context/                  # Contextos React
│   │   ├── Auth/                 # Autenticação
│   │   └── Socket/               # WebSocket
│   └── Connections/
│       └── microserviceApi.js    # Cliente HTTP do microserviço
├── public/
└── package.json
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
- Upload de CSV
- Configuração de templates
- Controle de campanhas

### 🏷️ **Tags (Tabulações)**
- Criação de tabulações
- Configuração de notas obrigatórias
- Gestão de categorias

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
1. Upload de CSV
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

## 👥 Autores

- **Equipe de Desenvolvimento** - [@DanielCayresFilho](https://github.com/DanielCayresFilho) - [@guilhermebertolaccini](https://github.com/guilhermebertolaccini)

---

## 🙏 Agradecimentos

- WhatsApp Business API
- Meta for Developers
- Comunidade open source

---

<div align="center">

**Desenvolvido com ❤️ para facilitar o atendimento ao cliente via WhatsApp**

[⬆ Voltar ao topo](#-sistema-de-atendimento-whatsapp---frontend)

</div>

