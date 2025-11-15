# Documentação Completa dos Endpoints da API

Esta documentação detalha todos os endpoints disponíveis na API do WhatsApp Microservice.

## Autenticação

Todos os endpoints marcados com 🔒 requerem autenticação via API Key.

**Headers obrigatórios:**
```
X-API-Key: sua_api_key_aqui
```

ou

```
Authorization: Bearer sua_api_key_aqui
```

---

## 1. WhatsApp OAuth (Embedded Signup)

### 1.1. Página de Signup

**Endpoint:** `GET /api/auth/whatsapp/signup-page`
**Autenticação:** 🌐 Pública

Retorna uma página HTML com botão para iniciar o fluxo de OAuth.

**Exemplo:**
```bash
curl http://localhost:3000/api/auth/whatsapp/signup-page
```

**Response:** HTML Page
```html
<!DOCTYPE html>
<html>
  <head>
    <title>WhatsApp Business - Embedded Signup</title>
  </head>
  <body>
    <!-- Página de signup com botão OAuth -->
  </body>
</html>
```

---

### 1.2. Obter URL OAuth

**Endpoint:** `GET /api/auth/whatsapp`
**Autenticação:** 🌐 Pública

Gera a URL de autenticação OAuth do WhatsApp.

**Exemplo:**
```bash
curl http://localhost:3000/api/auth/whatsapp
```

**Response:**
```json
{
  "oauthUrl": "https://www.facebook.com/v21.0/dialog/oauth?client_id=..."
}
```

---

### 1.3. Callback OAuth

**Endpoint:** `GET /api/auth/whatsapp/callback`
**Autenticação:** 🌐 Pública

Callback automático após autorização OAuth. Redireciona para página de setup.

**Query Parameters:**
- `code` (string, obrigatório) - Código de autorização do OAuth

---

### 1.4. Setup Manual

**Endpoint:** `GET /api/auth/whatsapp/setup`
**Autenticação:** 🌐 Pública

Setup manual de conta WhatsApp Business.

**Query Parameters:**
- `wabaId` (string, obrigatório) - ID da WhatsApp Business Account
- `accessToken` (string, obrigatório) - Access token obtido via OAuth

**Exemplo:**
```bash
curl "http://localhost:3000/api/auth/whatsapp/setup?wabaId=123456789&accessToken=EAAxxxxx"
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": "uuid",
    "name": "Nome do Negócio",
    "businessId": "123456789",
    "isActive": true
  },
  "numbers": [
    {
      "id": "uuid",
      "phoneNumber": "+5511999999999",
      "phoneNumberId": "phone_number_id",
      "displayName": "Meu Negócio",
      "qualityRating": "GREEN"
    }
  ]
}
```

---

### 1.5. Listar WABAs Disponíveis

**Endpoint:** `GET /api/auth/whatsapp/accounts`
**Autenticação:** 🌐 Pública

Lista todas as contas WhatsApp Business disponíveis para o token.

**Query Parameters:**
- `accessToken` (string, obrigatório) - Access token

**Exemplo:**
```bash
curl "http://localhost:3000/api/auth/whatsapp/accounts?accessToken=EAAxxxxx"
```

**Response:**
```json
{
  "data": [
    {
      "id": "123456789",
      "name": "Minha Empresa LTDA",
      "timezone_id": "America/Sao_Paulo"
    }
  ]
}
```

---

### 1.6. Debug Token

**Endpoint:** `GET /api/auth/whatsapp/debug`
**Autenticação:** 🌐 Pública

Obtém informações de debug sobre o token.

**Query Parameters:**
- `accessToken` (string, obrigatório) - Access token

**Exemplo:**
```bash
curl "http://localhost:3000/api/auth/whatsapp/debug?accessToken=EAAxxxxx"
```

**Response:**
```json
{
  "data": {
    "app_id": "your_app_id",
    "type": "USER",
    "application": "App Name",
    "expires_at": 1234567890,
    "is_valid": true,
    "scopes": [
      "whatsapp_business_management",
      "whatsapp_business_messaging"
    ]
  }
}
```

---

## 2. Gerenciamento de Contas

### 2.1. Criar Conta

**Endpoint:** `POST /api/accounts`
**Autenticação:** 🔒 Requer API Key

Cria uma nova conta WhatsApp Business.

**Request Body:**
```json
{
  "name": "Minha Empresa",
  "businessId": "123456789",
  "accessToken": "EAAxxxxx"
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minha Empresa",
    "businessId": "123456789",
    "accessToken": "EAAxxxxx"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Minha Empresa",
  "businessId": "123456789",
  "isActive": true,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z"
}
```

---

### 2.2. Listar Contas

**Endpoint:** `GET /api/accounts`
**Autenticação:** 🔒 Requer API Key

Lista todas as contas WhatsApp Business.

**Query Parameters:**
- `isActive` (boolean, opcional) - Filtrar por status

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  "http://localhost:3000/api/accounts?isActive=true"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Minha Empresa",
    "businessId": "123456789",
    "isActive": true,
    "createdAt": "2025-01-10T12:00:00.000Z",
    "updatedAt": "2025-01-10T12:00:00.000Z",
    "numbers": [
      {
        "id": "uuid",
        "phoneNumber": "+5511999999999",
        "displayName": "Atendimento"
      }
    ]
  }
]
```

---

### 2.3. Obter Detalhes da Conta

**Endpoint:** `GET /api/accounts/:id`
**Autenticação:** 🔒 Requer API Key

Obtém detalhes de uma conta específica.

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  http://localhost:3000/api/accounts/uuid
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Minha Empresa",
  "businessId": "123456789",
  "isActive": true,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z",
  "numbers": [
    {
      "id": "uuid",
      "phoneNumber": "+5511999999999",
      "phoneNumberId": "phone_number_id",
      "displayName": "Atendimento",
      "qualityRating": "GREEN",
      "isActive": true
    }
  ]
}
```

---

### 2.4. Atualizar Conta

**Endpoint:** `PUT /api/accounts/:id`
**Autenticação:** 🔒 Requer API Key

Atualiza informações da conta.

**Request Body:**
```json
{
  "name": "Novo Nome da Empresa",
  "isActive": false
}
```

**Exemplo:**
```bash
curl -X PUT http://localhost:3000/api/accounts/uuid \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Nome da Empresa"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Novo Nome da Empresa",
  "businessId": "123456789",
  "isActive": true,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:05:00.000Z"
}
```

---

### 2.5. Deletar Conta

**Endpoint:** `DELETE /api/accounts/:id`
**Autenticação:** 🔒 Requer API Key

Remove uma conta do sistema.

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/api/accounts/uuid \
  -H "X-API-Key: sua_api_key"
```

**Response:**
```json
{
  "message": "Conta deletada com sucesso",
  "id": "uuid"
}
```

---

### 2.6. Adicionar Número de Telefone

**Endpoint:** `POST /api/accounts/:id/numbers`
**Autenticação:** 🔒 Requer API Key

Adiciona um número de telefone à conta.

**Request Body:**
```json
{
  "phoneNumber": "+5511999999999",
  "phoneNumberId": "phone_number_id_from_meta",
  "displayName": "Atendimento",
  "qualityRating": "GREEN"
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/accounts/uuid/numbers \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+5511999999999",
    "phoneNumberId": "phone_number_id_from_meta",
    "displayName": "Atendimento"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "phoneNumber": "+5511999999999",
  "phoneNumberId": "phone_number_id_from_meta",
  "displayName": "Atendimento",
  "qualityRating": "GREEN",
  "isActive": true,
  "accountId": "account_uuid",
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z"
}
```

---

### 2.7. Listar Números da Conta

**Endpoint:** `GET /api/accounts/:id/numbers`
**Autenticação:** 🔒 Requer API Key

Lista todos os números de telefone de uma conta.

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  http://localhost:3000/api/accounts/uuid/numbers
```

**Response:**
```json
[
  {
    "id": "uuid",
    "phoneNumber": "+5511999999999",
    "phoneNumberId": "phone_number_id",
    "displayName": "Atendimento",
    "qualityRating": "GREEN",
    "isActive": true,
    "createdAt": "2025-01-10T12:00:00.000Z"
  }
]
```

---

## 3. Gerenciamento de Operadores

### 3.1. Criar Operador

**Endpoint:** `POST /api/operators`
**Autenticação:** 🔒 Requer API Key

Cria um novo operador.

**Request Body:**
```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "maxConcurrent": 5
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/operators \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@empresa.com",
    "maxConcurrent": 5
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "isActive": true,
  "maxConcurrent": 5,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z"
}
```

---

### 3.2. Listar Operadores

**Endpoint:** `GET /api/operators`
**Autenticação:** 🔒 Requer API Key

Lista todos os operadores.

**Query Parameters:**
- `isActive` (boolean, opcional) - Filtrar por status

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  "http://localhost:3000/api/operators?isActive=true"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@empresa.com",
    "isActive": true,
    "maxConcurrent": 5,
    "createdAt": "2025-01-10T12:00:00.000Z",
    "_count": {
      "conversations": 3
    }
  }
]
```

---

### 3.3. Obter Detalhes do Operador

**Endpoint:** `GET /api/operators/:id`
**Autenticação:** 🔒 Requer API Key

Obtém detalhes de um operador específico.

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  http://localhost:3000/api/operators/uuid
```

**Response:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "isActive": true,
  "maxConcurrent": 5,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z",
  "conversations": [
    {
      "id": "uuid",
      "customerName": "Cliente A",
      "customerPhone": "5511999999999",
      "status": "OPEN",
      "lastMessageAt": "2025-01-10T12:00:00.000Z"
    }
  ]
}
```

---

### 3.4. Atualizar Operador

**Endpoint:** `PUT /api/operators/:id`
**Autenticação:** 🔒 Requer API Key

Atualiza informações do operador.

**Request Body:**
```json
{
  "name": "João Silva Santos",
  "maxConcurrent": 10,
  "isActive": true
}
```

**Exemplo:**
```bash
curl -X PUT http://localhost:3000/api/operators/uuid \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "maxConcurrent": 10
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "isActive": true,
  "maxConcurrent": 10,
  "updatedAt": "2025-01-10T12:05:00.000Z"
}
```

---

### 3.5. Deletar Operador

**Endpoint:** `DELETE /api/operators/:id`
**Autenticação:** 🔒 Requer API Key

Remove um operador do sistema.

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/api/operators/uuid \
  -H "X-API-Key: sua_api_key"
```

**Response:**
```json
{
  "message": "Operador deletado com sucesso",
  "id": "uuid"
}
```

---

## 4. Gerenciamento de Tabulações

### 4.1. Criar Tabulação

**Endpoint:** `POST /api/tabulations`
**Autenticação:** 🔒 Requer API Key

Cria uma nova categoria de tabulação.

**Request Body:**
```json
{
  "name": "Venda Realizada",
  "description": "Cliente realizou compra",
  "requiresNotes": true
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/tabulations \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Venda Realizada",
    "description": "Cliente realizou compra",
    "requiresNotes": true
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Venda Realizada",
  "description": "Cliente realizou compra",
  "requiresNotes": true,
  "isActive": true,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z"
}
```

---

### 4.2. Listar Tabulações

**Endpoint:** `GET /api/tabulations`
**Autenticação:** 🔒 Requer API Key

Lista todas as tabulações.

**Query Parameters:**
- `isActive` (boolean, opcional) - Filtrar por status

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  "http://localhost:3000/api/tabulations?isActive=true"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Venda Realizada",
    "description": "Cliente realizou compra",
    "requiresNotes": true,
    "isActive": true,
    "createdAt": "2025-01-10T12:00:00.000Z"
  },
  {
    "id": "uuid2",
    "name": "Não Interessado",
    "description": "Cliente sem interesse",
    "requiresNotes": false,
    "isActive": true,
    "createdAt": "2025-01-10T12:00:00.000Z"
  }
]
```

---

### 4.3. Obter Tabulação

**Endpoint:** `GET /api/tabulations/:id`
**Autenticação:** 🔒 Requer API Key

Obtém detalhes de uma tabulação específica.

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  http://localhost:3000/api/tabulations/uuid
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Venda Realizada",
  "description": "Cliente realizou compra",
  "requiresNotes": true,
  "isActive": true,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z"
}
```

---

### 4.4. Atualizar Tabulação

**Endpoint:** `PUT /api/tabulations/:id`
**Autenticação:** 🔒 Requer API Key

Atualiza informações da tabulação.

**Request Body:**
```json
{
  "name": "Venda Confirmada",
  "description": "Cliente confirmou a compra",
  "isActive": true
}
```

**Exemplo:**
```bash
curl -X PUT http://localhost:3000/api/tabulations/uuid \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Venda Confirmada"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Venda Confirmada",
  "description": "Cliente confirmou a compra",
  "requiresNotes": true,
  "isActive": true,
  "updatedAt": "2025-01-10T12:05:00.000Z"
}
```

---

### 4.5. Deletar Tabulação

**Endpoint:** `DELETE /api/tabulations/:id`
**Autenticação:** 🔒 Requer API Key

Remove uma tabulação do sistema.

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/api/tabulations/uuid \
  -H "X-API-Key: sua_api_key"
```

**Response:**
```json
{
  "message": "Tabulação deletada com sucesso",
  "id": "uuid"
}
```

---

## 5. Campanhas

### 5.1. Criar Campanha

**Endpoint:** `POST /api/campaigns`
**Autenticação:** 🔒 Requer API Key

Cria uma nova campanha de envio em massa.

**Request Body:**
```json
{
  "name": "Promoção Black Friday",
  "numberId": "uuid_do_numero",
  "templateName": "promocao_bf",
  "languageCode": "pt_BR",
  "rateLimitPerMinute": 50
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Promoção Black Friday",
    "numberId": "uuid_do_numero",
    "templateName": "promocao_bf",
    "languageCode": "pt_BR"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Promoção Black Friday",
  "numberId": "uuid_do_numero",
  "templateName": "promocao_bf",
  "languageCode": "pt_BR",
  "status": "DRAFT",
  "rateLimitPerMinute": 50,
  "totalRecipients": 0,
  "sentCount": 0,
  "deliveredCount": 0,
  "readCount": 0,
  "failedCount": 0,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "updatedAt": "2025-01-10T12:00:00.000Z"
}
```

---

### 5.2. Upload CSV e Iniciar Campanha

**Endpoint:** `POST /api/campaigns/:id/upload-csv`
**Autenticação:** 🔒 Requer API Key
**Content-Type:** `multipart/form-data`

Faz upload do arquivo CSV com destinatários e inicia a campanha.

**Form Data:**
- `file` (file, obrigatório) - Arquivo CSV

**Formato do CSV (ordem obrigatória das colunas):**
```csv
telefone,nome,contrato,cpf
5511999999999,João Silva,123456,12345678901
5511888888888,Maria Santos,987654,98765432109
```

> As quatro colunas são utilizadas para preencher automaticamente o cadastro em `campaign_contacts`
> (telefone normalizado, nome do cliente, número do contrato e CPF). Essas informações são exibidas
> para os operadores no front-end durante o atendimento.

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/campaigns/uuid/upload-csv \
  -H "X-API-Key: sua_api_key" \
  -F "file=@contatos.csv"
```

**Response:**
```json
{
  "message": "CSV processado com sucesso. Campanha iniciada!",
  "campaign": {
    "id": "uuid",
    "name": "Promoção Black Friday",
    "status": "RUNNING",
    "totalRecipients": 2,
    "sentCount": 0
  },
  "stats": {
    "totalRows": 2,
    "validRows": 2,
    "invalidRows": 0
  }
}
```

---

### 5.3. Listar Campanhas

**Endpoint:** `GET /api/campaigns`
**Autenticação:** 🔒 Requer API Key

Lista todas as campanhas.

**Query Parameters:**
- `status` (string, opcional) - Filtrar por status: `DRAFT`, `RUNNING`, `COMPLETED`, `FAILED`
- `numberId` (string, opcional) - Filtrar por número

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  "http://localhost:3000/api/campaigns?status=RUNNING"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Promoção Black Friday",
    "templateName": "promocao_bf",
    "status": "RUNNING",
    "totalRecipients": 1000,
    "sentCount": 250,
    "deliveredCount": 200,
    "readCount": 50,
    "failedCount": 5,
    "createdAt": "2025-01-10T12:00:00.000Z",
    "startedAt": "2025-01-10T12:05:00.000Z",
    "number": {
      "phoneNumber": "+5511999999999",
      "displayName": "Vendas"
    }
  }
]
```

---

### 5.4. Obter Detalhes da Campanha

**Endpoint:** `GET /api/campaigns/:id`
**Autenticação:** 🔒 Requer API Key

Obtém detalhes completos de uma campanha.

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  http://localhost:3000/api/campaigns/uuid
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Promoção Black Friday",
  "numberId": "uuid_numero",
  "templateName": "promocao_bf",
  "languageCode": "pt_BR",
  "status": "RUNNING",
  "rateLimitPerMinute": 50,
  "totalRecipients": 1000,
  "sentCount": 250,
  "deliveredCount": 200,
  "readCount": 50,
  "failedCount": 5,
  "createdAt": "2025-01-10T12:00:00.000Z",
  "startedAt": "2025-01-10T12:05:00.000Z",
  "number": {
    "id": "uuid_numero",
    "phoneNumber": "+5511999999999",
    "displayName": "Vendas"
  }
}
```

---

### 5.5. Obter Estatísticas da Campanha

**Endpoint:** `GET /api/campaigns/:id/stats`
**Autenticação:** 🔒 Requer API Key

Obtém estatísticas detalhadas da campanha.

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  http://localhost:3000/api/campaigns/uuid/stats
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Promoção Black Friday",
  "status": "RUNNING",
  "totalRecipients": 1000,
  "sentCount": 250,
  "deliveredCount": 200,
  "readCount": 50,
  "failedCount": 5,
  "pendingCount": 750,
  "percentages": {
    "sent": 25.0,
    "delivered": 20.0,
    "read": 5.0,
    "failed": 0.5,
    "pending": 75.0
  },
  "timing": {
    "createdAt": "2025-01-10T12:00:00.000Z",
    "startedAt": "2025-01-10T12:05:00.000Z",
    "duration": "15 minutos",
    "estimatedCompletion": "2025-01-10T14:00:00.000Z"
  }
}
```

---

## 6. Conversas

### 6.1. Listar Conversas

**Endpoint:** `GET /api/conversations`
**Autenticação:** 🔒 Requer API Key

Lista todas as conversas.

**Query Parameters:**
- `status` (string, opcional) - Filtrar por status: `OPEN`, `CLOSED`
- `operatorId` (string, opcional) - Filtrar por operador
- `numberId` (string, opcional) - Filtrar por número

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  "http://localhost:3000/api/conversations?status=OPEN&operatorId=uuid"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "customerName": "João Silva",
    "customerPhone": "5511999999999",
    "status": "OPEN",
    "lastMessageAt": "2025-01-10T12:00:00.000Z",
    "createdAt": "2025-01-10T11:00:00.000Z",
    "operator": {
      "id": "uuid_operador",
      "name": "Maria Santos",
      "email": "maria@empresa.com"
    },
    "number": {
      "phoneNumber": "+5511888888888",
      "displayName": "Atendimento"
    },
    "_count": {
      "messages": 15
    }
  }
]
```

---

### 6.2. Obter Estatísticas de Conversas

**Endpoint:** `GET /api/conversations/stats`
**Autenticação:** 🔒 Requer API Key

Obtém estatísticas gerais de conversas.

**Query Parameters:**
- `operatorId` (string, opcional) - Estatísticas de um operador específico
- `startDate` (string, opcional) - Data inicial (ISO 8601)
- `endDate` (string, opcional) - Data final (ISO 8601)

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  "http://localhost:3000/api/conversations/stats?operatorId=uuid"
```

**Response:**
```json
{
  "total": 1500,
  "open": 45,
  "closed": 1455,
  "byOperator": [
    {
      "operatorId": "uuid",
      "operatorName": "Maria Santos",
      "open": 5,
      "closed": 120,
      "total": 125
    }
  ],
  "byTabulation": [
    {
      "tabulationId": "uuid",
      "tabulationName": "Venda Realizada",
      "count": 450
    }
  ],
  "avgResponseTime": "2 minutos",
  "avgConversationDuration": "15 minutos"
}
```

---

### 6.3. Obter Conversa com Mensagens

**Endpoint:** `GET /api/conversations/:id`
**Autenticação:** 🔒 Requer API Key

Obtém detalhes completos de uma conversa incluindo todas as mensagens.

**Exemplo:**
```bash
curl -H "X-API-Key: sua_api_key" \
  http://localhost:3000/api/conversations/uuid
```

**Response:**
```json
{
  "id": "uuid",
  "customerName": "João Silva",
  "customerPhone": "5511999999999",
  "status": "OPEN",
  "lastMessageAt": "2025-01-10T12:00:00.000Z",
  "createdAt": "2025-01-10T11:00:00.000Z",
  "operator": {
    "id": "uuid_operador",
    "name": "Maria Santos",
    "email": "maria@empresa.com"
  },
  "number": {
    "id": "uuid_numero",
    "phoneNumber": "+5511888888888",
    "displayName": "Atendimento"
  },
  "tabulation": null,
  "notes": null,
  "closedAt": null,
  "messages": [
    {
      "id": "uuid_msg",
      "whatsappMessageId": "wamid.xxx",
      "type": "text",
      "content": "Olá, gostaria de saber sobre os produtos",
      "direction": "INBOUND",
      "status": "delivered",
      "timestamp": "2025-01-10T11:00:00.000Z",
      "metadata": {}
    },
    {
      "id": "uuid_msg2",
      "whatsappMessageId": "wamid.yyy",
      "type": "text",
      "content": "Olá! Claro, temos diversas opções. Em que posso ajudar?",
      "direction": "OUTBOUND",
      "status": "read",
      "timestamp": "2025-01-10T11:02:00.000Z",
      "metadata": {}
    }
  ]
}
```

---

### 6.4. Enviar Mensagem 1x1

**Endpoint:** `POST /api/conversations/:id/messages`
**Autenticação:** 🔒 Requer API Key

Envia uma mensagem individual para o cliente.

**Request Body (Texto):**
```json
{
  "type": "text",
  "content": "Olá! Como posso ajudar?"
}
```

**Request Body (Imagem):**
```json
{
  "type": "image",
  "mediaUrl": "https://example.com/imagem.jpg",
  "caption": "Confira nosso produto!"
}
```

**Request Body (Documento):**
```json
{
  "type": "document",
  "mediaUrl": "https://example.com/catalogo.pdf",
  "caption": "Nosso catálogo completo",
  "filename": "catalogo.pdf"
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/conversations/uuid/messages \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Obrigado pelo contato!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid_msg",
    "whatsappMessageId": "wamid.zzz",
    "type": "text",
    "content": "Obrigado pelo contato!",
    "direction": "OUTBOUND",
    "status": "sent",
    "timestamp": "2025-01-10T12:05:00.000Z"
  }
}
```

---

### 6.5. Fechar Conversa

**Endpoint:** `POST /api/conversations/:id/close`
**Autenticação:** 🔒 Requer API Key

Fecha uma conversa com tabulação obrigatória.

**Request Body:**
```json
{
  "tabulationId": "uuid_tabulacao",
  "notes": "Cliente realizou compra de R$ 299,90"
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/conversations/uuid/close \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tabulationId": "uuid_tabulacao",
    "notes": "Cliente realizou compra"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "status": "CLOSED",
  "closedAt": "2025-01-10T12:10:00.000Z",
  "tabulation": {
    "id": "uuid_tabulacao",
    "name": "Venda Realizada"
  },
  "notes": "Cliente realizou compra de R$ 299,90"
}
```

---

### 6.6. Atribuir Operador

**Endpoint:** `PUT /api/conversations/:id/assign`
**Autenticação:** 🔒 Requer API Key

Reatribui uma conversa para outro operador.

**Request Body:**
```json
{
  "operatorId": "uuid_novo_operador"
}
```

**Exemplo:**
```bash
curl -X PUT http://localhost:3000/api/conversations/uuid/assign \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "operatorId": "uuid_novo_operador"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "customerName": "João Silva",
  "operator": {
    "id": "uuid_novo_operador",
    "name": "Carlos Souza",
    "email": "carlos@empresa.com"
  },
  "updatedAt": "2025-01-10T12:15:00.000Z"
}
```

---

## 7. Webhooks

### 7.1. Verificação do Webhook

**Endpoint:** `GET /api/webhooks/whatsapp`
**Autenticação:** 🌐 Pública (usado pela Meta)

Endpoint de verificação do webhook usado pela Meta.

**Query Parameters:**
- `hub.mode` - Deve ser "subscribe"
- `hub.verify_token` - Token de verificação
- `hub.challenge` - Challenge para retornar

**Exemplo (Meta irá chamar):**
```bash
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123456"
```

**Response:**
```
123456
```

---

### 7.2. Receber Eventos do WhatsApp

**Endpoint:** `POST /api/webhooks/whatsapp`
**Autenticação:** 🌐 Pública (usado pela Meta)

Recebe eventos do WhatsApp (mensagens, status de entrega, etc).

**Request Body (exemplo de mensagem recebida):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511999999999",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "João Silva"
                },
                "wa_id": "5511888888888"
              }
            ],
            "messages": [
              {
                "from": "5511888888888",
                "id": "wamid.xxx",
                "timestamp": "1234567890",
                "type": "text",
                "text": {
                  "body": "Olá, preciso de ajuda"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "status": "received"
}
```

**Nota:** O webhook processa os eventos de forma assíncrona através de filas BullMQ para responder rapidamente (<200ms) à Meta.

---

## Códigos de Status HTTP

- `200 OK` - Requisição bem-sucedida
- `201 Created` - Recurso criado com sucesso
- `400 Bad Request` - Dados inválidos na requisição
- `401 Unauthorized` - API Key ausente ou inválida
- `404 Not Found` - Recurso não encontrado
- `500 Internal Server Error` - Erro interno do servidor

## Tipos de Mensagem Suportados

### Mensagens de Template (Campanhas)
- Devem usar templates aprovados pela Meta
- Enviadas através de campanhas CSV
- Rate limiting aplicado

### Mensagens 1x1
Tipos suportados:
- `text` - Mensagens de texto
- `image` - Imagens (JPEG, PNG)
- `document` - Documentos (PDF, DOCX, etc)
- `video` - Vídeos (MP4)
- `audio` - Áudios (AAC, MP3)

## Rate Limiting

- Campanhas: 50 mensagens/minuto por padrão (configurável)
- API: Sem limite (configure no proxy/gateway se necessário)
- WhatsApp API: Respeita os limites da Meta baseados em tier da conta

## Paginação

Endpoints de listagem não possuem paginação por padrão. Para grandes volumes, considere adicionar:
- `?page=1&limit=50`

## WebSocket Events

Veja [API_KEY_AUTH.md](API_KEY_AUTH.md) para detalhes completos sobre autenticação e eventos WebSocket em tempo real.

## Suporte

Para dúvidas sobre os endpoints, consulte:
- README.md - Visão geral do projeto
- API_KEY_AUTH.md - Guia de autenticação
- EMBEDDED_SIGNUP_GUIDE.md - Guia de configuração OAuth
