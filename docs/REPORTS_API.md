# 📊 API de Relatórios

Este documento descreve os endpoints da API de relatórios do Meta-MicroService.

## Base URL

```
/reports
```

## Autenticação

Todos os endpoints requerem autenticação via API Key no header:

```
x-api-key: your-api-key-here
```

---

## 📈 Endpoints Disponíveis

### 1. Relatório de Operadores

Retorna estatísticas detalhadas sobre os operadores.

**Endpoint:** `GET /reports/operators`

**Parâmetros Query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `dateFrom` | string (ISO 8601) | Não | Data de início do período (YYYY-MM-DD) |
| `dateTo` | string (ISO 8601) | Não | Data de fim do período (YYYY-MM-DD) |
| `operatorId` | string | Não | Filtrar por ID específico do operador |

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.example.com/reports/operators?dateFrom=2025-01-01&dateTo=2025-01-31" \
  -H "x-api-key: your-api-key"
```

**Exemplo de Resposta:**

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

---

### 2. Relatório de Conversas

Retorna informações detalhadas sobre todas as conversas.

**Endpoint:** `GET /reports/conversations`

**Parâmetros Query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `dateFrom` | string (ISO 8601) | Não | Data de início do período |
| `dateTo` | string (ISO 8601) | Não | Data de fim do período |
| `operatorId` | string | Não | Filtrar por operador |
| `status` | string | Não | Filtrar por status (OPEN, CLOSED) |
| `tabulationId` | string | Não | Filtrar por tabulação |

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.example.com/reports/conversations?status=CLOSED&dateFrom=2025-01-01" \
  -H "x-api-key: your-api-key"
```

**Exemplo de Resposta:**

```json
[
  {
    "conversationId": "conv-uuid-123",
    "customerPhone": "5511999999999",
    "customerName": "Maria Santos",
    "customerContract": "12345",
    "customerCpf": "12345678900",
    "operatorName": "João Silva",
    "operatorEmail": "joao@example.com",
    "status": "CLOSED",
    "tabulationName": "Pagamento Realizado",
    "notes": "Cliente pagou a fatura",
    "totalMessages": 15,
    "inboundMessages": 8,
    "outboundMessages": 7,
    "cpcMarked": "Não",
    "cpcMarkedAt": null,
    "phoneNumber": "+5511987654321",
    "phoneDisplayName": "Atendimento Principal",
    "createdAt": "2025-01-15T10:30:00Z",
    "lastMessageAt": "2025-01-15T11:45:00Z",
    "closedAt": "2025-01-15T12:00:00Z"
  }
]
```

---

### 3. Produtividade dos Operadores

Retorna métricas de produtividade dos operadores.

**Endpoint:** `GET /reports/operators/productivity`

**Parâmetros Query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `dateFrom` | string (ISO 8601) | Não | Data de início do período |
| `dateTo` | string (ISO 8601) | Não | Data de fim do período |

**Exemplo de Resposta:**

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

---

### 4. Conversas por Período

Agrupa conversas por período (dia, semana ou mês).

**Endpoint:** `GET /reports/conversations/by-period`

**Parâmetros Query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `dateFrom` | string (ISO 8601) | Não | Data de início |
| `dateTo` | string (ISO 8601) | Não | Data de fim |
| `groupBy` | string | Não | Agrupar por: day, week, month (padrão: day) |

**Exemplo de Resposta:**

```json
[
  {
    "period": "2025-01-15",
    "total": 45,
    "open": 10,
    "closed": 35
  },
  {
    "period": "2025-01-16",
    "total": 52,
    "open": 15,
    "closed": 37
  }
]
```

---

### 5. Conversas por Tabulação

Agrupa conversas fechadas por tipo de tabulação.

**Endpoint:** `GET /reports/conversations/by-tabulation`

**Parâmetros Query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `dateFrom` | string (ISO 8601) | Não | Data de início |
| `dateTo` | string (ISO 8601) | Não | Data de fim |

**Exemplo de Resposta:**

```json
[
  {
    "tabulationId": "tab-uuid-123",
    "tabulationName": "Pagamento Realizado",
    "count": 85,
    "withCpc": 12,
    "withoutCpc": 73
  },
  {
    "tabulationId": "tab-uuid-456",
    "tabulationName": "Cliente Não Respondeu",
    "count": 45,
    "withCpc": 8,
    "withoutCpc": 37
  }
]
```

---

## 📥 Exportação para CSV

Os dados dos endpoints podem ser facilmente exportados para CSV usando a interface web ou programaticamente.

### Frontend - Integração

A interface web já possui integração com os endpoints:

1. **Relatório de Operadores** - Exporta produtividade e métricas dos operadores
2. **Relatório de Conversas** - Exporta conversas com todos os detalhes

**Campos CSV - Relatório de Operadores:**

- Nome do Operador
- Email
- Total de Conversas
- Conversas Abertas
- Conversas Fechadas
- Total de Mensagens
- Conversas com CPC

**Campos CSV - Relatório de Conversas:**

- ID Conversa
- Nome Cliente
- Telefone
- Contrato
- CPF
- Operador
- Email Operador
- Status
- Tabulação
- Total Mensagens
- Mensagens Recebidas
- Mensagens Enviadas
- CPC Marcado
- Data Abertura
- Data Fechamento
- Observações

---

## 💡 Casos de Uso

### 1. Análise de Desempenho Semanal

```bash
curl -X GET "https://api.example.com/reports/operators/productivity?dateFrom=2025-01-15&dateTo=2025-01-22" \
  -H "x-api-key: your-api-key"
```

### 2. Auditoria de Conversas Fechadas

```bash
curl -X GET "https://api.example.com/reports/conversations?status=CLOSED&dateFrom=2025-01-01&dateTo=2025-01-31" \
  -H "x-api-key: your-api-key"
```

### 3. Análise de Tabulações

```bash
curl -X GET "https://api.example.com/reports/conversations/by-tabulation?dateFrom=2025-01-01&dateTo=2025-01-31" \
  -H "x-api-key: your-api-key"
```

### 4. Tendências Diárias

```bash
curl -X GET "https://api.example.com/reports/conversations/by-period?groupBy=day&dateFrom=2025-01-01&dateTo=2025-01-31" \
  -H "x-api-key: your-api-key"
```

---

## ⚠️ Observações

1. **Performance**: Para grandes volumes de dados, recomenda-se usar filtros de data para otimizar a performance
2. **Timezone**: Todas as datas são tratadas no timezone UTC
3. **Paginação**: Atualmente não há paginação. Para grandes volumes, use filtros específicos
4. **Cache**: Os relatórios são gerados em tempo real sem cache

---

## 🔄 Futuras Melhorias

- [ ] Paginação para grandes volumes
- [ ] Cache de relatórios
- [ ] Exportação direta para Excel
- [ ] Gráficos e visualizações
- [ ] Relatórios agendados
- [ ] Webhooks para relatórios automáticos

