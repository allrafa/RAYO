# Bunny Stream (Vídeo do CMS — Task #86)

Contratos consolidados do upload e entrega de vídeo via Bunny Stream. Mexa aqui antes de tocar em `server/features/bunny/`, `server/features/cms/` (campos de vídeo) ou `BunnyVideoUploader` no `AdminCmsForm.tsx`.

## Visão geral

Vídeos do CMS (`kind=video|reels`) sobem direto pro Bunny Stream. DB grava o sentinel `bunny://<libraryId>/<videoGuid>` em `content_items.video_external_id` + `video_provider='bunny'`. Webhook de transcode preenche `video_status`, `video_duration_sec`, `video_thumbnail_url`. Em leitura, o servidor adiciona `video_embed_url` / `video_hls_url` derivados (`withResolvedBunnyFields`). `media_url` / `external_url` legados continuam suportados como fallback.

Variáveis de ambiente (todas opcionais; sem elas o uploader fica desabilitado e itens com `external_url` continuam funcionando):
- `BUNNY_STREAM_LIBRARY_ID` — ID numérico da Stream Library.
- `BUNNY_STREAM_API_KEY` — AccessKey da library.
- `BUNNY_STREAM_CDN_HOSTNAME` — hostname do pull zone (ex `vz-abc123.b-cdn.net`).
- `BUNNY_STREAM_WEBHOOK_SECRET` — **obrigatória** pra webhook funcionar; segredo HMAC SHA256.

## Gotchas

### Bunny upload contract
`POST /api/admin/bunny/content/:id/upload` (producer+, multipart, campo `file`) cria o slot no Bunny e sobe os bytes em uma única chamada. Limites estritos:
- Mime allowlist: `video/mp4|quicktime|webm|x-matroska`.
- ≤ 5 GB.
- Rate-limit 20/h por usuário.
- Ownership/membership checada **ANTES** do parse multer.

Multer usa **disk storage** em `os.tmpdir()/rayo-bunny-uploads` (5 GB em RAM seria suicídio); arquivos são removidos no `finally`. Frontend dispara via XHR pra ter `upload.onprogress` real (`BunnyVideoUploader` em `AdminCmsForm.tsx`). Para itens novos, exige salvar antes (precisa de `contentId > 0`).

### Bunny webhook
`POST /api/webhooks/bunny` é montado **fora** do `optionalAuth` (sem sessão; Bunny é quem chama). Validação por HMAC SHA256 do raw body com `BUNNY_STREAM_WEBHOOK_SECRET`, headers aceitos `X-Bunny-Signature` / `X-Webhook-Signature` / `Authorization` (prefixo `sha256=` opcional). Sem secret configurado, devolve **503**. Aceita payloads `{VideoGuid, Status}` e snake_case. Em `Status=4` (ready) puxa duração/thumb via `getVideo` e dispara notificação `kind=video_status` pro `created_by` do conteúdo. Webhooks pra GUIDs órfãos (vídeos criados manualmente no painel) respondem 200 pra Bunny não reentregar.

### Bunny sentinel format
`bunny://<libraryId>/<videoGuid>`. `parseBunnyRef` aceita o sentinel completo OU só o GUID puro (cai pro library_id da config). **NÃO grave URLs cruas** (`https://iframe.mediadelivery.net/...`) em `video_external_id` — quebra o resolver. URLs públicas só são geradas em leitura por `withResolvedBunnyFields` (embed customizado com `primaryColor=C8553D` = `--rayo-terra-500`).

### Bunny vs Object Storage
Vídeo é Bunny, áudio/imagem/PDF é Object Storage. **NÃO confunda os sentinels** (`bunny://` ≠ `objstore://`) e os endpoints (`/api/admin/bunny/*` ≠ `/api/admin/cms/media/upload`). Os limites de DM (`messages/routes.ts`) também usam Object Storage com regras próprias.
