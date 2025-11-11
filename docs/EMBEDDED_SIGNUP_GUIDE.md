# Guia Completo: WhatsApp Embedded Signup

Este guia detalha como configurar e usar o Embedded Signup para conectar contas do WhatsApp Business de forma automática.

## O que é Embedded Signup?

Embedded Signup é o fluxo OAuth oficial da Meta que permite que seus usuários conectem suas contas do WhatsApp Business diretamente pela sua aplicação, sem precisar:
- Criar System Users manualmente
- Copiar e colar tokens
- Configurar permissões manualmente

## Pré-requisitos

1. Conta Meta for Developers
2. App criado no Meta for Developers
3. Produto WhatsApp adicionado ao App
4. Domínio público ou ngrok (para callback)

## Passo a Passo

### 1. Configurar App no Meta for Developers

#### 1.1. Criar/Acessar App
- Acesse: https://developers.facebook.com/apps/
- Crie um novo App ou selecione um existente
- Tipo: **Business**

#### 1.2. Adicionar Produto WhatsApp
- No painel do App, clique em **Add Product**
- Selecione **WhatsApp** → **Set Up**

#### 1.3. Obter Credenciais
- Vá em **App Settings** → **Basic**
- Copie:
  - **App ID**
  - **App Secret** (clique em Show)
- Adicione ao `.env`:
  ```env
  META_APP_ID=seu_app_id_aqui
  META_APP_SECRET=seu_app_secret_aqui
  ```

### 2. Configurar OAuth Redirect URI

#### 2.1. Desenvolvimento Local (com ngrok)
```bash
# Instale ngrok
npm install -g ngrok

# Inicie o túnel
ngrok http 3000

# Copie a URL (ex: https://abc123.ngrok.io)
```

#### 2.2. Configurar no Meta
- Vá em **WhatsApp** → **Configuration**
- Em **OAuth Redirect URIs**, adicione:
  - Desenvolvimento: `https://abc123.ngrok.io/api/auth/whatsapp/callback`
  - Produção: `https://seu-dominio.com/api/auth/whatsapp/callback`

#### 2.3. Atualizar .env
```env
OAUTH_REDIRECT_URI=https://abc123.ngrok.io/api/auth/whatsapp/callback
```

### 3. Configurar Webhook

Ainda é necessário configurar o webhook para receber mensagens:

#### 3.1. No Meta Dashboard
- Vá em **WhatsApp** → **Configuration**
- Em **Webhook**, clique em **Edit**
- Configure:
  - **Callback URL**: `https://abc123.ngrok.io/api/webhooks/whatsapp`
  - **Verify Token**: Mesmo valor de `WEBHOOK_VERIFY_TOKEN` no `.env`
- Clique em **Verify and Save**

#### 3.2. Subscrever Campos
- Em **Webhook Fields**, ative:
  - ☑️ **messages**
  - ☑️ **message_status**

### 4. Testar Embedded Signup

#### 4.1. Iniciar Aplicação
```bash
# Com Docker
docker-compose up -d

# Ou localmente
npm run start:dev
```

#### 4.2. Acessar Página de Signup
- Abra: http://localhost:3000/api/auth/whatsapp/signup-page
- Ou use ngrok: https://abc123.ngrok.io/api/auth/whatsapp/signup-page

#### 4.3. Conectar Conta
1. Clique em **"Conectar WhatsApp Business"**
2. Faça login com sua conta Facebook/Meta
3. Selecione o WhatsApp Business Account
4. Autorize as permissões:
   - `business_management`
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
5. Aguarde redirecionamento

#### 4.4. Verificar Conexão
A aplicação automaticamente:
- ✅ Troca o código por access token
- ✅ Obtém long-lived token (60 dias)
- ✅ Cria registro em `accounts` no banco
- ✅ Lista e cria registros de números em `numbers`

Verifique no banco:
```sql
SELECT * FROM accounts;
SELECT * FROM numbers;
```

## Fluxo Técnico

### Diagrama do Fluxo
```
Usuário                    App                     Meta/Facebook
  |                         |                           |
  |-- Clica "Conectar" ---->|                           |
  |                         |                           |
  |                         |-- GET /auth/whatsapp ---->|
  |                         |                           |
  |<----- Redirect OAuth URL (com app_id) --------------|
  |                         |                           |
  |-- Login + Autoriza ---->|                           |
  |                         |                           |
  |<----- Redirect com código --------------------------|
  |                         |                           |
  |                         |<-- POST /callback?code=xxx|
  |                         |                           |
  |                         |-- Exchange code for token->|
  |                         |                           |
  |                         |<-- Short-lived token ------|
  |                         |                           |
  |                         |-- Get long-lived token --->|
  |                         |                           |
  |                         |<-- Long-lived token -------|
  |                         |                           |
  |                         |-- Get WABA info ---------->|
  |                         |                           |
  |                         |<-- Business accounts ------|
  |                         |                           |
  |                         |-- Save to database --------|
  |                         |                           |
  |<----- Success + Account Info ------------------------|
```

### Endpoints Implementados

#### 1. GET `/api/auth/whatsapp/signup-page`
Retorna página HTML com botão de signup.

#### 2. GET `/api/auth/whatsapp`
Retorna URL OAuth para iniciar fluxo.

**Response:**
```json
{
  "url": "https://www.facebook.com/v21.0/dialog/oauth?client_id=...",
  "message": "Redirect user to this URL"
}
```

#### 3. GET `/api/auth/whatsapp/callback`
Recebe código OAuth e processa automaticamente.

**Query Params:**
- `code`: Authorization code
- `state`: Random state (CSRF protection)
- `error`: Error code (if failed)

**Response (Success):**
```json
{
  "success": true,
  "message": "WhatsApp Business Account connected successfully",
  "data": {
    "accountId": "uuid",
    "accountName": "My Business",
    "businessId": "123456789",
    "phoneNumbers": 2,
    "allWabas": [...]
  }
}
```

#### 4. GET `/api/auth/whatsapp/setup`
Setup manual de um WABA específico.

**Query Params:**
- `wabaId`: WhatsApp Business Account ID
- `accessToken`: Access token
- `accountName`: Nome da conta (opcional)

#### 5. GET `/api/auth/whatsapp/accounts`
Lista todos WABAs disponíveis para um token.

**Query Params:**
- `accessToken`: Access token

#### 6. GET `/api/auth/whatsapp/debug`
Debug informações do token.

**Query Params:**
- `accessToken`: Access token

## Tokens: Short-lived vs Long-lived

### Short-lived Token
- Duração: ~1 hora
- Obtido após OAuth
- Deve ser trocado por long-lived

### Long-lived Token
- Duração: ~60 dias
- Não expira automaticamente se em uso
- Usado para chamadas API

A aplicação **automaticamente** troca short-lived por long-lived no callback.

## Renovação de Tokens

Tokens long-lived não expiram se a aplicação estiver em uso ativo. Porém, para renovar:

```bash
GET /api/auth/whatsapp/debug?accessToken=xxx
```

Se token expirar, usuário deve refazer Embedded Signup.

## Troubleshooting

### Erro: "redirect_uri_mismatch"
**Causa:** URI de callback não corresponde ao configurado no Meta.
**Solução:**
1. Verifique `.env`: `OAUTH_REDIRECT_URI`
2. Verifique Meta Dashboard: OAuth Redirect URIs
3. URLs devem ser **exatamente iguais** (incluindo http/https, porta)

### Erro: "invalid_client"
**Causa:** APP_ID ou APP_SECRET incorretos.
**Solução:** Verifique `.env` e Meta App Settings → Basic.

### Erro: "access_denied"
**Causa:** Usuário cancelou autorização.
**Solução:** Tente novamente.

### Webhook não recebe mensagens
**Causa:** Webhook não configurado ou URL incorreta.
**Solução:**
1. Configure webhook no Meta Dashboard
2. Use ngrok para desenvolvimento
3. Verifique logs: `docker-compose logs -f app`

### Conta criada mas números não aparecem
**Causa:** Números não ativos ou sem permissão.
**Solução:**
1. Verifique permissões no Meta Business Manager
2. Ative números no Meta Dashboard

## Integração com Frontend

### React Example
```typescript
import { useState } from 'react';

function WhatsAppConnect() {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/whatsapp');
      const data = await response.json();

      // Redirect to Meta OAuth
      window.location.href = data.url;
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  return (
    <button onClick={handleConnect} disabled={loading}>
      {loading ? 'Conectando...' : 'Conectar WhatsApp Business'}
    </button>
  );
}
```

### Callback Handler (React)
```typescript
// pages/callback.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');

    if (success === 'true') {
      // Show success message
      alert('WhatsApp conectado com sucesso!');
      router.push('/dashboard');
    } else {
      // Show error
      alert('Falha ao conectar WhatsApp');
      router.push('/');
    }
  }, []);

  return <div>Processando...</div>;
}
```

## Produção

### Checklist
- [ ] Domínio configurado com HTTPS
- [ ] OAuth Redirect URI atualizado no Meta
- [ ] Webhook URL atualizado no Meta
- [ ] Variáveis de ambiente configuradas
- [ ] App em modo Production no Meta (após testes)

### Configurar HTTPS (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Segurança

### Boas Práticas
1. **Nunca exponha** `META_APP_SECRET` no frontend
2. **Use HTTPS** em produção
3. **Valide state** no callback (CSRF protection)
4. **Rotacione tokens** periodicamente
5. **Limite permissões** ao mínimo necessário
6. **Monitore uso** de tokens

## Recursos Adicionais

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [Embedded Signup Guide](https://developers.facebook.com/docs/whatsapp/embedded-signup)
- [OAuth Best Practices](https://developers.facebook.com/docs/facebook-login/security)

## Suporte

Para problemas ou dúvidas:
1. Verifique logs: `docker-compose logs -f app`
2. Verifique banco: `npx prisma studio`
3. Debug token: `GET /api/auth/whatsapp/debug?accessToken=xxx`
4. Abra issue no GitHub
