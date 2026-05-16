# Realtime — Socket.IO (DM) + SSE (notificações)

> Status: ativo. Task #222 substituiu SSE de DM por Socket.IO. Server faz **dual-write** em ambos os transportes; cliente lê **um só**, decidido pelo servidor via `DM_REALTIME`.

## Decisão de transporte

- Servidor lê `process.env.DM_REALTIME` na inicialização.
  - `"socket"` → cliente ouve Socket.IO.
  - `"sse"` → cliente ouve SSE legado.
  - **Default**: `socket` em desenvolvimento, `sse` em produção (até estabilizar).
- Servidor sempre **emite em ambos** (`publishToUser`, `publishToConversation`). O cliente é quem decide qual ouvir.
- Cliente recebe a flag em `GET /api/auth/me` → `realtime.dm_transport`.
- `SOCKET_IO_ENABLED=false` desliga o servidor Socket.IO inteiro (kill-switch absoluto).

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
