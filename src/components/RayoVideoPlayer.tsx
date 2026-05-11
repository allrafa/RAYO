import { ImageWithFallback } from "./figma/ImageWithFallback";

// Task #86 — Player público de vídeo. Suporta:
//   1) Vídeo Bunny pronto (video_provider='bunny' + video_status='ready'):
//      renderiza iframe do Bunny customizado com cor primária RAYO.
//   2) Vídeo Bunny ainda processando: card com mensagem "Processando…".
//   3) Vídeo Bunny falhou: card de erro.
//   4) Fallback legado (external_url YouTube/Vimeo): iframe genérico.
//   5) Sem vídeo: poster da capa.
//
// As props seguem o shape devolvido pelo CMS público — campos derivados
// (video_embed_url etc.) são preenchidos no servidor por
// `withResolvedBunnyFields`.

export interface RayoVideoPlayerProps {
  title: string;
  cover_url?: string | null;
  video_provider?: string | null;
  video_status?: string | null;
  video_embed_url?: string | null;
  video_thumbnail_url?: string | null;
  external_url?: string | null;
  /**
   * Fallback legado: arquivo MP4 hospedado em Object Storage (já
   * resolvido pra URL pública pelo backend) ou outra URL absoluta.
   * Usado como `<video src=…>` quando não há Bunny nem external_url.
   */
  media_url?: string | null;
  /**
   * Task #168 — quando informado como "audio", usamos `<audio
   * controls>` em vez de `<video>` no fallback de media_url e
   * mostramos um estado honesto "Conteúdo em produção" se não houver
   * mídia. Sem isso, conteúdos kind=audio caíam no caso "5) Sem
   * vídeo" e abriam só a capa estática.
   */
  kind?: string | null;
  className?: string;
}

function youtubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}`;
}

function vimeoEmbed(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d{4,})/);
  if (!match) return null;
  return `https://player.vimeo.com/video/${match[1]}`;
}

function legacyEmbed(url: string): string {
  return youtubeEmbed(url) ?? vimeoEmbed(url) ?? url;
}

export function RayoVideoPlayer(props: RayoVideoPlayerProps) {
  const cls = `relative w-full aspect-video rounded-xl overflow-hidden bg-black ${props.className ?? ""}`;

  // 1) Bunny pronto: iframe nativo.
  if (props.video_provider === "bunny" && props.video_status === "ready" && props.video_embed_url) {
    return (
      <div className={cls}>
        <iframe
          src={props.video_embed_url}
          title={props.title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  // 2) Bunny ainda processando ou falhou.
  if (props.video_provider === "bunny" && (props.video_status === "processing" || props.video_status === "failed")) {
    const isFailed = props.video_status === "failed";
    return (
      <div className={cls}>
        {props.video_thumbnail_url || props.cover_url ? (
          <ImageWithFallback
            src={props.video_thumbnail_url || props.cover_url || ""}
            alt={props.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white text-center px-6">
          <p style={{ fontWeight: 700 }}>
            {isFailed ? "Falha ao processar este vídeo" : "Processando vídeo…"}
          </p>
          <p className="text-sm opacity-80">
            {isFailed
              ? "Tente reenviar pelo CMS."
              : "Pode levar alguns minutos. Recarregue em breve."}
          </p>
        </div>
      </div>
    );
  }

  // 3) Fallback legado: external_url (YouTube/Vimeo/etc) via iframe.
  if (props.external_url) {
    const src = legacyEmbed(props.external_url);
    return (
      <div className={cls}>
        <iframe
          src={src}
          title={props.title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  // 4) Fallback legado: media_url (arquivo MP4/MP3 hospedado em
  //    Object Storage ou similar). Para kind=audio usamos <audio>;
  //    o resto cai em <video>.
  if (props.media_url) {
    const isAudio = props.kind === "audio";
    return (
      <div className={cls}>
        {isAudio ? (
          <>
            {props.cover_url ? (
              <ImageWithFallback
                src={props.cover_url}
                alt={props.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-black/55 flex items-end p-4">
              <audio
                src={props.media_url}
                title={props.title}
                controls
                preload="metadata"
                className="w-full"
              />
            </div>
          </>
        ) : (
          <video
            src={props.media_url}
            title={props.title}
            poster={props.cover_url ?? undefined}
            controls
            preload="metadata"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
      </div>
    );
  }

  // 5) Sem mídia publicada: estado honesto "Conteúdo em produção"
  //    (Task #168 — antes mostrava só a capa estática, dava sensação
  //    de "tela preta" quando o item ainda não tinha media_url).
  const fallbackLabel =
    props.kind === "audio" ? "Áudio em produção" :
    props.kind === "reels" ? "Reel em produção" :
    "Conteúdo em produção";
  return (
    <div className={cls}>
      {props.cover_url ? (
        <ImageWithFallback
          src={props.cover_url}
          alt={props.title}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
      ) : null}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white text-center px-6">
        <p style={{ fontWeight: 700 }}>{fallbackLabel}</p>
        <p className="text-sm opacity-80">
          Esse conteúdo ainda não tem mídia publicada. Volte em breve.
        </p>
      </div>
    </div>
  );
}
