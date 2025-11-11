# Guia de Segurança e Autenticação JWT

## Visão Geral

O sistema implementa autenticação JWT (JSON Web Tokens) para proteger todos os endpoints da API. Apenas o webhook do WhatsApp e os endpoints de autenticação são públicos.

## Arquitetura de Segurança

### Componentes

1. **JWT Access Token**: Token de curta duração (15min) para acessar API
2. **Refresh Token**: Token de longa duração (7 dias) para renovar access token
3. **Guard Global**: Protege TODOS os endpoints por padrão
4. **@Public() Decorator**: Marca endpoints que não precisam autenticação
5. **WebSocket Auth**: Valida JWT em conexões WebSocket

### Fluxo de Autenticação

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Cliente   │         │     API      │         │  Database   │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │ 1. POST /auth/login   │                        │
       ├──────────────────────>│                        │
       │   email + password    │                        │
       │                       │ 2. Validar credenciais │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │ 3. Operator válido     │
       │                       │<───────────────────────┤
       │                       │                        │
       │ 4. Access + Refresh   │ 5. Save refresh token  │
       │<──────────────────────┤───────────────────────>│
       │                       │                        │
       │ 6. GET /conversations │                        │
       ├──────────────────────>│                        │
       │ Authorization: Bearer │                        │
       │                       │ 7. Validate JWT        │
       │                       ├──────────┐             │
       │                       │          │             │
       │                       │<─────────┘             │
       │                       │                        │
       │ 8. Response           │                        │
       │<──────────────────────┤                        │
```

## Endpoints de Autenticação

### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "operador@exemplo.com",
  "password": "senha123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "operator": {
    "id": "uuid",
    "email": "operador@exemplo.com",
    "name": "João Silva",
    "isActive": true,
    "maxConcurrent": 5
  }
}
```

**Errors:**
- `401 Unauthorized`: Credenciais inválidas
- `401 Unauthorized`: Operador inativo

### 2. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Logout
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

**Response:** `204 No Content`

### 4. Get Profile
```http
POST /api/auth/me
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "operador@exemplo.com",
  "name": "João Silva",
  "isActive": true,
  "maxConcurrent": 5
}
```

## Como Usar JWT nos Requests

### HTTP Requests
Adicione o header `Authorization` com o access token:

```bash
curl -H "Authorization: Bearer {accessToken}" \
  http://localhost:3000/api/conversations
```

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:3000/api/conversations', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const conversations = await api.get('/conversations');
```

## WebSocket Authentication

### Conectar com Token

**Opção 1: Query Parameter**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: {
    token: accessToken
  }
});
```

**Opção 2: Auth Object**
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken
  }
});
```

**Opção 3: Headers**
```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

### Exemplo Completo (React)
```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

function useWebSocket(accessToken: string) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const newSocket = io('http://localhost:3000', {
      auth: { token: accessToken }
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');

      // Join operator room
      newSocket.emit('operator:join', {
        operatorId: 'operator-id-here'
      });
    });

    newSocket.on('new_conversation', (data) => {
      console.log('New conversation:', data);
    });

    newSocket.on('new_message', (data) => {
      console.log('New message:', data);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  return socket;
}
```

## Endpoints Públicos

Os seguintes endpoints NÃO requerem autenticação:

### Webhooks
- `GET /api/webhooks/whatsapp` - Verificação do webhook
- `POST /api/webhooks/whatsapp` - Recebimento de eventos

### WhatsApp OAuth (Embedded Signup)
- `GET /api/auth/whatsapp` - Obter URL OAuth
- `GET /api/auth/whatsapp/callback` - Callback OAuth
- `GET /api/auth/whatsapp/signup-page` - Página de signup
- `GET /api/auth/whatsapp/setup` - Setup manual
- `GET /api/auth/whatsapp/accounts` - Listar WABAs
- `GET /api/auth/whatsapp/debug` - Debug token

### Autenticação JWT
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

## Gestão de Tokens

### Access Token
- **Duração**: 15 minutos (configurável via `JWT_EXPIRATION`)
- **Uso**: Todas as requisições à API
- **Armazenamento**: Memória (não persistir)
- **Renovação**: Via refresh token

### Refresh Token
- **Duração**: 7 dias (configurável via `JWT_REFRESH_EXPIRATION`)
- **Uso**: Renovar access token
- **Armazenamento**: httpOnly cookie ou secure storage
- **Segurança**: Hash armazenado no banco

### Boas Práticas

1. **Nunca** armazene access token em localStorage
2. Use httpOnly cookies para refresh tokens
3. Implemente auto-refresh antes do token expirar
4. Faça logout ao detectar 401
5. Use HTTPS em produção

### Exemplo de Auto-Refresh
```typescript
let accessToken = '';
let refreshToken = '';
let refreshTimeout: NodeJS.Timeout;

async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;

  // Schedule refresh 1 minute before expiration
  scheduleTokenRefresh(14 * 60 * 1000); // 14 minutes
}

async function refreshAccessToken() {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();
    accessToken = data.accessToken;

    scheduleTokenRefresh(14 * 60 * 1000);
  } catch (error) {
    // Refresh failed, redirect to login
    window.location.href = '/login';
  }
}

function scheduleTokenRefresh(delay: number) {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(refreshAccessToken, delay);
}
```

## Primeiro Acesso (Setup Inicial)

### Opção 1: Via Migration SQL
O sistema já cria operadores existentes com senha padrão `password123`.

### Opção 2: Criar Operador via Prisma Studio
```bash
# Abrir Prisma Studio
npx prisma studio

# Ou via CLI
npx prisma db seed
```

### Opção 3: Via SQL Direto
```sql
-- Senha: password123
-- Hash: $2b$10$XqvD1p2dHZv8cQv9yC7YuOxKhP0K1R/YJf8fC8kFZ8ZCXyYJYJ0Iu

INSERT INTO operators (id, name, email, password, "isActive", "maxConcurrent")
VALUES (
  gen_random_uuid(),
  'Admin',
  'admin@example.com',
  '$2b$10$XqvD1p2dHZv8cQv9yC7YuOxKhP0K1R/YJf8fC8kFZ8ZCXyYJYJ0Iu',
  true,
  10
);
```

### Opção 4: Criar Script de Seed
Crie `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.operator.create({
    data: {
      name: 'Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      isActive: true,
      maxConcurrent: 10,
    },
  });

  console.log('Admin operator created!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Execute:
```bash
npx ts-node prisma/seed.ts
```

## Segurança em Produção

### Variáveis de Ambiente
```env
# ALTERE ESTES VALORES EM PRODUÇÃO!
JWT_SECRET=gere_uma_chave_forte_aqui_com_openssl_rand_base64_32
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=gere_outra_chave_forte_aqui_com_openssl_rand_base64_32
JWT_REFRESH_EXPIRATION=7d
```

### Gerar Secrets Seguros
```bash
# Gerar JWT_SECRET
openssl rand -base64 32

# Gerar JWT_REFRESH_SECRET
openssl rand -base64 32
```

### Checklist de Segurança

- [ ] Alterar `JWT_SECRET` e `JWT_REFRESH_SECRET`
- [ ] Usar HTTPS em produção
- [ ] Configurar CORS adequadamente
- [ ] Implementar rate limiting
- [ ] Implementar account lockout após tentativas falhas
- [ ] Adicionar logs de segurança
- [ ] Implementar 2FA (opcional)
- [ ] Rotação de secrets periodicamente
- [ ] Validar força de senhas
- [ ] Implementar política de expiração de senhas

## Troubleshooting

### Erro: "Unauthorized"
**Causa**: Token inválido, expirado ou ausente.
**Solução**: Faça login novamente ou refresh o token.

### WebSocket não conecta
**Causa**: Token não enviado ou inválido.
**Solução**: Verifique se está passando o token corretamente.

### Token expira muito rápido
**Causa**: `JWT_EXPIRATION` muito curto.
**Solução**: Aumente o valor em `.env` (ex: `30m`, `1h`).

### "Invalid refresh token"
**Causa**: Refresh token expirou ou foi invalidado.
**Solução**: Faça login novamente.

### Não consegue fazer login
**Causa**: Senha incorreta ou operador inativo.
**Solução**: Verifique credenciais no banco ou reset senha.

## API Testing

### Postman Collection
Importe a collection em `docs/postman_collection.json`.

### cURL Examples
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Get conversations (com token)
curl http://localhost:3000/api/conversations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

## Recursos Adicionais

- [JWT.io](https://jwt.io/) - Debugar tokens JWT
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport.js](http://www.passportjs.org/)
