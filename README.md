# Microserviço WhatsApp - Telemarketing & Atendimento ao Cliente

Um microserviço robusto construído com NestJS para gerenciar campanhas de WhatsApp Business e operações de atendimento ao cliente usando a API oficial do WhatsApp Cloud (v21.0).

## Funcionalidades

- **Autenticação com API Key**: Autenticação de API simples e segura com token fixo
- **Suporte Multi-Conta**: Gerencie múltiplas contas do Business Manager e números de telefone
- **Embedded Signup**: Conexão fácil de contas do WhatsApp Business via OAuth
- **Gerenciamento de Campanhas**: Envie mensagens em massa usando templates com fonte de dados CSV
- **Distribuição Inteligente de Conversas**: Atribuição automática a operadores usando round-robin
- **Comunicação em Tempo Real**: Integração WebSocket com autenticação API Key para atualizações instantâneas
- **Processamento de Mensagens**: Processamento assíncrono com BullMQ
- **Fechamento Automático**: Fechamento automático de conversas após 24 horas de inatividade
- **Sistema de Tabulação**: Categorize conversas antes do fechamento
- **Integração com Webhook**: Receptor rápido de webhook para eventos do WhatsApp

## Stack Tecnológico

- **Backend**: NestJS (TypeScript)
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **Fila**: BullMQ + Redis
- **Tempo Real**: Socket.IO (WebSockets)
- **API**: WhatsApp Cloud API v21.0

## Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local)
- Conta WhatsApp Business com acesso à API
- Conta Meta Developer

## Início Rápido com Docker

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd microoficial
```

2. Copie as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Edite o `.env` e configure suas credenciais:
```env
# Obrigatório: Gere uma API Key forte
API_KEY=my_super_secret_api_key_change_in_production_abc123xyz

# Obrigatório: Token de verificação do webhook
WEBHOOK_VERIFY_TOKEN=your_secret_token_here

# Opcional: Para Embedded Signup
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here
```

Gere uma API Key segura:
```bash
# Opção 1: OpenSSL
openssl rand -hex 32

# Opção 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Inicie todos os serviços:
```bash
docker-compose up -d
```

5. Verifique os logs:
```bash
docker-compose logs -f app
```

A aplicação estará disponível em:
- API: http://localhost:3000/api
- BullMQ Board: http://localhost:3001

6. Teste a API com sua API Key:
```bash
curl -H "X-API-Key: SUA_API_KEY_AQUI" \
  http://localhost:3000/api/accounts
```

## Desenvolvimento Local

1. Instale as dependências:
```bash
npm install
```

2. Inicie PostgreSQL e Redis:
```bash
docker-compose up -d postgres redis
```

3. Copie o arquivo de ambiente:
```bash
cp .env.example .env
```

4. Atualize o `.env` para desenvolvimento local:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_microservice?schema=public"
REDIS_HOST=localhost
```

5. Execute as migrations do Prisma:
```bash
npx prisma migrate dev
```

6. Gere o Prisma Client:
```bash
npx prisma generate
```

7. Inicie o servidor de desenvolvimento:
```bash
npm run start:dev
```

## Endpoints da API

**🔒 Endpoints Protegidos**: Todos os endpoints requerem autenticação com API Key, exceto aqueles marcados com 🌐

### Autenticação

Todos os endpoints protegidos requerem que a API Key seja enviada de uma das seguintes formas:

**Opção 1: Header X-API-Key (Recomendado)**
```bash
curl -H "X-API-Key: SUA_API_KEY" http://localhost:3000/api/accounts
```

**Opção 2: Authorization Bearer**
```bash
curl -H "Authorization: Bearer SUA_API_KEY" http://localhost:3000/api/accounts
```

Veja o guia completo de autenticação: [docs/API_KEY_AUTH.md](docs/API_KEY_AUTH.md)
Veja a documentação completa dos endpoints: [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)

### WhatsApp OAuth (Embedded Signup)
- 🌐 `GET /api/auth/whatsapp/signup-page` - Página de signup (HTML)
- 🌐 `GET /api/auth/whatsapp` - Obter URL OAuth
- 🌐 `GET /api/auth/whatsapp/callback` - Callback OAuth (automático)
- 🌐 `GET /api/auth/whatsapp/setup?wabaId=xxx&accessToken=xxx` - Setup manual
- 🌐 `GET /api/auth/whatsapp/accounts?accessToken=xxx` - Listar WABAs disponíveis
- 🌐 `GET /api/auth/whatsapp/debug?accessToken=xxx` - Debug de informações do token

### Gerenciamento de Contas
- 🔒 `POST /api/accounts` - Criar conta
- 🔒 `GET /api/accounts` - Listar contas
- 🔒 `GET /api/accounts/:id` - Obter detalhes da conta
- 🔒 `PUT /api/accounts/:id` - Atualizar conta
- 🔒 `DELETE /api/accounts/:id` - Deletar conta
- 🔒 `POST /api/accounts/:id/numbers` - Adicionar número de telefone
- 🔒 `GET /api/accounts/:id/numbers` - Listar números de telefone

### Gerenciamento de Operadores
- 🔒 `POST /api/operators` - Criar operador
- 🔒 `GET /api/operators` - Listar operadores
- 🔒 `GET /api/operators/:id` - Obter detalhes do operador
- 🔒 `PUT /api/operators/:id` - Atualizar operador
- 🔒 `DELETE /api/operators/:id` - Deletar operador

### Gerenciamento de Tabulações
- 🔒 `POST /api/tabulations` - Criar tabulação
- 🔒 `GET /api/tabulations` - Listar tabulações
- 🔒 `GET /api/tabulations/:id` - Obter tabulação
- 🔒 `PUT /api/tabulations/:id` - Atualizar tabulação
- 🔒 `DELETE /api/tabulations/:id` - Deletar tabulação

### Campanhas
- 🔒 `POST /api/campaigns` - Criar campanha
- 🔒 `POST /api/campaigns/:id/upload-csv` - Upload CSV e iniciar campanha
- 🔒 `GET /api/campaigns` - Listar campanhas
- 🔒 `GET /api/campaigns/:id` - Obter detalhes da campanha
- 🔒 `GET /api/campaigns/:id/stats` - Obter estatísticas da campanha

### Conversas
- 🔒 `GET /api/conversations` - Listar conversas (filtrar por status, operatorId)
- 🔒 `GET /api/conversations/stats` - Obter estatísticas de conversas
- 🔒 `GET /api/conversations/:id` - Obter conversa com mensagens
- 🔒 `POST /api/conversations/:id/messages` - Enviar mensagem 1x1
- 🔒 `POST /api/conversations/:id/close` - Fechar conversa (requer tabulationId)
- 🔒 `PUT /api/conversations/:id/assign` - Atribuir operador

### Webhooks
- 🌐 `GET /api/webhooks/whatsapp` - Verificação do webhook (Meta)
- 🌐 `POST /api/webhooks/whatsapp` - Receber eventos do WhatsApp

## Eventos WebSocket

**Autenticação Obrigatória**: Conexões WebSocket requerem API Key.

### Conexão

**Opção 1: Query Parameter (Recomendado)**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: { apiKey: 'SUA_API_KEY' }
});
```

**Opção 2: Auth Object**
```javascript
const socket = io('http://localhost:3000', {
  auth: { apiKey: 'SUA_API_KEY' }
});
```

**Opção 3: Headers**
```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: { 'X-API-Key': 'SUA_API_KEY' }
});
```

### Cliente para Servidor
- `operator:join` - Operador conecta (payload: `{ operatorId: string }`)
- `operator:leave` - Operador desconecta
- `conversation:typing` - Indicador de digitação

### Servidor para Cliente
- `new_conversation` - Nova conversa atribuída
- `new_message` - Nova mensagem na conversa
- `operator:conversations` - Lista de conversas atuais

Veja o guia completo de autenticação WebSocket em [docs/API_KEY_AUTH.md](docs/API_KEY_AUTH.md)

## Formato CSV da Campanha

O arquivo CSV deve conter no mínimo uma coluna de número de telefone. Colunas adicionais serão mapeadas para variáveis do template.

Exemplo de CSV:
```csv
phone,name,product
5511999999999,João Silva,Produto A
5511888888888,Maria Santos,Produto B
```

Nomes de colunas:
- `phone`, `phoneNumber`, `phone_number`, `telefone`, `celular`, ou `whatsapp` para números de telefone
- Outras colunas serão mapeadas para variáveis do template pelo nome

## Configuração do WhatsApp

### Opção 1: Embedded Signup (Recomendado)

A forma mais fácil de conectar contas do WhatsApp Business usando fluxo OAuth:

1. **Configure o App Meta**:
   - Acesse [Meta for Developers](https://developers.facebook.com/)
   - Crie um novo App ou use um existente
   - Adicione o produto WhatsApp ao seu app
   - Em Configurações do App → Básico:
     - Copie `App ID` e `App Secret`
     - Adicione ao `.env`: `META_APP_ID` e `META_APP_SECRET`

2. **Configure o Redirect OAuth**:
   - Em WhatsApp → Configuração → OAuth Redirect URIs
   - Adicione: `http://localhost:3000/api/auth/whatsapp/callback` (desenvolvimento)
   - Adicione: `https://seu-dominio.com/api/auth/whatsapp/callback` (produção)
   - Atualize `.env`: `OAUTH_REDIRECT_URI`

3. **Conecte a Conta**:
   - Inicie a aplicação
   - Navegue para: http://localhost:3000/api/auth/whatsapp/signup-page
   - Clique em "Conectar WhatsApp Business"
   - Faça login com conta Facebook/Meta
   - Selecione a Conta WhatsApp Business
   - Conceda as permissões
   - A conta será criada automaticamente no sistema!

4. **Configure o Webhook** (ainda necessário):
   - Em WhatsApp → Configuração → Webhook
   - URL: `https://seu-dominio.com/api/webhooks/whatsapp`
   - Token de Verificação: Mesmo que `WEBHOOK_VERIFY_TOKEN` no `.env`
   - Inscreva-se em: `messages`, `message_status`

### Opção 2: Setup Manual

Método tradicional usando tokens de System User:

1. Crie uma Conta Meta Developer
2. Crie um App WhatsApp Business
3. Crie System User e gere Access Token
4. Obtenha o Phone Number ID
5. Adicione via API:
   ```bash
   POST /api/accounts
   {
     "name": "Meu Negócio",
     "businessId": "WABA_ID",
     "accessToken": "SEU_TOKEN"
   }

   POST /api/accounts/:id/numbers
   {
     "phoneNumber": "+5511999999999",
     "phoneNumberId": "PHONE_NUMBER_ID"
   }
   ```
6. Configure o webhook (mesmo da Opção 1)

## Arquitetura

### Fluxo de Mensagens

1. **Saída (Campanha)**:
   - CSV enviado → Parseado → Jobs criados no BullMQ
   - Worker processa jobs com rate limiting
   - Mensagens de template enviadas via API do WhatsApp
   - Atualizações de status recebidas via webhook

2. **Entrada (Resposta do Cliente)**:
   - Webhook recebe mensagem → Enfileirada imediatamente
   - Worker processa mensagem
   - Verifica conversa existente ou cria nova
   - Atribui a operador (round-robin)
   - Emite evento WebSocket para operador

3. **Mensagens 1x1**:
   - Operador envia mensagem via API
   - Mensagem enviada via API do WhatsApp
   - Atualizações de status recebidas via webhook

### Lógica de Transbordo

Uma conversa é criada (transbordo) quando:
- Cliente envia primeira mensagem
- Cliente responde a uma mensagem de campanha

O sistema:
1. Encontra operador com menos conversas abertas
2. Verifica se operador está abaixo da capacidade máxima
3. Atribui conversa ao operador
4. Emite evento WebSocket

Conversas permanecem atribuídas por 24 horas ou até serem fechadas manualmente.

## Jobs Agendados

- **Fechamento automático de conversas** (a cada 10 minutos): Fecha conversas sem atividade por 24h
- **Atualizar campanhas concluídas** (a cada 5 minutos): Marca campanhas como concluídas
- **Limpeza de eventos de webhook** (diariamente às 2h): Remove eventos com mais de 7 dias

## Monitoramento

Acesse o BullMQ Board em http://localhost:3001 para monitorar:
- Status da fila
- Progresso dos jobs
- Jobs falhos
- Detalhes dos jobs

## Migrations do Banco de Dados

Criar nova migration:
```bash
npx prisma migrate dev --name nome_da_migration
```

Aplicar migrations em produção:
```bash
npx prisma migrate deploy
```

Visualizar banco de dados:
```bash
npx prisma studio
```

## Variáveis de Ambiente

Veja `.env.example` para todas as opções de configuração disponíveis.

Variáveis principais:
- `API_KEY`: API Key fixa para autenticação (obrigatória para todos os endpoints protegidos)
- `DATABASE_URL`: String de conexão PostgreSQL
- `REDIS_HOST`, `REDIS_PORT`: Configuração do Redis
- `META_APP_ID`: Meta App ID (para Embedded Signup)
- `META_APP_SECRET`: Meta App Secret (para Embedded Signup)
- `OAUTH_REDIRECT_URI`: URL de callback OAuth (deve corresponder à configuração do App Meta)
- `WEBHOOK_VERIFY_TOKEN`: Token de verificação do webhook Meta
- `WHATSAPP_API_VERSION`: Versão da API do WhatsApp (padrão: v21.0)
- `CONVERSATION_AUTO_CLOSE_HOURS`: Horas até fechamento automático (padrão: 24)
- `DEFAULT_RATE_LIMIT_PER_MINUTE`: Limite de taxa da campanha (padrão: 50)

## Deploy em Produção

1. Build da imagem:
```bash
docker build -t whatsapp-microservice .
```

2. Configure as variáveis de ambiente de produção

3. Deploy com docker-compose:
```bash
docker-compose -f docker-compose.yml up -d
```

4. Configure reverse proxy (nginx) para HTTPS

5. Configure domínio para webhook

## Solução de Problemas

### Webhook não está recebendo mensagens
- Verifique a URL do webhook no Meta Dashboard
- Verifique se `WEBHOOK_VERIFY_TOKEN` corresponde
- Verifique as inscrições do webhook (messages, message_status)
- Visualize eventos do webhook no banco: `SELECT * FROM webhook_events ORDER BY created_at DESC`

### Mensagens não estão sendo enviadas
- Verifique o BullMQ Board para jobs falhos
- Verifique se o access token é válido
- Verifique rate limiting
- Visualize logs: `docker-compose logs -f app`

### WebSocket não está conectando
- Verifique configuração CORS no `main.ts`
- Verifique compatibilidade da versão do cliente Socket.IO
- Verifique regras de firewall

## Licença

MIT

## Suporte

Para problemas e questões, abra uma issue no GitHub.
