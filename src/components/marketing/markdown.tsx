import type { ReactNode } from "react";

// Renderizador de Markdown SEM dangerouslySetInnerHTML. Tudo vira ReactNode,
// então XSS via injeção de HTML é estruturalmente impossível. Suporta:
// - Cabeçalhos: # ## ### ####
// - Parágrafos (separados por linha em branco)
// - Listas: linhas iniciadas por "- " ou "* "
// - Listas ordenadas: "1. ", "2. ", etc.
// - Negrito: **texto**
// - Itálico: *texto* ou _texto_
// - Código inline: `texto`
// - Links: [texto](url)  (apenas http/https/mailto, blank target)
// Tudo o que não for reconhecido vira texto literal.

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Padrão único que captura: link | bold | italic _ ou * | code
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`\n]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] && match[2]) {
      const url = match[2].trim();
      const safe = /^(https?:|mailto:|\/)/i.test(url) ? url : "#";
      out.push(
        <a key={`${keyBase}-l-${i}`} href={safe} target={safe.startsWith("http") ? "_blank" : undefined} rel={safe.startsWith("http") ? "noopener noreferrer" : undefined}>
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      out.push(<strong key={`${keyBase}-b-${i}`}>{match[3]}</strong>);
    } else if (match[4] || match[5]) {
      out.push(<em key={`${keyBase}-i-${i}`}>{match[4] ?? match[5]}</em>);
    } else if (match[6]) {
      out.push(<code key={`${keyBase}-c-${i}`}>{match[6]}</code>);
    }
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

interface Props {
  source: string;
}

export function Markdown({ source }: Props) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const key = `b-${idx}`;
        // Heading
        const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
        if (h) {
          const level = h[1].length;
          const inner = renderInline(h[2], key);
          if (level === 1) return <h1 key={key}>{inner}</h1>;
          if (level === 2) return <h2 key={key}>{inner}</h2>;
          if (level === 3) return <h3 key={key}>{inner}</h3>;
          return <h4 key={key}>{inner}</h4>;
        }
        const lines = trimmed.split("\n");
        // Lista não-ordenada
        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={key}>
              {lines.map((l, i) => (
                <li key={`${key}-li-${i}`}>{renderInline(l.replace(/^[-*]\s+/, ""), `${key}-li-${i}`)}</li>
              ))}
            </ul>
          );
        }
        // Lista ordenada
        if (lines.every((l) => /^\d+\.\s+/.test(l))) {
          return (
            <ol key={key}>
              {lines.map((l, i) => (
                <li key={`${key}-oli-${i}`}>{renderInline(l.replace(/^\d+\.\s+/, ""), `${key}-oli-${i}`)}</li>
              ))}
            </ol>
          );
        }
        // Parágrafo (junta linhas com <br/> entre elas)
        const para: ReactNode[] = [];
        lines.forEach((l, i) => {
          if (i > 0) para.push(<br key={`${key}-br-${i}`} />);
          para.push(...renderInline(l, `${key}-p-${i}`));
        });
        return <p key={key}>{para}</p>;
      })}
    </>
  );
}
