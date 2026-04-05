# 🔑 Configuração da API do YouTube - Guia Passo a Passo

## ✅ Você Já Tem

- ✅ Projeto no Google Cloud Console
- ✅ Client ID OAuth: `854679233329-fjnghomuob4d1jobigkiudev6mfa6ofr.apps.googleusercontent.com`
- ✅ Client Secret OAuth: `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H`

## 📋 O Que Você Precisa Fazer Agora

### Passo 1: Ativar YouTube Data API v3

1. Acesse: https://console.cloud.google.com/
2. Verifique se está no projeto correto (ID: `854679233329`)
3. No menu lateral, vá em **"APIs e Serviços"** → **"Biblioteca"**
4. No campo de busca, digite: **"YouTube Data API v3"**
5. Clique no resultado e depois em **"ATIVAR"**

### Passo 2: Criar API Key

1. No menu lateral, vá em **"APIs e Serviços"** → **"Credenciais"**
2. Clique no botão azul **"+ CRIAR CREDENCIAIS"** (topo da página)
3. No menu dropdown, selecione **"Chave de API"**
4. Uma janela aparecerá com sua nova API Key
5. Clique em **"COPIAR"** para copiar a chave

**Exemplo de como a API Key aparece:**
```
AIzaSyC1234567890abcdefghijklmnopqrstuv
```

### Passo 3: Configurar no Código

1. Abra o arquivo: `/components/youtube/YouTubeService.ts`
2. Encontre a linha 14:
   ```typescript
   const API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE';
   ```
3. Substitua `'YOUR_YOUTUBE_API_KEY_HERE'` pela sua API Key:
   ```typescript
   const API_KEY = 'AIzaSyC1234567890abcdefghijklmnopqrstuv';
   ```

### Passo 4: Testar

1. Salve o arquivo
2. Recarregue a aplicação no navegador
3. Abra o Console do navegador (F12)
4. Procure por mensagens do tipo:
   ```
   ✅ YouTube Integration: Buscando dados do canal @eusourafaraio
   ```

Se aparecer isso, está funcionando! ✨

---

## 🔒 Segurança da API Key

### ⚠️ Importante

API Keys são públicas e podem ser vistas no código frontend. Para proteger sua quota:

#### 1. Adicionar Restrições (Recomendado)

No Google Cloud Console:

1. Vá em **"Credenciais"**
2. Clique na sua API Key
3. Em **"Restrições de aplicativo"**, selecione:
   - **"Referenciadores HTTP (sites)"**
4. Adicione os domínios permitidos:
   ```
   https://seusite.com/*
   http://localhost:*
   ```

#### 2. Restringir APIs

1. Na mesma tela, em **"Restrições de API"**
2. Selecione **"Restringir chave"**
3. Escolha apenas: **"YouTube Data API v3"**

---

## 📊 Limites da API (Gratuito)

- **Quota diária**: 10.000 unidades/dia
- **Custo por operação**:
  - `search.list` = 100 unidades
  - `videos.list` = 1 unidade
  - `playlists.list` = 1 unidade

### Como Economizar Quota

✅ **Cache implementado**: Dados são cacheados por 1 hora  
✅ **Busca otimizada**: Apenas 20 vídeos por vez  
✅ **Dados mock**: Usa dados de exemplo quando API Key não configurada

### Monitorar Uso

1. Google Cloud Console → **"APIs e Serviços"** → **"Painel"**
2. Selecione **"YouTube Data API v3"**
3. Veja gráficos de uso em tempo real

---

## 🐛 Troubleshooting

### Problema: "API key not valid"

**Solução:**
1. Verifique se a YouTube Data API v3 está ativada
2. Certifique-se de copiar a API Key completa (sem espaços)
3. Aguarde alguns minutos (pode levar até 5min para ativar)

### Problema: "Daily quota exceeded"

**Solução:**
1. Seu limite de 10.000 unidades/dia foi atingido
2. Aguarde até meia-noite (Pacific Time)
3. Considere usar cache mais agressivo

### Problema: "Access Not Configured"

**Solução:**
1. A YouTube Data API v3 não está ativada
2. Vá para o Passo 1 deste guia

---

## 🎯 Canal Configurado

A integração busca dados do canal:

**Username**: `@eusourafaraio`

Para mudar o canal, edite a linha 11 em `/components/youtube/YouTubeService.ts`:

```typescript
const CHANNEL_USERNAME = '@seucanal';
```

---

## 📱 Teste Rápido no Console

Você pode testar sua API Key diretamente no navegador:

```
https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UC_CHANNEL_ID&maxResults=1&key=SUA_API_KEY
```

Se retornar JSON com dados, está funcionando! ✅

---

## ❓ FAQ

### Preciso das credenciais OAuth que você me deu?

**Não**. As credenciais OAuth são para acessar dados privados do usuário. Para buscar vídeos públicos de um canal, apenas a API Key é necessária.

### Posso usar em produção?

**Sim**, mas adicione restrições de domínio (veja seção Segurança).

### A API Key é gratuita?

**Sim**, até 10.000 unidades/dia. Depois disso, você pode solicitar aumento de quota ou pagar por uso extra.

### Quanto custa após o limite?

Aproximadamente **$0.30 USD** por 1.000 unidades extras. Mas o cache implementado é muito eficiente e você provavelmente não ultrapassará o limite gratuito.

---

## 📞 Precisa de Ajuda?

- **Documentação oficial**: https://developers.google.com/youtube/v3
- **Console do Google**: https://console.cloud.google.com/
- **Status da API**: https://status.cloud.google.com/

---

**Última atualização**: Janeiro 2025  
**Status**: ⚠️ Aguardando configuração da API Key
