# Realtime — Socket.IO único (DM + Comunidade + Notificações)

> Status: ativo. **Task #229** removeu o SSE legado por completo. Socket.IO é o **transporte único** de realtime na plataforma — DM, Comunidade e Notificações trafegam pelo mesmo engine.io subjacente. Não há mais flags `DM_REALTIME` / `COMMUNITY_REALTIME` nem fallback SSE — só um kill-switch absoluto (`SOCKET_IO_ENABLED`).

## Visão geral

- **Servidor**: `Server` (socket.io) anexado ao mesmo `http.Server` do Express em `server/realtime/io.ts`. Dois namespaces:
  - `/dm` — mensagens diretas + notificações pessoais (eventos user-scoped).
  - `/community` — feed de fóruns e discussões (anexado pelo `attachCommunityNamespace` no boot do `/dm`).
- **Cliente**: dois singletons lazy.
  - `src/lib/realtime/socket.ts` — `getSocket()` (`/dm`).
  - `src/lib/realtime/communitySocket.ts` — `getCommunitySocket()` (`/community`).
- **Auth**: handshake usa cookie httpOnly `session_token` (mesma sessão da REST). Sem cookie → rejeitado.
- **Kill-switch absoluto**: `SOCKET_IO_ENABLED=false` desliga o socket inteiro. UI continua funcionando via REST + poll lento (`useUnreadMessages` faz `refresh()` a cada 60s quando o socket não está conectado).

## Orquestração no cliente

`UnreadMessagesProvider` (`src/components/hooks/useUnreadMessages.ts`) é a **fonte única** do socket `/dm` no app — montado em `App.tsx`. Centraliza:

- Conexão única (singleton em `socket.ts`).
- Broadcast interno (`subscribe(handler)`) consumido por `ConversasPage`, `NotificationBell`, `useUnreadBySection` etc.
- Resync autoritativo no `connect` (busca unread + dispara `connected` no broadcast).

`useCommunitySocket(enabled)` (`src/lib/community/useCommunitySocket.ts`) é instanciado **por componente** que precisa de eventos de Comunidade (`CommunityDetailPage`, `DiscussionPage`). Mantém refs das salas que cada componente declarou (`joinForum` / `joinPost`) e re-entra automaticamente no `reconnect`.

> Nota: o evento `conversation:updated` está reservado no contrato mas ainda não tem emit points ativos no servidor — features futuras (rename de conversa, archive sync entre abas, etc.).

## Namespace `/dm`

### Topologia

- **Salas**:
  - `user:<id>` — joinada automaticamente no `connection`. Recebe `unread:changed`, `notification:new`, `notification:unread`, `message:*` (publicados pra `user:<id>` de cada participante por `publishToConversation`).
  - `conversation:<id>` — o servidor entra automaticamente nas conversas ativas do usuário no `connection` (`joinUserConversations`). Usada **só** pra eventos transientes (`message:typing`, `listening`) onde perda ocasional é aceitável.

### Eventos servidor → cliente

| Evento                  | Escopo (sala)             | Payload                                                              |
| ----------------------- | ------------------------- | -------------------------------------------------------------------- |
| `message:new`           | `user:<id>` (cada parte)  | `{ conversation_id, message }`                                       |
| `message:read`          | `user:<id>` (cada parte)  | `{ conversation_id, reader_id, message_ids[], read_at }`             |
| `message:reaction`      | `user:<id>` (cada parte)  | `{ conversation_id, message_id, reactions[] }`                       |
| `message:typing`        | `conversation:<id>`       | `{ conversation_id, user_id }` (cliente filtra próprio user_id)      |
| `listening`             | `user:<sender_id>`        | `{ conversation_id, user_id, message_id }`                           |
| `unread:changed`        | `user:<id>`               | `{ count }`                                                          |
| `notification:new`      | `user:<id>`               | `NotificationRow` (id, kind, title, body, link, payload, created_at) |
| `notification:unread`   | `user:<id>`               | `{ unread }` (agregado total)                                        |
| `conversation:sync`     | só este socket            | `{ conversation_id, last_event_id }` (gap-fill por conversa)         |
| `conversation:updated`  | `conversation:<id>`       | reservado pra futuros patches (rename, archive sync)                 |

### Eventos cliente → servidor

Todos aceitam `(payload, ack?)` — `ack(true|false)` opcional. Rate-limit in-memory: 120 evt/min por (user, kind).

| Evento                | Payload                                  | Efeito                                                       |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `conversation:join`   | `{ conversation_id }`                    | Verifica membership e adiciona socket à sala; emite `conversation:sync`. |
| `message:typing`      | `{ conversation_id }`                    | Fan-out `message:typing` pra sala (inclui sender).           |
| `message:read`        | `{ conversation_id }`                    | Delega pra `markConversationRead` → emite `message:read` + `unread:changed`. |
| `dm:listening`        | `{ conversation_id, message_id }`        | Recibo de "ouvindo áudio" → emite `listening` pro sender.    |

### Reconexão e gap-fill

1. Cliente mantém `conversationCursors: Map<conversationId, lastMessageId>`, atualizado em todo `message:new` recebido.
2. Ao (re)conectar, servidor entra automaticamente nas salas e emite `conversation:sync` com `last_event_id` (id da última mensagem visível pro user na conversa, respeitando `cleared_at`).
3. Cliente compara com cursor local; se houver gap, faz:
   ```
   GET /api/messages/conversations/:id/since?cursor=<localCursor>&limit=100
   → { messages: [...], last_event_id }
   ```
4. Cliente despacha cada mensagem como `message:new` no broadcast interno. UI dedupa por `message.id`.

A rota `/since` é idempotente e respeita o corte `cleared_at` (lado-a-lado) — mesma lógica de `GET /messages`.

### Detecção de "user online" para e-mail offline

`server/realtime/io.ts` exporta `isUserOnline(userId)` — `true` se a sala `user:<id>` no namespace `/dm` tem ≥ 1 socket. `messages/service.ts` usa esse helper pra decidir se manda o e-mail de notificação de DM (só dispara quando o destinatário está offline + idle > 10min — ver `dm.md`).

### Fallback REST

- `markRead` é socket-first: `emitWithAck("message:read", { conversation_id })` → fallback `POST /conversations/:id/read` se o ack falhar.
- `typing` e `listening` REST (`POST /typing`, `POST /listening`) continuam ativos só como fallback defensivo — UI prefere o socket.

## Namespace `/community`

### Topologia

- **Salas**:
  - `forum:<slug>` — fan-out de eventos do feed de uma comunidade.
  - `post:<id>` — fan-out de eventos dentro de uma discussão.
  - `user:<id>` — sala automática no `connection` (reservada para uso futuro).

### Eventos servidor → cliente

| Evento             | Sala            | Payload                                                                        |
| ------------------ | --------------- | ------------------------------------------------------------------------------ |
| `post:new`         | `forum:<slug>`  | `{ id, forum_id, forum_slug, forum_name, author_id, author_name, title, content, created_at, class_id }` |
| `post:updated`     | `forum:<slug>` + `post:<id>` | `{ post_id, forum_slug, ...patch }` — patch contém só campos mexidos (`is_hidden`, `deleted`, `content`, `images`, `comment_count`, `updated_at`). |
| `post:reaction`    | `forum:<slug>` + `post:<id>` | `{ post_id, forum_slug, user_id, reactions: [{emoji,count}], like_count }` |
| `comment:new`      | `post:<id>`     | `{ id, post_id, parent_id, content, author_id, author_name, author_avatar, created_at, like_count }` |
| `comment:updated`  | `post:<id>`     | `{ comment_id, post_id, ...patch }` (atualmente só `is_hidden`).               |
| `comment:reaction` | `post:<id>`     | `{ comment_id, post_id, user_id, reactions }`                                  |
| `comment:typing`   | `post:<id>`     | `{ post_id, user_id }` (re-broadcast do evento client→server).                 |
| `post:presence`    | `post:<id>`     | `{ post_id, viewers }` — throttled a 1 emit/3s por post; viewers únicos (multi-tab = 1). |

### Eventos cliente → servidor

Todos aceitam ack opcional `(ok: boolean) => void` (`emitCommunityWithAck`).

| Evento             | Payload              | Validações                                                                    |
| ------------------ | -------------------- | ----------------------------------------------------------------------------- |
| `forum:join`       | `{ slug }`           | slug `[a-z0-9-]{2,60}` + forum existe + `is_active=true`. Idempotente.        |
| `forum:leave`      | `{ slug }`           | sai da sala (sem checagem).                                                   |
| `post:join`        | `{ post_id }`        | post existe + não `hidden` + (se `class_id`, role `moderator+` OU matriculado + trail gate `userHasActiveTrailAccess`). |
| `post:leave`       | `{ post_id }`        | sai da sala.                                                                  |
| `post:view`        | `{ post_id }`        | idempotente por (socket, post); rate-limit 60/min. Incrementa `posts.view_count`. |
| `comment:typing`   | `{ post_id }`        | socket precisa estar na sala `post:<id>`; fan-out broadcast pra mesma sala.   |

### Fan-out — onde mora

`server/features/community/realtime.ts` é a camada fina que centraliza o shape dos eventos. Os call sites no `service.ts` chamam:

| Função no service           | Helper emitido                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `createPost`                | `emitPostNew`                                                                               |
| `updatePost`                | `emitPostUpdated` (patch dos campos mexidos)                                                |
| `deletePost`                | `emitPostUpdated({ is_hidden:true, deleted:true })`                                          |
| `togglePostReaction`        | `emitPostReaction` (com `like_count` re-lido)                                                |
| `setPostHiddenWithAuth`     | `emitPostUpdated({ is_hidden })`                                                            |
| `addComment`                | `emitCommentNew` + `emitPostUpdated({ comment_count })` na sala do fórum                    |
| `toggleCommentReaction`     | `emitCommentReaction`                                                                       |
| `setCommentHiddenWithAuth`  | `emitCommentUpdated({ is_hidden })`                                                         |

Todos os emits estão envoltos em `try/catch` best-effort — falha no socket NÃO reverte a mutation.

### Gap-fill `/since`

`GET /api/community/forums/:slug/since?cursor=<lastPostId>` devolve até 50 posts visíveis em ordem crescente com `id > cursor` (sem `class_id`, sem `is_hidden`). Usado pelo cliente após `reconnect` do socket pra reconciliar `post:new` perdido. Eventos efêmeros (`post:reaction`, `comment:*`) NÃO são reconciliados aqui — quando o usuário entra numa discussão, o `GET /api/community/posts/:id` traz o estado atual.

### Cliente — hook `useCommunitySocket(enabled)`

```ts
const { joinForum, leaveForum, joinPost, leavePost, on, onReconnect,
        emitCommentTyping, reportView } = useCommunitySocket(true);
```

- O parâmetro `enabled` permanece no contrato pra desligar localmente o hook se necessário (testes, etc.), mas em produção é sempre `true` — Task #229 removeu a flag de transporte. Quando `SOCKET_IO_ENABLED=false` no servidor, o socket simplesmente nunca conecta e o hook degrada pra refetch.
- `on(event, handler)` retorna função pra remover o listener — limpa no unmount do componente automaticamente.
- Reconnect automático: ao receber `connect` no socket, re-entra nas salas declaradas pelo componente. Callbacks registrados em `onReconnect` disparam só nos `connect` subsequentes (não no inicial).

## Notificações

100% pelo namespace `/dm` (sala `user:<id>`). O servidor publica via `publishToUser(userId, "notification:new" | "notification:unread", payload)` em `server/features/messages/events.ts` — fachada fina sobre `emitToUser`. Não há mais SSE residual.

Cliente em `useUnreadMessages.ts` ouve `notification:new` e `notification:unread` direto no socket, traduz pro broadcast interno (`subscribe`), e `NotificationBell` + `useUnreadBySection` consomem dali.

## Kill-switch

| Variável                    | Efeito                                                  |
| --------------------------- | ------------------------------------------------------- |
| `SOCKET_IO_ENABLED=false`   | Desliga Socket.IO no servidor. Cliente nunca conecta e cai em poll lento (60s) + REST. Use só como circuit-breaker absoluto. |

> Task #229 removeu `DM_REALTIME` e `COMMUNITY_REALTIME`. Não há mais decisão de transporte por env — Socket.IO é o caminho único.

## Gotchas

- **Sender recebe seus próprios eventos** (todas as abas dele entram na sala). UI ignora `message:typing` do próprio user filtrando por `user_id === self.id`; dedup de `message:new`/`comment:new`/`post:new` é por `id`.
- **`conversation:join` é necessário** quando o cliente cria uma nova conversa nesta sessão — ela não existia no `joinUserConversations` inicial. (Eventos `message:*` ainda chegam por `user:<id>`, mas typing/listening dependem da sala da conversa.)
- **Não há buffer no servidor**. Reconnect → `conversation:sync` (DM) ou `/since` (Comunidade) é o único caminho de catch-up. Buffer interno seria inseguro com múltiplas instâncias.
- **Sem `cors` cross-origin**: `cors: { origin: false }` no IOServer porque tudo passa pelo proxy same-origin do Replit (dev) e `rayo.app.br` (prod).
- **Forum events não checam trail gate**: `forum:join` só valida que o fórum existe e está ativo. Se o fórum requer trilha paga, a REST `/posts` já protege o conteúdo — o socket só transmite metadados que o usuário poderia ver de qualquer forma.
- **Class-scoped posts não viram no feed da `CommunityDetailPage`**: o cliente filtra `payload.class_id` antes de adicionar à lista (consistente com o GET `/forums/:id/posts`).
- **Cleanup de community hook é por instância**, não global: dois componentes usando `useCommunitySocket` na mesma página mantêm listeners isolados.

### Rate limits (in-memory, por instância)

**`/dm`**:
- `message:typing` / `message:read` / `dm:listening`: 120/min por usuário.

**`/community`**:
- `forum:join` / `post:join`: 60/min por usuário.
- `comment:typing`: 120/min por usuário.
- `post:view`: 60/min por usuário (e idempotente por (socket, post)).
