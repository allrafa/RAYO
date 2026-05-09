# Direct Messaging (Mensagens v2 — Task #79)

Contratos consolidados do sistema de DM da RAYO. Mexa aqui antes de tocar em `server/features/messages/` ou `src/components/ConversasPage.tsx`.

## Visão geral

DM v2 introduziu:
- Arquivar/desarquivar e excluir **per-participante** (a conversa em si continua compartilhada).
- Lista única com seção colapsável "Arquivadas (N)" no rodapé (sem abas).
- Swipe horizontal estilo WhatsApp (← arquivar / → excluir) via `motion`.
- Menu `...` no hover desktop.
- Avatares reais nos cards e header (JOIN em `users.avatar_url`).
- Envio de **foto** (input file → endpoint próprio + lightbox in-app).
- Envio de **áudio** (gravação client via `MediaRecorder` em webm/opus, auto-stop em 120s).
- Mensagens com `kind` (`text|image|audio`) + `attachment_url` (`objstore://...`) + `attachment_meta` (mime/size/duration).
- Excluir marca `cleared_at` para esconder histórico anterior do lado de quem excluiu — se a outra pessoa enviar nova mensagem, a conversa reabre só com o que vier depois do corte.

E-mails de notificação (rate-limit 1/h por conversa) só disparam quando o destinatário não tem SSE ativo e está idle há >10min.

## Gotchas

### DM per-side state
Arquivar/excluir vivem em `conversation_user_state(conversation_id, user_id, archived_at, deleted_at, cleared_at)`, **NUNCA** em `conversations` (que é compartilhada). `listConversations(userId, scope)` filtra por `s.deleted_at IS NULL` e separa active/archived por `s.archived_at`. `getMessages` e `getUnreadConversationCount` respeitam `cleared_at` (linhas anteriores ao corte ficam invisíveis para esse usuário). `sendMessage` roda `reopenConversation(recipientId)` no destinatário e `getOrCreateConversation` reabre o lado do solicitante para que mensagens novas sempre apareçam para os dois.

### DM archive contract
**NÃO existe rota `/unarchive` separada.** Use `POST /api/messages/conversations/:id/archive` com body `{archived: true|false}` para alternar — o frontend chama `{archived: false}` ao clicar numa conversa arquivada (move pro topo das ativas e abre).

### DM attachments
`POST /api/messages/conversations/:id/attachments` usa middleware **próprio** (multer memory) em `server/features/messages/routes.ts` — **NÃO** o `uploadMiddleware` do CMS. Limites estritos validados ANTES de gravar em Object Storage:
- Imagem (jpeg/png/webp/gif) ≤ 5 MB.
- Áudio (webm/ogg/mp4/mpeg/wav/x-m4a) ≤ 10 MB e duração ≤ 120 s (medida server-side via `music-metadata`).

Membership da conversa é verificada antes do parse pra não gastar bytes/banda em conversas inacessíveis. Devolve `{kind, attachment_url: "objstore://messages/<kind>/<file>", attachment_meta: {mime, size, name, duration_sec?}}`. O cliente envia em seguida `POST /messages` com `kind`, `attachment_url`, `attachment_meta`.

`service.sendMessage` (defesa em profundidade) exige:
- Prefix exato `objstore://messages/<kind>/` (bloqueia URL externa e chaves de outros namespaces como CMS).
- `attachment_meta.mime` presente E pertencente à mesma allowlist do endpoint de upload.

URLs são resolvidas via `resolveStoredMediaUrl` em leitura.

### DM swipe gestures
`motion/react` (já no bundle). Threshold de 80 px. Arrastar p/ **esquerda** revela "Arquivar" (lado direito, âmbar). Arrastar p/ **direita** revela "Excluir" (lado esquerdo, vermelho) → AlertDialog confirma. Tap no card depois de revelado fecha o swipe em vez de abrir.

### DM lista única + Arquivadas colapsadas
`ConversasPage` carrega ambos os escopos (`active` + `archived`) em paralelo e mostra UMA lista. As ativas vêm em cima; abaixo, uma seção colapsável "Arquivadas (N)" (default fechada). Clicar numa conversa arquivada **desarquiva e abre** (chama `/archive {archived:false}` e move pro topo das ativas). **NÃO use Tabs.** Pré-visualização de e-mail para áudio inclui duração: `🎤 Áudio (mm:ss)`.
