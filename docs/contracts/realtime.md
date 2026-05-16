# Realtime — Socket.IO (DM + Comunidade) + SSE (notificações)

> Status: ativo. Task #222 substituiu SSE de DM por Socket.IO. Task #223 adicionou o namespace `/community` (eventos de feed e discussão). Server faz **dual-write** em ambos os transportes (DM); a Comunidade só tem Socket.IO (sem canal SSE legado a substituir). Cliente lê o transporte que o servidor indicar via flags em `/api/auth/me`.

## Decisão de transporte

- Servidor lê `process.env.DM_REALTIME` na inicialização.
  - `"socket"` → cliente ouve Socket.IO.
  - `"sse"` → cliente ouve SSE legado.
  - **Default**: `socket` em desenvolvimento, `sse` em produção (até estabilizar).
- Servidor sempre **emite em ambos** (`publishToUser`, `publishToConversation`). O cliente é quem decide qual ouvir.
- Cliente recebe a flag em `GET /api/auth/me` → `realtime.dm_transport`.
- `SOCKET_IO_ENABLED=false` desliga o servidor Socket.IO inteiro (kill-switch absoluto).

## Orquestração no cliente

A escolha de transporte e o multiplexing SSE/Socket.IO vivem em
`src/components/hooks/useUnreadMessages.ts` — provider global montado
em `App.tsx`. `ConversasPage` é um **consumidor** do broadcast desse
provider, não orquestra transporte. O singleton de socket vive em
`src/lib/realtime/socket.ts` (lazy `getSocket()` + `emitWithAck()`),
compartilhado pelo provider e pelos call-sites de emit (typing,
listening, read).

Nota: o evento `conversation:updated` está reservado no contrato mas
ainda não tem emit points ativos no servidor — será usado em features
futuras (rename de conversa, archive sync entre abas, etc.).

## Topologia Socket.IO

- **Namespace**: `/dm` (path padrão `/socket.io/`).
- **Auth**: handshake usa cookie httpOnly `session_token` (mesma sessão da REST).
- **Salas**:
  - `user:<id>` — eventos user-scoped.
  - `conversation:<id>` — eventos conversation-scoped. Servidor entra automaticamente nas conversas ativas do usuário no `connection`.

## Eventos servidor → cliente

| Evento                  | Escopo        | Payload                                                              |
| ----------------------- | ------------- | -------------------------------------------------------------------- |
| `message:new`           | conversation  | `{ conversation_id, message }`                                       |
| `message:read`          | conversation  | `{ conversation_id, reader_id, message_ids[], read_at }`             |
| `message:reaction`      | conversation  | `{ conversation_id, message_id, reactions[] }`                       |
| `message:typing`        | conversation  | `{ conversation_id, user_id }` (cliente filtra próprio user_id)     |
| `listening`             | user (sender) | `{ conversation_id, user_id, message_id }`                           |
| `unread:changed`        | user          | `{ count }`                                                          |
| `conversation:sync`     | user (este socket) | `{ conversation_id, last_event_id }`                            |
| `conversation:updated`  | conversation  | reservado pra futuros patches (rename, archive sync, etc.)           |

> No SSE legado o evento de typing chama-se apenas `typing`. No socket é `message:typing`. Cliente trata cada transporte separadamente.

## Eventos cliente → servidor

Todos aceitam `(payload, ack?)` — `ack(true|false)` opcional. Rate-limit in-memory: 120 evt/min por user/kind.

| Evento                | Payload                                  | Efeito                                                       |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `conversation:join`   | `{ conversation_id }`                    | Verifica membership e adiciona socket à sala; emite `conversation:sync`. |
| `message:typing`      | `{ conversation_id }`                    | Fan-out `message:typing` pra sala (inclui sender).           |
| `message:read`        | `{ conversation_id }`                    | Delega pra `markConversationRead` → emite `message:read` + `unread:changed`. |
| `dm:listening`        | `{ conversation_id, message_id }`        | Recibo de "ouvindo áudio" → emite `listening` pro sender.    |

## Reconexão e gap-fill

1. Cliente mantém `conversationCursors: Map<conversationId, lastMessageId>`, atualizado em todo `message:new`.
2. Ao (re)conectar, servidor entra automaticamente nas salas e emite `conversation:sync` com `last_event_id` (id da última mensagem visível pro user na conversa).
3. Cliente compara com cursor local; se houver gap, faz:
   ```
   GET /api/messages/conversations/:id/since?cursor=<localCursor>&limit=100
   → { messages: [...], last_event_id }
   ```
4. Cliente despacha cada mensagem como `message:new` no broadcast interno. UI dedupa por `message.id` (já existia para SSE).

A rota `/since` é idempotente e respeita o corte `cleared_at` (lado-a-lado) — mesma lógica de `GET /messages`.

## SSE — papel residual

- `GET /api/messages/stream` continua aberto, mas em modo "socket":
  - Cliente **só** anexa handlers de `notification:new` e `notification:unread`.
  - DM (message:*, typing, listening, unread:changed) **não** é lido do SSE.
- Em modo "sse", cliente atua como antes — Socket.IO sequer é instanciado.
- Migração de notificações pra Socket.IO é escopo separado (Task #224).

## Fallback POST

- Endpoints REST `/typing`, `/listening` e `/read` continuam ativos. O cliente prefere socket, mas se `emitWithAck` retornar `false` (sem conexão / sem ack em 2s), cai pro POST.
- `markRead` no cliente também é socket-first: `emitWithAck("message:read", { conversation_id })` → fallback `POST /conversations/:id/read`.

## Kill-switches

| Variável            | Efeito                                                  |
| ------------------- | ------------------------------------------------------- |
| `SOCKET_IO_ENABLED=false` | Desliga Socket.IO no servidor. Cliente cai pra SSE automaticamente (porque socket nunca conecta e ele já tem fallback SSE para notificações; DM em modo "sse" também funciona). |
| `DM_REALTIME=sse`   | Servidor segue com dual-write, mas o cliente ouve SSE. Use pra rollback rápido sem redeploy do cliente (próxima sessão). |
| `DM_REALTIME=socket` | Modo novo (default em dev).                            |

## Gotchas

- **Sender recebe seus próprios eventos** (todas as abas dele entram na sala `conversation:<id>`). UI ignora `typing` do próprio user filtrando por `user_id === self.id`.
- **`/me` retorna a flag uma única vez** (no boot). Trocar `DM_REALTIME` requer reload do cliente — aceitável porque é env-var server-side.
- **`conversation:join` é necessário** quando o cliente cria uma nova conversa nesta sessão. Ela ainda não existe no `joinUserConversations` inicial — o socket precisa pedir explicitamente pra entrar na sala antes de ouvir eventos dela.
- **Não há buffer no servidor**. Reconnect → `conversation:sync` → REST `/since` é o único caminho de catch-up. Buffer interno seria inseguro com múltiplas instâncias.

---

## Comunidade — namespace `/community` (Task #223)

Posts e comentários da Comunidade migraram pra Socket.IO. NÃO há SSE
legado equivalente — antes da #223, o feed só atualizava via refetch
local após cada mutation (POST/PATCH/DELETE). Hoje os mesmos call
sites no `community/service.ts` fazem fan-out por sala depois do
INSERT/UPDATE no banco.

### Decisão de transporte

- Servidor lê `process.env.COMMUNITY_REALTIME` no boot.
  - `"socket"` → cliente entra em salas e ouve eventos.
  - `"sse"` → cliente NÃO conecta no `/community`. Helpers do hook
    viram NOOP; UI continua só com estado local e refetch sob demanda.
  - **Default**: `socket` em dev, `sse` em produção.
- `SOCKET_IO_ENABLED=false` força `community_transport === "sse"` no
  `/me` (kill-switch absoluto compartilhado com o `/dm`).
- Servidor SEMPRE emite via socket — a flag só desliga a leitura.
- Cliente recebe a flag em `realtime.community_transport` no payload
  de `GET /api/auth/me`, `POST /login` e `POST /register`.

### Topologia

- **Namespace**: `/community` (path `/socket.io/`, conexão multiplexada
  com `/dm` no mesmo engine.io subjacente).
- **Auth**: mesma handshake do `/dm` — cookie httpOnly `session_token`
  + `validateSession`. Sem cookie → handshake rejeitado.
- **Salas**:
  - `forum:<slug>` — fan-out de eventos do feed de uma comunidade.
  - `post:<id>` — fan-out de eventos dentro de uma discussão.
  - `user:<id>` — sala automática no `connection` (reservada).

### Eventos servidor → cliente

| Evento             | Sala            | Payload                                                                        |
| ------------------ | --------------- | ------------------------------------------------------------------------------ |
| `post:new`         | `forum:<slug>`  | `{ id, forum_id, forum_slug, forum_name, author_id, author_name, title, content, created_at, class_id }` |
| `post:updated`     | `forum:<slug>` + `post:<id>` | `{ post_id, forum_slug, ...patch }` — patch contém só campos mexidos (`is_hidden`, `deleted`, `content`, `images`, `comment_count`, `updated_at`). |
| `post:reaction`    | `forum:<slug>` + `post:<id>` | `{ post_id, forum_slug, user_id, reactions: [{emoji,count}], like_count }` |
| `comment:new`      | `post:<id>`     | `{ id, post_id, parent_id, content, author_id, author_name, author_avatar, created_at, like_count }` |
| `comment:updated`  | `post:<id>`     | `{ comment_id, post_id, ...patch }` (atualmente só `is_hidden`).               |
| `comment:reaction` | `post:<id>`     | `{ comment_id, post_id, user_id, reactions }`                                  |
| `comment:typing`   | `post:<id>`     | `{ post_id, user_id }` (re-broadcast do evento client→server).                  |

### Eventos cliente → servidor

Todos aceitam ack opcional `(ok: boolean) => void` (`emitCommunityWithAck`).

| Evento             | Payload              | Validações                                                                    |
| ------------------ | -------------------- | ----------------------------------------------------------------------------- |
| `forum:join`       | `{ slug }`           | slug `[a-z0-9-]{2,60}` + forum existe + `is_active=true`. Idempotente.        |
| `forum:leave`      | `{ slug }`           | sai da sala (sem checagem).                                                   |
| `post:join`        | `{ post_id }`        | post existe + não `hidden` + (se `class_id`, role `moderator+` OU matriculado + trail gate `userHasActiveTrailAccess`). |
| `post:leave`       | `{ post_id }`        | sai da sala.                                                                  |
| `post:view`        | `{ post_id }`        | idempotente por (socket, post); rate-limit `view` 60/min. Sem persistência hoje (view_count não vive em schema), mas contrato firme pro futuro. |
| `comment:typing`   | `{ post_id }`        | socket precisa estar na sala `post:<id>`; fan-out broadcast pra mesma sala.   |

Eventos servidor→sala (presence):

| Evento           | Payload                          | Quando |
| ---------------- | -------------------------------- | ------ |
| `post:presence`  | `{ post_id, viewers }`           | re-emitido após join/leave/disconnect, throttled a 1 emit/3s por post. Counta viewers únicos (multi-tab = 1 por user). |

### Fan-out — onde mora

`server/features/community/realtime.ts` é a camada fina que centraliza
o shape dos eventos. Os call sites no `service.ts` chamam:

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

Todos os emits estão envoltos em `try/catch` best-effort — falha no
socket NÃO reverte a mutation.

### Gap-fill `/since`

`GET /api/community/forums/:slug/since?cursor=<lastPostId>` devolve até
50 posts visíveis em ordem crescente com `id > cursor` (sem
`class_id`, sem `is_hidden`). Usado pelo cliente após `reconnect`
do socket pra reconciliar `post:new` perdido. Eventos efêmeros
(`post:reaction`, `comment:*`) NÃO são reconciliados aqui — quando o
usuário entra numa discussão, o `GET /api/community/posts/:id` traz
o estado atual.

### Cliente — hook único `useCommunitySocket(enabled)`

Vive em `src/lib/community/useCommunitySocket.ts`. API mínima:

```ts
const { joinForum, leaveForum, joinPost, leavePost, on, onReconnect,
        emitCommentTyping } = useCommunitySocket(communityTransport === "socket");
```

- `enabled=false` → todos os métodos viram NOOP. Componente continua
  funcionando como antes da #223 (refetch + estado local).
- `on(event, handler)` retorna função pra remover o listener — limpa
  no unmount do componente automaticamente (mantém set interno).
- Reconnect automático: ao receber `connect` no socket, re-entra nas
  salas declaradas pelo componente (`joinForum`/`joinPost` viram
  refs). Componente não precisa rejoinar manualmente.

`CommunityDetailPage` entra em `forum:<slug>` e escuta `post:new`,
`post:updated`, `post:reaction`. `DiscussionPage` entra em
`post:<id>` e escuta `comment:new`, `comment:updated`,
`comment:reaction`, `post:reaction`, `post:updated` (pra fechar a
discussão se o post for removido).

### Kill-switches

| Variável                    | Efeito                                                  |
| --------------------------- | ------------------------------------------------------- |
| `SOCKET_IO_ENABLED=false`   | Desliga Socket.IO inteiro. `community_transport=sse` no `/me`. Hook vira NOOP. |
| `COMMUNITY_REALTIME=sse`    | Servidor segue emitindo (cheap when no listeners), mas cliente ignora — vira "sem realtime". Rollback rápido sem redeploy do cliente. |
| `COMMUNITY_REALTIME=socket` | Modo novo (default em dev).                             |

### Rate limits (in-memory, por instância)

- `forum:join` / `post:join`: 60/min por usuário.
- `comment:typing`: 120/min por usuário.
- `post:view`: 60/min por usuário (e idempotente por (socket, post)).

### Reconnect — gap-fill via `/since`

`useCommunitySocket` expõe `onReconnect(cb)`. `CommunityDetailPage`
registra um callback que, no segundo `connect` em diante (não no
inicial), chama `GET /forums/:slug/since?cursor=<lastId>` e mergeia
os posts retornados no topo do feed (dedup por id). Eventos
transientes (`post:reaction`, `comment:*`) NÃO são reconciliados —
quando o usuário entra numa discussão, o `GET /posts/:id` já traz
o estado atual.

### Gotchas

- **Sender recebe seu próprio evento** (todas as abas dele entram na
  mesma sala). UI dedup por `id` (`comment.id`/`post.id`) ao receber
  `comment:new`/`post:new`.
- **Class-scoped posts não viram no feed da `CommunityDetailPage`**: o
  cliente filtra `payload.class_id` antes de adicionar à lista
  (consistente com o GET `/forums/:id/posts` que esconde class posts).
- **Forum events não checam trail gate**: `forum:join` só valida que
  o fórum existe e está ativo. Se o fórum requer trilha paga, a
  REST `/posts` já protege o conteúdo — o socket só transmite
  metadados que o usuário poderia ver de qualquer forma.
- **Cleanup é por hook, não global**: dois componentes usando
  `useCommunitySocket` na mesma página mantêm listeners isolados;
  desmontar um não derruba o outro.
