import { Resend } from "resend";
import { logger } from "../utils/logger.js";

const RESEND_API_KEY = process.env.resend_api_key || process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "RAYO <onboarding@resend.dev>";
const APP_URL =
  process.env.APP_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(RESEND_API_KEY);
  return cachedClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SendResult {
  sent: boolean;
  error?: string;
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendResult> {
  const client = getClient();
  const masked = maskEmail(options.to);
  if (!client) {
    logger.warn("Email", `Resend API key not configured; skipping email to ${masked}`);
    return { sent: false, error: "RESEND_NOT_CONFIGURED" };
  }
  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    if (error) {
      logger.error("Email", `Resend error sending to ${masked}: ${error.message || error.name}`);
      return { sent: false, error: error.message || error.name || "RESEND_ERROR" };
    }
    logger.info("Email", `Sent "${options.subject}" to ${masked}`);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Email", `Failed to send email to ${masked}: ${message}`);
    return { sent: false, error: message };
  }
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Sanitiza URLs interpoladas em `href`. Permite só http/https/mailto;
// qualquer outra coisa (javascript:, data:, aspas, quebras) vira "#"
// pra impedir injeção de atributo ou de protocolo.
function safeUrl(url: string): string {
  if (typeof url !== "string") return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";
  if (/[\s"'<>`]/.test(trimmed)) return "#";
  if (!/^(https?:|mailto:)/i.test(trimmed)) return "#";
  return trimmed.replace(/&/g, "&amp;");
}

// ─────────────────────────────────────────────────────────────────────────
// Email Design System v1 (RAYO) — paleta sand/forest/terra/sage/ochre +
// Outfit. Tudo em tabelas + inline styles para sobreviver a Outlook,
// Gmail, Apple Mail, etc. Sem flex/grid no corpo do e-mail.
// ─────────────────────────────────────────────────────────────────────────

const T = {
  sand50: "#FAF4E8",
  sand100: "#F2E9D5",
  sand200: "#E8DBBF",
  sand300: "#D9C89E",
  sand400: "#BFA87A",
  forest900: "#0C3B2E",
  forest500: "#1E6A52",
  sage100: "#DCE8D2",
  sage300: "#A9C396",
  sage700: "#4F7253",
  terra500: "#C8553D",
  terra700: "#9C3A26",
  ochre300: "#E8C77E",
  ink900: "#0E1A14",
  ink700: "#1F2A22",
  ink500: "#4A5247",
  ink400: "#6E7569",
} as const;

const FONT = "'Outfit','Helvetica Neue',Arial,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

// SVG do sol RAYO inline (sem dependência de imagem hospedada).
const SUN_MARK_SVG = `<svg width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="6" fill="${T.sand50}"/><g stroke="${T.sand50}" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="2" x2="18" y2="7"/><line x1="18" y1="29" x2="18" y2="34"/><line x1="2" y1="18" x2="7" y2="18"/><line x1="29" y1="18" x2="34" y2="18"/><line x1="6.5" y1="6.5" x2="10" y2="10"/><line x1="26" y1="26" x2="29.5" y2="29.5"/><line x1="6.5" y1="29.5" x2="10" y2="26"/><line x1="26" y1="10" x2="29.5" y2="6.5"/></g></svg>`;

function brandHeader(): string {
  return `
  <tr><td style="padding:36px 40px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:36px;height:36px;background:${T.terra500};border-radius:10px;">
          <tr><td align="center" valign="middle" style="line-height:0;">${SUN_MARK_SVG}</td></tr>
        </table>
      </td>
      <td style="font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:-0.04em;color:${T.forest900};vertical-align:middle;">RAYO</td>
    </tr></table>
  </td></tr>`;
}

function preheaderRow(left: string, right?: string): string {
  return `
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
      <tr><td style="padding:0 8px 18px;font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${T.ink400};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="text-align:left;">${escapeHtml(left)}</td>
          ${right ? `<td style="text-align:right;">${escapeHtml(right)}</td>` : ""}
        </tr></table>
      </td></tr>
    </table>`;
}

function eyebrowRow(text: string, padding = "32px 40px 0"): string {
  return `
  <tr><td class="ra-pad" style="padding:${padding};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:10px;line-height:0;">
        <div style="width:24px;height:1px;background:${T.terra500};font-size:0;line-height:0;">&nbsp;</div>
      </td>
      <td style="font-family:${MONO};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${T.terra500};font-weight:600;">${escapeHtml(text)}</td>
    </tr></table>
  </td></tr>`;
}

// Headline com a 2ª linha em itálico terracota peso 200.
function headlineRow(line1: string, line2Italic?: string, size = 36): string {
  const second = line2Italic
    ? `<br><span style="font-weight:200;color:${T.terra500};font-style:italic;">${escapeHtml(line2Italic)}</span>`
    : "";
  return `
  <tr><td class="ra-pad" style="padding:18px 40px 0;">
    <h1 style="margin:0;font-family:${FONT};font-weight:600;font-size:${size}px;letter-spacing:-0.035em;line-height:1.05;color:${T.forest900};">${escapeHtml(line1)}${second}</h1>
  </td></tr>`;
}

// Parágrafo de corpo. `html` já vem renderizado (chamadores controlam ênfase).
function paragraphRow(html: string, padding = "24px 40px 0"): string {
  return `
  <tr><td class="ra-pad" style="padding:${padding};">
    <p style="margin:0;font-family:${FONT};font-size:16px;line-height:1.65;color:${T.ink700};">${html}</p>
  </td></tr>`;
}

function ctaRow(label: string, href: string, padding = "36px 40px 8px"): string {
  const safeHref = safeUrl(href);
  return `
  <tr><td align="center" class="ra-pad" style="padding:${padding};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:${T.terra500};border-radius:999px;">
        <a href="${safeHref}" style="display:inline-block;padding:16px 32px;font-family:${FONT};font-size:15px;font-weight:600;color:${T.sand50};text-decoration:none;">${escapeHtml(label)} →</a>
      </td>
    </tr></table>
  </td></tr>`;
}

function secondaryLinkRow(label: string, href: string, padding = "0 40px 36px"): string {
  const safeHref = safeUrl(href);
  return `
  <tr><td align="center" class="ra-pad" style="padding:${padding};">
    <a href="${safeHref}" style="font-family:${FONT};font-size:13px;color:${T.ink500};text-decoration:none;border-bottom:1px solid ${T.sand400};padding-bottom:2px;">${escapeHtml(label)}</a>
  </td></tr>`;
}

function quoteRow(html: string, padding = "20px 40px 0"): string {
  return `
  <tr><td class="ra-pad" style="padding:${padding};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-left:2px solid ${T.terra500};padding:8px 0 8px 18px;font-family:${FONT};font-size:15px;line-height:1.55;color:${T.ink700};">${html}</td>
    </tr></table>
  </td></tr>`;
}

// Bullet list editorial — traço terracota antes de cada item, sem disc.
// Usa table-based layout para sobreviver no Outlook.
function bulletsRow(items: string[], padding = "24px 40px 8px"): string {
  const rows = items
    .map(
      (html) => `
        <tr>
          <td valign="top" style="width:24px;padding:11px 14px 0 0;line-height:0;">
            <div style="width:14px;height:1.5px;background:${T.terra500};font-size:0;line-height:0;">&nbsp;</div>
          </td>
          <td style="padding:6px 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${T.ink700};">${html}</td>
        </tr>`,
    )
    .join("");
  return `
  <tr><td class="ra-pad" style="padding:${padding};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
  </td></tr>`;
}

// Bloco de código grande tipo OTP — usado pelo e-mail de verificação.
function otpRow(code: string): string {
  return `
  <tr><td align="center" class="ra-pad" style="padding:8px 40px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:${T.sand100};border:1px solid ${T.sand300};border-radius:12px;padding:18px 32px;font-family:${MONO};font-size:32px;font-weight:700;letter-spacing:8px;color:${T.forest900};">${escapeHtml(code)}</td>
    </tr></table>
  </td></tr>`;
}

// Footer fora do card.
function footer(opts: { unsubscribeLabel?: string } = {}): string {
  const privacyUrl = `${APP_URL}/?tab=privacy`;
  const unsub = opts.unsubscribeLabel || "Descadastrar";
  return `
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
      <tr><td align="center" style="padding:28px 40px 0;font-family:${FONT};font-size:11px;color:${T.ink400};line-height:1.8;">
        <div style="font-family:${MONO};letter-spacing:0.18em;text-transform:uppercase;color:${T.ink500};margin-bottom:10px;font-weight:600;">RAYO · Ecossistema</div>
        <div>Conteúdo &amp; comunidade para fortalecer famílias</div>
        <div style="margin-top:10px;">
          <a href="${privacyUrl}" style="color:${T.terra500};text-decoration:none;border-bottom:1px solid ${T.terra500};padding-bottom:1px;">Preferências</a>
          &nbsp;·&nbsp;
          <a href="${privacyUrl}" style="color:${T.terra500};text-decoration:none;border-bottom:1px solid ${T.terra500};padding-bottom:1px;">${escapeHtml(unsub)}</a>
        </div>
        <div style="margin-top:10px;color:${T.ink400};">&copy; ${new Date().getFullYear()} RAYO</div>
      </td></tr>
    </table>`;
}

// Camada hidden que aparece no inbox preview (Gmail/Apple).
function hiddenPreheader(text: string): string {
  return `<div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(text)}</div>`;
}

interface LayoutOpts {
  title: string;
  preheaderHidden: string;
  preheaderLeft: string;
  preheaderRight?: string;
  /** Conteúdo do card central — tudo entre brand e footer. */
  cardBody: string;
  unsubscribeLabel?: string;
}

function editorialLayout(opts: LayoutOpts): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(opts.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;400;500;600;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;background:${T.sand100};font-family:${FONT};-webkit-font-smoothing:antialiased;}
  a{color:${T.terra500};}
  @media (max-width:620px){
    .ra-card td.ra-pad{padding-left:24px !important;padding-right:24px !important;}
  }
</style>
</head>
<body style="margin:0;background:${T.sand100};font-family:${FONT};color:${T.ink900};">
${hiddenPreheader(opts.preheaderHidden)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.sand100};padding:32px 16px 48px;">
  <tr><td align="center">
    ${preheaderRow(opts.preheaderLeft, opts.preheaderRight)}
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="ra-card" style="max-width:600px;background:${T.sand50};border:1px solid ${T.sand300};border-radius:14px;overflow:hidden;">
      ${brandHeader()}
      ${opts.cardBody}
    </table>
    ${footer({ unsubscribeLabel: opts.unsubscribeLabel })}
  </td></tr>
</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────

export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  magicLinkUrl?: string,
): Promise<SendResult> {
  const subject = `Seu código RAYO: ${code}`;
  const cardBody = [
    eyebrowRow("Confirme seu e-mail"),
    headlineRow("Pronto pra entrar?", "Falta um passo."),
    paragraphRow(
      `Pra continuar na RAYO, confirme que esse e-mail é seu. O código e o link expiram em <strong style="color:${T.forest900};font-weight:600;">10 minutos</strong>.`,
    ),
    ...(magicLinkUrl ? [ctaRow("Confirmar agora", magicLinkUrl, "32px 40px 8px")] : []),
    `<tr><td align="center" style="padding:${magicLinkUrl ? "8px" : "24px"} 40px 8px;font-family:${MONO};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${T.ink400};font-weight:600;">${magicLinkUrl ? "Ou use o código abaixo" : "Seu código de 6 dígitos"}</td></tr>`,
    otpRow(code),
    paragraphRow(
      `<span style="color:${T.ink500};font-size:14px;">Se você não solicitou este e-mail, pode ignorá-lo com segurança.</span>`,
      "24px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Confirme seu e-mail",
    preheaderHidden: `Use o código ${code} ou toque em "Confirmar agora" para continuar.`,
    preheaderLeft: "RAYO · Verificação",
    preheaderRight: "Expira em 10 min",
    cardBody,
  });
  const text = magicLinkUrl
    ? `Confirme seu e-mail RAYO.\n\nToque no link abaixo pra confirmar direto pelo celular (válido por 10 minutos):\n${magicLinkUrl}\n\nOu use o código de 6 dígitos: ${code}\n\nSe você não solicitou este e-mail, pode ignorá-lo.`
    : `Seu código de verificação RAYO é: ${code}\n\nO código expira em 10 minutos.\n\nSe você não solicitou este código, pode ignorar este e-mail.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Bem-vindo(a) à RAYO";
  const cardBody = [
    eyebrowRow("Bem-vindo ao RAYO", "36px 40px 0"),
    headlineRow(`Olá, ${name}.`, "Que bom te ver."),
    paragraphRow(
      "A jornada é sua e ela começa no seu ritmo. Aqui você encontra um espaço pensado pra fortalecer relacionamentos, fé e propósito — sem pressa e sem barulho.",
      "28px 40px 0",
    ),
    bulletsRow([
      `Cursos, livros e áudios sobre <strong style="color:${T.forest900};">relacionamento, fé e propósito</strong>`,
      "Uma comunidade engajada de famílias como a sua",
      "Missões diárias para sustentar hábitos com leveza",
      "Conselheiro IA para te apoiar nos momentos difíceis",
    ]),
    quoteRow(
      `Cada manhã é um convite a recomeçar. <em style="color:${T.terra500};font-style:italic;font-weight:500;">Continue sua trilha</em> no seu tempo — sem pressa, sem barulho.`,
    ),
    ctaRow("Acessar a plataforma", APP_URL, "36px 40px 16px"),
    secondaryLinkRow("Conhecer a comunidade primeiro", `${APP_URL}/comunidade`, "0 40px 36px"),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Bem-vindo",
    preheaderHidden: "Sua jornada de transformação familiar começa agora.",
    preheaderLeft: "RAYO · Bem-vindo",
    preheaderRight: "Comece no seu ritmo",
    cardBody,
  });
  const text = `Olá, ${name}.\n\nQue bom te ver na RAYO. Sua jornada começa no seu ritmo.\n\nAqui você encontra:\n— Cursos, livros e áudios sobre relacionamento, fé e propósito\n— Uma comunidade engajada de famílias como a sua\n— Missões diárias para sustentar hábitos com leveza\n— Conselheiro IA para te apoiar nos momentos difíceis\n\nAcesse: ${APP_URL}`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
): Promise<SendResult> {
  const subject = "Redefina sua senha RAYO";
  const cardBody = [
    eyebrowRow("Redefinição de senha"),
    headlineRow(`Olá, ${name}.`, "Vamos trocar sua senha."),
    paragraphRow(
      `Recebemos uma solicitação para redefinir a senha da sua conta. O link é válido por <strong style="color:${T.forest900};font-weight:600;">30 minutos</strong> e pode ser usado uma única vez.`,
    ),
    ctaRow("Redefinir minha senha", resetUrl, "36px 40px 8px"),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Se o botão não funcionar, copie e cole este link no seu navegador:</span><br><span style="font-family:${MONO};word-break:break-all;color:${T.terra500};font-size:13px;">${escapeHtml(resetUrl)}</span>`,
      "16px 40px 0",
    ),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Se você não solicitou esta redefinição, pode ignorar este e-mail — sua senha atual continua válida.</span>`,
      "20px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Redefina sua senha",
    preheaderHidden: "Recebemos uma solicitação para redefinir a senha da sua conta RAYO.",
    preheaderLeft: "RAYO · Senha",
    preheaderRight: "Expira em 30 min",
    cardBody,
  });
  const text = `Olá, ${name}.\n\nRecebemos uma solicitação para redefinir a senha da sua conta RAYO.\n\nAcesse o link abaixo para escolher uma nova senha (válido por 30 minutos, uso único):\n${resetUrl}\n\nSe você não solicitou esta redefinição, ignore este e-mail.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendNewMessageEmail(
  email: string,
  recipientName: string,
  senderName: string,
  preview: string,
  conversationLink: string,
): Promise<SendResult> {
  const subject = `Nova mensagem de ${senderName} no RAYO`;
  const safePreview = preview.length > 240 ? `${preview.slice(0, 237)}…` : preview;
  const cardBody = [
    eyebrowRow(`De ${senderName}`),
    headlineRow(`Olá, ${recipientName}.`, "Você recebeu uma mensagem."),
    paragraphRow(
      `<strong style="color:${T.forest900};font-weight:600;">${escapeHtml(senderName)}</strong> te escreveu enquanto você estava fora.`,
    ),
    quoteRow(`<em style="color:${T.ink700};font-style:italic;">"${escapeHtml(safePreview)}"</em>`, "20px 40px 0"),
    ctaRow("Abrir conversa", conversationLink, "32px 40px 8px"),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Você está recebendo este aviso porque estava offline quando a mensagem chegou. Pra evitar floods, enviamos no máximo um e-mail por hora por conversa.</span>`,
      "20px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Nova mensagem",
    preheaderHidden: `${senderName} te enviou uma mensagem no RAYO.`,
    preheaderLeft: "RAYO · Mensagens",
    preheaderRight: `De ${senderName}`,
    cardBody,
  });
  const text = `Olá, ${recipientName}.\n\n${senderName} te enviou uma mensagem no RAYO:\n\n"${safePreview}"\n\nAbra a conversa: ${conversationLink}`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendDataExportEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Seus dados foram exportados (LGPD)";
  const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const cardBody = [
    eyebrowRow("LGPD · Exportação"),
    headlineRow(`Olá, ${name}.`, "Seus dados estão prontos."),
    paragraphRow(
      `Confirmamos que sua solicitação de exportação foi processada em <strong style="color:${T.forest900};font-weight:600;">${escapeHtml(date)}</strong>, conforme a LGPD.`,
    ),
    paragraphRow(
      "O arquivo JSON com todos os seus dados foi disponibilizado para download diretamente no aplicativo no momento da solicitação.",
      "16px 40px 0",
    ),
    ctaRow("Abrir minha conta", `${APP_URL}/?tab=privacy`, "32px 40px 8px"),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Se você não fez essa solicitação, fale com nosso DPO em <a href="mailto:dpo@rayo.app.br" style="color:${T.terra500};text-decoration:none;border-bottom:1px solid ${T.terra500};">dpo@rayo.app.br</a>.</span>`,
      "20px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Exportação de dados",
    preheaderHidden: "Sua solicitação de exportação de dados foi processada com sucesso.",
    preheaderLeft: "RAYO · LGPD",
    preheaderRight: "Exportação concluída",
    cardBody,
  });
  const text = `Olá, ${name}.\n\nSua solicitação de exportação de dados foi processada em ${date} conforme a LGPD.\n\nO arquivo JSON foi disponibilizado para download diretamente no aplicativo.\n\nSe você não fez essa solicitação, contate dpo@rayo.app.br.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendAccountDeletionEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Sua conta RAYO foi removida (LGPD)";
  const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const cardBody = [
    eyebrowRow("LGPD · Conta removida"),
    headlineRow(`Olá, ${name}.`, "Confirmação de exclusão."),
    paragraphRow(
      `Sua conta RAYO foi removida em <strong style="color:${T.forest900};font-weight:600;">${escapeHtml(date)}</strong> e seus dados pessoais foram anonimizados, conforme a LGPD.`,
    ),
    paragraphRow(
      "Conteúdos públicos que você compartilhou na comunidade foram desvinculados da sua identidade.",
      "16px 40px 0",
    ),
    quoteRow(
      `Sentiremos sua falta. <em style="color:${T.terra500};font-style:italic;font-weight:500;">Se mudar de ideia</em>, será sempre bem-vindo(a) de volta.`,
    ),
    ctaRow("Criar nova conta", `${APP_URL}/?tab=register`, "32px 40px 8px"),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Se você não solicitou esta exclusão, fale com nosso DPO em <a href="mailto:dpo@rayo.app.br" style="color:${T.terra500};text-decoration:none;border-bottom:1px solid ${T.terra500};">dpo@rayo.app.br</a> imediatamente.</span>`,
      "20px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Conta removida",
    preheaderHidden: "Confirmamos a exclusão da sua conta e a anonimização dos seus dados pessoais.",
    preheaderLeft: "RAYO · LGPD",
    preheaderRight: "Conta removida",
    cardBody,
  });
  const text = `Olá, ${name}.\n\nSua conta RAYO foi removida em ${date} e seus dados pessoais foram anonimizados conforme a LGPD.\n\nSentiremos sua falta. Se não foi você, contate dpo@rayo.app.br imediatamente.`;
  return sendEmail({ to: email, subject, html, text });
}

// Task #102 — resumo agregado de novos interessados em uma turma para o
// instrutor. Envio é throttled por (course_id) na camada de service para
// no máximo um e-mail por janela (24h por padrão).
export async function sendClassInterestDigestEmail(
  email: string,
  recipientName: string,
  courseTitle: string,
  newInterestCount: number,
  courseLink: string,
  latestSamples: Array<{ name: string; email: string; message?: string | null; created_at: string }>,
): Promise<SendResult> {
  const subject =
    newInterestCount === 1
      ? `Novo interesse na sua turma "${courseTitle}"`
      : `${newInterestCount} novos interesses na sua turma "${courseTitle}"`;
  const safeTitle = escapeHtml(courseTitle);
  const samplesHtml = latestSamples
    .map((s) => {
      const dateStr = new Date(s.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const msg = s.message
        ? `<div style="margin-top:6px;font-family:${FONT};font-size:14px;color:${T.ink700};">"${escapeHtml(s.message)}"</div>`
        : "";
      return `
        <tr><td style="padding-bottom:12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border:1px solid ${T.sand300};border-radius:12px;padding:14px 18px;background:${T.sand50};">
              <div style="font-family:${FONT};font-size:15px;font-weight:600;color:${T.forest900};">${escapeHtml(s.name)}</div>
              <div style="font-family:${FONT};font-size:13px;color:${T.ink500};margin-top:2px;">
                <a href="mailto:${escapeHtml(s.email)}" style="color:${T.terra500};text-decoration:none;">${escapeHtml(s.email)}</a> · ${escapeHtml(dateStr)}
              </div>
              ${msg}
            </td></tr>
          </table>
        </td></tr>`;
    })
    .join("");
  const samplesText = latestSamples
    .map((s) => `- ${s.name} <${s.email}>${s.message ? `\n  "${s.message}"` : ""}`)
    .join("\n");
  const countLabel = newInterestCount === 1 ? "novo interesse" : "novos interesses";
  const cardBody = [
    eyebrowRow("Turmas · novos interessados"),
    headlineRow(`Olá, ${recipientName}.`, `${newInterestCount} ${countLabel}.`),
    paragraphRow(
      `Sua turma <strong style="color:${T.forest900};font-weight:600;">${safeTitle}</strong> recebeu ${newInterestCount} ${countLabel} nas últimas 24 horas.`,
    ),
    `<tr><td style="padding:24px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${samplesHtml}</table>
    </td></tr>`,
    ctaRow("Abrir turma", courseLink, "24px 40px 8px"),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Você recebe esse resumo porque é o líder da turma. Pra evitar floods, enviamos no máximo um e-mail por dia por turma.</span>`,
      "20px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Novos interessados",
    preheaderHidden: `Resumo de novos interessados em "${courseTitle}".`,
    preheaderLeft: "RAYO · Turmas",
    preheaderRight: `+${newInterestCount}`,
    cardBody,
  });
  const text = `Olá, ${recipientName}.\n\n${newInterestCount} ${countLabel} na sua turma "${courseTitle}" nas últimas 24 horas:\n\n${samplesText}\n\nAbrir turma: ${courseLink}`;
  return sendEmail({ to: email, subject, html, text });
}

// Task #106 — aviso individual aos interessados quando o admin marcar a
// turma como "matrícula aberta". Disparado em lote pelo painel admin com
// dedupe via `class_interests.notified_at`.
export async function sendClassOpenEmail(
  email: string,
  recipientName: string,
  courseTitle: string,
  courseLink: string,
  customMessage?: string | null,
): Promise<SendResult> {
  const subject = `As matrículas da turma "${courseTitle}" abriram!`;
  const safeName = recipientName || "olá";
  const safeTitle = escapeHtml(courseTitle);
  const customRow =
    customMessage && customMessage.trim()
      ? quoteRow(escapeHtml(customMessage.trim()).replace(/\n/g, "<br>"), "20px 40px 0")
      : "";
  const cardBody = [
    eyebrowRow("Matrículas abertas"),
    headlineRow(`Olá, ${safeName}.`, "O dia chegou."),
    paragraphRow(
      `Você pediu pra ser avisado(a) quando a turma <strong style="color:${T.forest900};font-weight:600;">${safeTitle}</strong> abrisse — e as matrículas estão abertas a partir de agora.`,
    ),
    customRow,
    ctaRow("Garantir minha vaga", courseLink, "32px 40px 8px"),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Se você não se inscreveu pra esse aviso, pode ignorar este e-mail.</span>`,
      "20px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Matrículas abertas",
    preheaderHidden: `A turma "${courseTitle}" que você queria está com matrículas abertas.`,
    preheaderLeft: "RAYO · Turmas",
    preheaderRight: "Vagas abertas",
    cardBody,
  });
  const text = `Olá, ${recipientName}.\n\nA turma "${courseTitle}" que você queria está com matrículas abertas.${customMessage && customMessage.trim() ? `\n\n${customMessage.trim()}` : ""}\n\nGarantir minha vaga: ${courseLink}\n\nSe não foi você que se inscreveu pra este aviso, pode ignorar este e-mail.`;
  return sendEmail({ to: email, subject, html, text });
}

// Task #70 — destinatário do formulário público /contato. Lê primeiro
// `CONTACT_EMAIL` (nome canônico), depois `CONTATO_TO_EMAIL` (alias legado),
// e cai num default explícito. Nunca usa o e-mail do remetente como destino.
const CONTATO_TO_EMAIL =
  process.env.CONTACT_EMAIL || process.env.CONTATO_TO_EMAIL || "suporte@rayo.app.br";

export interface ContatoPayload {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
}

export async function sendContatoEmail(p: ContatoPayload): Promise<SendResult> {
  const subject = `[Contato site] ${p.assunto} — ${p.nome}`;
  const safeNome = escapeHtml(p.nome);
  const safeEmail = escapeHtml(p.email);
  const safeAssunto = escapeHtml(p.assunto);
  const safeMsg = escapeHtml(p.mensagem).replace(/\n/g, "<br>");
  const cardBody = [
    eyebrowRow("Formulário · /contato"),
    headlineRow("Nova mensagem", `de ${p.nome}.`),
    `<tr><td style="padding:24px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT};font-size:15px;color:${T.ink700};line-height:1.6;">
        <tr><td style="padding:6px 0;"><strong style="color:${T.forest900};font-weight:600;">Nome:</strong> ${safeNome}</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:${T.forest900};font-weight:600;">E-mail:</strong> <a href="mailto:${safeEmail}" style="color:${T.terra500};text-decoration:none;">${safeEmail}</a></td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:${T.forest900};font-weight:600;">Assunto:</strong> ${safeAssunto}</td></tr>
      </table>
    </td></tr>`,
    quoteRow(safeMsg, "20px 40px 0"),
    ctaRow("Responder agora", `mailto:${p.email}?subject=${encodeURIComponent("Re: " + p.assunto)}`, "32px 40px 8px"),
    paragraphRow(
      `<span style="font-size:14px;color:${T.ink500};">Você também pode responder diretamente a este e-mail.</span>`,
      "20px 40px 36px",
    ),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Contato",
    preheaderHidden: `${p.nome} <${p.email}> via formulário /contato`,
    preheaderLeft: "RAYO · Contato",
    preheaderRight: p.assunto.length > 28 ? `${p.assunto.slice(0, 27)}…` : p.assunto,
    cardBody,
    unsubscribeLabel: "Suporte interno",
  });
  const text = `Nova mensagem em /contato\n\nNome: ${p.nome}\nE-mail: ${p.email}\nAssunto: ${p.assunto}\n\n${p.mensagem}\n`;
  return sendEmail({ to: CONTATO_TO_EMAIL, subject, html, text });
}
