# Autenticação com API Key

## Visão Geral

O sistema usa autenticação simples com **API Key fixo** configurado via variável de ambiente. Não há sistema de login ou JWT complexo - apenas um token fixo que autoriza todas as requisições.

## Configuração

### 1. Definir API Key no .env

```env
API_KEY=my_super_secret_api_key_change_in_production_abc123xyz
```

**⚠️ IMPORTANTE**:
- Gere uma chave forte e aleatória em produção
- Nunca commite o `.env` no git
- Use diferentes chaves para dev/staging/prod

### Gerar API Key Seguro

```bash
# Opção 1: OpenSSL
openssl rand -hex 32

# Opção 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opção 3: UUID
uuidgen
```

## Como Usar

### HTTP Requests

**Opção 1: Header X-API-Key (Recomendado)**
```bash
curl -H "X-API-Key: my_super_secret_api_key" \
  http://localhost:3000/api/conversations
```

**Opção 2: Authorization Bearer**
```bash
curl -H "Authorization: Bearer my_super_secret_api_key" \
  http://localhost:3000/api/conversations
```

### JavaScript/Fetch

```javascript
const API_KEY = 'my_super_secret_api_key';

fetch('http://localhost:3000/api/conversations', {
  headers: {
    'X-API-Key': API_KEY,
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
    'X-API-Key': 'my_super_secret_api_key'
  }
});

// Usar em todas as requisições
const conversations = await api.get('/conversations');
```

### Postman

1. Na aba **Headers**, adicione:
   - Key: `X-API-Key`
   - Value: `my_super_secret_api_key`

2. Ou use **Authorization**:
   - Type: `Bearer Token`
   - Token: `my_super_secret_api_key`

## WebSocket Authentication

### Conectar com API Key

**Opção 1: Query Parameter (Recomendado)**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: {
    apiKey: 'my_super_secret_api_key'
  }
});
```

**Opção 2: Auth Object**
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    apiKey: 'my_super_secret_api_key'
  }
});
```

**Opção 3: Headers**
```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    'X-API-Key': 'my_super_secret_api_key'
  }
});
```

**Opção 4: Authorization Header**
```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    'Authorization': 'Bearer my_super_secret_api_key'
  }
});
```

### Exemplo Completo (React)

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const API_KEY = process.env.REACT_APP_API_KEY;

function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      query: { apiKey: API_KEY }
    });

    newSocket.on('connect', () => {
      console.log('Connected!');
    });

    newSocket.on('new_conversation', (data) => {
      console.log('New conversation:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
}
```

## Endpoints Públicos

Os seguintes endpoints **NÃO requerem** API Key:

- 🌐 `GET/POST /api/webhooks/whatsapp` - Webhook do WhatsApp (Meta precisa acessar)
- 🌐 `GET /api/auth/whatsapp/*` - OAuth do WhatsApp (Embedded Signup)

## Endpoints Protegidos

Todos os outros endpoints **REQUEREM** API Key:

- 🔒 Accounts, Numbers, Operators, Tabulations
- 🔒 Campaigns, Conversations
- 🔒 Todos os endpoints de gerenciamento

## Segurança

### Boas Práticas

1. **Nunca** exponha a API Key no frontend público
2. Use **HTTPS** em produção
3. **Rotacione** a chave periodicamente
4. Use **diferentes chaves** para dev/prod
5. Armazene em **variáveis de ambiente**, nunca no código
6. Adicione **rate limiting** no gateway/proxy
7. **Monitore** uso da API Key
8. Use **secrets management** (AWS Secrets Manager, Vault, etc)

### Implementação Adicional (Opcional)

Para maior segurança, você pode:

1. **Rate Limiting por IP**
```bash
npm install @nestjs/throttler
```

2. **IP Whitelist**
```typescript
// No Guard, adicionar:
const allowedIPs = ['192.168.1.1', '10.0.0.1'];
const clientIP = request.ip;
if (!allowedIPs.includes(clientIP)) {
  throw new UnauthorizedException();
}
```

3. **Múltiplas API Keys** (por cliente)
```typescript
// No .env:
API_KEYS=key1,key2,key3

// No Guard:
const validKeys = this.configService.get('API_KEYS').split(',');
if (!validKeys.includes(apiKey)) {
  throw new UnauthorizedException();
}
```

## Erros Comuns

### 401 Unauthorized

**Causa**: API Key ausente ou inválido.

**Soluções**:
- Verifique se está enviando o header `X-API-Key` ou `Authorization`
- Confirme que o valor está correto (sem espaços extras)
- Verifique o `.env` do servidor

### WebSocket não conecta

**Causa**: API Key não enviado na conexão.

**Solução**: Envie via `query`, `auth` ou `extraHeaders`

### API Key não funciona após mudança

**Causa**: Servidor não reiniciado.

**Solução**: Reinicie o servidor após alterar `.env`

```bash
docker-compose restart app
```

## Produção

### Checklist

- [ ] API Key forte e aleatório gerado
- [ ] `.env` não commitado no git
- [ ] HTTPS configurado
- [ ] CORS configurado corretamente
- [ ] Rate limiting implementado
- [ ] Logs de acesso configurados
- [ ] Secrets em vault/secret manager
- [ ] Rotação periódica de chaves

### Nginx + HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Pass real IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Testes

### Testar API Key

```bash
# Sem API Key (deve dar 401)
curl http://localhost:3000/api/conversations

# Com API Key correto (deve funcionar)
curl -H "X-API-Key: my_super_secret_api_key" \
  http://localhost:3000/api/conversations

# Com API Key errado (deve dar 401)
curl -H "X-API-Key: wrong_key" \
  http://localhost:3000/api/conversations
```

## Migrando de Outro Sistema

Se você já usa outro sistema de auth e quer migrar:

1. **De JWT/OAuth**: Remova lógica de login, use apenas API Key
2. **De Basic Auth**: Substitua username:password por API Key
3. **Sem Auth**: Adicione API Key em todos os clients

## FAQ

**P: Preciso fazer login?**
R: Não! Basta configurar a API Key e usar em todos os requests.

**P: A API Key expira?**
R: Não, a menos que você mude manualmente no `.env`.

**P: Posso ter múltiplas API Keys?**
R: Sim, veja a seção "Implementação Adicional" acima.

**P: Como revogar acesso?**
R: Mude a API Key no `.env` e reinicie o servidor.

**P: É seguro?**
R: Sim, se usar HTTPS, rate limiting e boas práticas de secrets management.

## Suporte

Para dúvidas ou problemas:
- Verifique logs: `docker-compose logs -f app`
- Confirme `.env`: `cat .env | grep API_KEY`
- Teste manualmente com cURL
