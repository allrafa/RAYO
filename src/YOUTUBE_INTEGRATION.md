# 🎬 Integração YouTube - RAIO

## 📋 Visão Geral

A plataforma RAIO possui integração automática com o canal do YouTube **@eusourafaraio**, exibindo:

- ✅ **Continuar Assistindo**: Vídeos em progresso (não completados)
- ✅ **Shorts RAIO**: Feed vertical de shorts do canal
- ✅ **Feito para Você**: Playlists temáticas do canal
- ✅ **Sistema de Favoritos**: Salvar vídeos preferidos
- ✅ **Tracking de Progresso**: Rastreia visualização de cada vídeo
- ✅ **Analytics**: Vídeos mais assistidos na plataforma

---

## 🚀 Status Atual

**Modo Ativo**: MOCK (Dados de Demonstração)

A integração está funcionando com **dados mock realistas** enquanto a API Key do YouTube não é configurada.

---

## 🔑 Como Ativar a Integração Real

### Passo 1: Criar API Key no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **YouTube Data API v3**
4. Vá em "Credenciais" → "Criar Credenciais" → "Chave de API"
5. Copie a API Key gerada

### Passo 2: Configurar no Código

Edite o arquivo `/components/youtube/YouTubeService.ts`:

```typescript
// Linha 14 - Substitua pela sua API Key real
const API_KEY = 'SUA_API_KEY_AQUI';
```

### Passo 3: Verificar

Após configurar, recarregue a aplicação. Você verá no console:

```
✅ YouTube Integration: Buscando dados do canal @eusourafaraio
```

Se continuar vendo:
```
🎬 YouTube Integration: Usando dados MOCK
```

Significa que a API Key ainda não está configurada corretamente.

---

## 📊 Funcionalidades Implementadas

### 1. Continuar Assistindo
- Mostra vídeos que o usuário começou mas não terminou (< 95% de progresso)
- Fallback: Se não houver vídeos em progresso, mostra os últimos vídeos do canal
- Barra de progresso visual em cada vídeo

### 2. Shorts RAIO
- Feed horizontal de shorts (vídeos < 60s)
- Cards verticais (9:16) otimizados para shorts
- Badge "SHORTS" distintivo

### 3. Feito para Você (Playlists)
- Grid responsivo de playlists do canal
- Cards estilo Spotify
- Contador de vídeos por playlist

### 4. Favoritos
- Sistema completo de favoritar vídeos
- Página dedicada acessível pelo Perfil
- Contador em tempo real no card de atividades

### 5. Player Integrado
- Player fullscreen com YouTube embed
- Tracking automático de progresso
- Botões de favoritar e compartilhar
- Integração com sistema de analytics

### 6. Analytics
- Rastreia vídeos mais assistidos
- Tempo total de visualização
- Taxa média de conclusão
- Histórico de visualizações

---

## 💾 Armazenamento Local

Todos os dados são salvos no `localStorage`:

### Cache do YouTube
```
Chave: raio-youtube-cache
Duração: 1 hora
Conteúdo: Vídeos, playlists e shorts do canal
```

### Dados do Usuário
```
Chave: raio-video-data
Conteúdo:
  - videoProgress: Progresso de cada vídeo
  - favoriteVideos: IDs dos vídeos favoritados
  - analytics: Estatísticas de visualização
```

---

## 🎯 Canal do YouTube

**Canal**: [@eusourafaraio](https://www.youtube.com/@eusourafaraio)

A integração busca automaticamente:
- Últimos 20 vídeos (ordenados por data)
- Até 10 playlists públicas
- Até 15 shorts (vídeos < 60s)

---

## 🔄 Atualização de Dados

- **Automática**: Cache atualiza a cada 1 hora
- **Manual**: Função `refresh()` disponível via hook `useYouTubeData`

```typescript
const { data, loading, refresh } = useYouTubeData();

// Forçar atualização
await refresh();
```

---

## 📱 Experiência do Usuário

### Mobile
- Carrosséis horizontais swipeable
- Player fullscreen otimizado
- Touch targets otimizados (44px mínimo)

### Desktop
- Grid responsivo para playlists
- Hover effects premium
- Keyboard shortcuts no player

---

## 🐛 Troubleshooting

### Problema: Dados não aparecem

**Solução**: Verifique se a API Key está correta e se a YouTube Data API v3 está ativada.

### Problema: Quota excedida

A YouTube Data API v3 tem limite de **10.000 quotas/dia** (gratuito).

Cada operação consome:
- `search.list`: 100 quotas
- `videos.list`: 1 quota
- `playlists.list`: 1 quota

**Solução**: Implementar cache mais agressivo ou usar dados mock.

### Problema: CORS Error

A API do YouTube deve funcionar sem problemas de CORS. Se ocorrer:
- Verifique se a API Key tem restrições de domínio
- Remova restrições de HTTP referrers para desenvolvimento

---

## 🎨 Customização

### Mudar Canal

Edite `/components/youtube/YouTubeService.ts`:

```typescript
const CHANNEL_USERNAME = '@seucanal';
```

### Ajustar Quantidade de Vídeos

```typescript
await fetchVideos(channelId, 30); // Buscar 30 vídeos
await fetchPlaylists(channelId, 15); // Buscar 15 playlists
await fetchShorts(channelId, 20); // Buscar 20 shorts
```

### Modificar Duração do Cache

```typescript
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 horas
```

---

## 📈 Próximos Passos

- [ ] Implementar paginação de vídeos
- [ ] Adicionar filtros por categoria
- [ ] Integrar comentários do YouTube
- [ ] Criar playlists customizadas
- [ ] Adicionar notificações de novos vídeos
- [ ] Sistema de recomendações baseado em IA

---

## 💡 Dicas

1. **Durante desenvolvimento**: Use dados mock para economizar quota da API
2. **Em produção**: Configure API Key com restrições de domínio
3. **Performance**: O cache de 1 hora é ideal para balance entre atualização e quota
4. **UX**: Sempre mostre skeleton loaders durante carregamento

---

## 📞 Suporte

Para dúvidas sobre a integração YouTube:
- Documentação oficial: [YouTube Data API v3](https://developers.google.com/youtube/v3)
- Console do Google Cloud: [console.cloud.google.com](https://console.cloud.google.com/)

---

**Última atualização**: Janeiro 2025
**Versão**: 1.0.0
