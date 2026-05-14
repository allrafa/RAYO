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

// ─────────────────────────────────────────────────────────────────────────
// Helpers específicos das referências de Carta / Conquista / Missão.
// Mantidos privados aqui porque hoje só são usados pelos 3 templates abaixo
// — quando outra feature pedir o mesmo bloco, promove-se ao DS principal.
// ─────────────────────────────────────────────────────────────────────────

// Banda editorial verde da Carta semanal — retângulo forest com listras
// diagonais sutis, label de tempo de leitura à esq-baixo e edição à
// dir-topo. Uso de `position:absolute` é seguro num bloco fixo como esse
// porque o pai tem altura definida; clientes que não suportam (Outlook
// antigo) ainda enxergam o gradiente sólido + textos empilhados.
function editorialCoverBand(opts: {
  edition: number;
  readingMinutes: number;
}): string {
  const ed = String(opts.edition).padStart(3, "0");
  const reading = `Carta · ${opts.readingMinutes} min de leitura`;
  return `
  <tr><td class="ra-pad" style="padding:32px 40px 0;">
    <div style="width:100%;height:200px;border-radius:10px;background:${T.forest500};background-image:linear-gradient(135deg,${T.forest500} 0%,${T.forest900} 60%,${T.ink900} 100%);position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background-image:repeating-linear-gradient(135deg,transparent 0,transparent 14px,rgba(255,255,255,0.04) 14px,rgba(255,255,255,0.04) 15px);"></div>
      <div style="position:absolute;left:24px;bottom:20px;color:${T.ochre300};font-family:${MONO};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">${escapeHtml(reading)}</div>
      <div style="position:absolute;right:24px;top:20px;color:rgba(250,244,232,0.6);font-family:${MONO};font-size:10px;letter-spacing:0.18em;">N° ${ed}</div>
    </div>
  </td></tr>`;
}

// Linha divisória bege usada entre o corpo da carta e o card "Para
// continuar lendo".
function dividerRow(padding = "24px 40px 0"): string {
  return `
  <tr><td class="ra-pad" style="padding:${padding};">
    <div style="height:1px;background:${T.sand300};font-size:0;line-height:0;">&nbsp;</div>
  </td></tr>`;
}

// Card de "trilha relacionada" — usado no rodapé da Carta semanal.
function relatedTrailRow(opts: {
  label: string;
  title: string;
  meta: string;
  href: string;
  ctaLabel?: string;
}): string {
  const safeHref = safeUrl(opts.href);
  const cta = opts.ctaLabel || "Ver trilha";
  return `
  <tr><td class="ra-pad" style="padding:24px 40px 32px;">
    <div style="font-family:${MONO};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${T.ink400};font-weight:600;margin-bottom:14px;">${escapeHtml(opts.label)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="border:1px solid ${T.sand300};border-radius:12px;padding:18px 20px;background:${T.sand50};">
          <div style="font-family:${FONT};font-size:15px;font-weight:600;color:${T.forest900};letter-spacing:-0.01em;">${escapeHtml(opts.title)}</div>
          <div style="font-family:${FONT};font-size:13px;color:${T.ink500};margin-top:4px;">${escapeHtml(opts.meta)}</div>
          <div style="margin-top:12px;">
            <a href="${safeHref}" style="font-family:${FONT};font-size:13px;color:${T.terra500};text-decoration:none;font-weight:600;">${escapeHtml(cta)} →</a>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

// Eyebrow centralizado (com traço terracota dos dois lados) usado no
// e-mail de Conquista. Variante do `eyebrowRow` padrão.
function eyebrowCenteredRow(text: string, padding = "36px 40px 0"): string {
  return `
  <tr><td class="ra-pad" align="center" style="padding:${padding};text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td style="vertical-align:middle;padding-right:10px;line-height:0;">
        <div style="width:24px;height:1px;background:${T.terra500};font-size:0;line-height:0;">&nbsp;</div>
      </td>
      <td style="font-family:${MONO};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${T.terra500};font-weight:600;">${escapeHtml(text)}</td>
      <td style="vertical-align:middle;padding-left:10px;line-height:0;">
        <div style="width:24px;height:1px;background:${T.terra500};font-size:0;line-height:0;">&nbsp;</div>
      </td>
    </tr></table>
  </td></tr>`;
}

// Headline centralizada (variante do `headlineRow`) — também usada na
// Conquista, onde o nome do usuário aparece em itálico terracota como
// segunda linha.
function headlineCenteredRow(line1: string, line2Italic?: string, size = 40): string {
  const second = line2Italic
    ? `<br><span style="font-weight:200;color:${T.terra500};font-style:italic;">${escapeHtml(line2Italic)}</span>`
    : "";
  return `
  <tr><td class="ra-pad" align="center" style="padding:20px 40px 0;text-align:center;">
    <h1 style="margin:0;font-family:${FONT};font-weight:600;font-size:${size}px;letter-spacing:-0.04em;line-height:1;color:${T.forest900};">${escapeHtml(line1)}${second}</h1>
  </td></tr>`;
}

// Parágrafo centralizado, com largura natural reduzida — usado na
// Conquista logo abaixo do headline.
function paragraphCenteredRow(html: string, padding = "24px 56px 0"): string {
  return `
  <tr><td class="ra-pad" align="center" style="padding:${padding};text-align:center;">
    <p style="margin:0 auto;font-family:${FONT};font-size:16px;line-height:1.55;color:${T.ink700};max-width:420px;">${html}</p>
  </td></tr>`;
}

// Card escuro de conquista (forest) com badge de XP terracota à direita.
function achievementCardRow(opts: {
  index: number;
  total: number;
  title: string;
  meta: string;
  xp: number;
}): string {
  return `
  <tr><td class="ra-pad" align="center" style="padding:32px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.forest900};border-radius:14px;">
      <tr><td style="padding:28px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle;">
              <div style="font-family:${MONO};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${T.ochre300};font-weight:600;margin-bottom:8px;">Conquista ${String(opts.index).padStart(2, "0")} / ${String(opts.total).padStart(2, "0")}</div>
              <div style="font-family:${FONT};font-size:22px;font-weight:600;color:${T.sand50};letter-spacing:-0.02em;line-height:1.15;">${escapeHtml(opts.title)}</div>
              <div style="font-family:${FONT};font-size:13px;color:${T.sand300};margin-top:4px;">${escapeHtml(opts.meta)}</div>
            </td>
            <td align="right" style="vertical-align:middle;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:${T.terra500};border-radius:14px;">
                <tr><td style="padding:14px 18px;font-family:${FONT};font-size:14px;font-weight:700;color:${T.sand50};letter-spacing:0.02em;">+${opts.xp} XP</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

// Card sage da missão — ícone de relógio à esq, título + XP no meio,
// checkbox à direita. Visual leve, complementar ao card forest da
// Conquista (mesmo idioma, peso oposto).
function missionCardRow(opts: { title: string; xp: number }): string {
  return `
  <tr><td class="ra-pad" style="padding:24px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.sage100};border:1px solid ${T.sage300};border-radius:12px;">
      <tr><td style="padding:20px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;width:44px;padding-right:14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:44px;height:44px;background:${T.sand50};border-radius:12px;">
              <tr><td align="center" valign="middle" style="line-height:0;">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="7" stroke="${T.sage700}" stroke-width="1.6"/>
                  <path d="M11 6v5l3 2" stroke="${T.sage700}" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </td></tr>
            </table>
          </td>
          <td style="vertical-align:middle;">
            <div style="font-family:${MONO};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${T.sage700};font-weight:600;margin-bottom:4px;">Hoje · +${opts.xp} XP</div>
            <div style="font-family:${FONT};font-size:15px;font-weight:600;color:${T.forest900};letter-spacing:-0.01em;">${escapeHtml(opts.title)}</div>
          </td>
          <td align="right" style="vertical-align:middle;font-family:${MONO};font-size:12px;color:${T.sage700};font-weight:600;letter-spacing:0.04em;">☐</td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

// Barra de streak — label "Sequência atual" à esq, "X dias → X+1" à dir,
// barra de progresso terracota sobre fundo bege. `streakDays` é o valor
// atual; o "próximo" é apenas `streakDays + 1`.
function streakProgressRow(opts: { streakDays: number; targetDays?: number }): string {
  const next = opts.streakDays + 1;
  // Progresso até o próximo "milestone" (default 15d). Limita 5..95% pra
  // sempre ter algo visível e nunca encostar nas bordas arredondadas.
  const target = opts.targetDays ?? Math.max(next + 2, 15);
  const ratio = Math.max(5, Math.min(95, Math.round((next / target) * 100)));
  return `
  <tr><td class="ra-pad" style="padding:24px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:middle;font-family:${FONT};font-size:13px;color:${T.ink500};">Sequência atual</td>
        <td align="right" style="vertical-align:middle;font-family:${FONT};font-size:18px;font-weight:600;color:${T.forest900};letter-spacing:-0.02em;">${opts.streakDays} dias <span style="color:${T.terra500};font-weight:500;">→</span> ${next}</td>
      </tr>
      <tr><td colspan="2" style="padding-top:8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.sand200};border-radius:999px;">
          <tr><td style="line-height:0;font-size:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:${ratio}%;background:${T.terra500};border-radius:999px;">
              <tr><td style="height:6px;line-height:0;font-size:0;">&nbsp;</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Templates: Carta semanal · Conquista de trilha · Missão do dia
// Backends correspondentes ainda não existem (cron semanal, hook de
// completion de trilha, scheduler diário de missão); os templates são
// publicados aqui pra ficarem prontos quando esses gatilhos surgirem.
// ─────────────────────────────────────────────────────────────────────────

export interface CartaSemanalOptions {
  /** Endereço do destinatário. */
  email: string;
  /** Número da edição (ex: 42). Aparece como `N° 042` no banner e na preheader. */
  edition: number;
  /** Data de envio em formato curto editorial (ex: "Terça · 13 maio"). */
  dateLabel: string;
  /** Tempo estimado de leitura (em minutos) — exibido no banner. */
  readingMinutes: number;
  /** Nome do autor (aparece como "Editorial · {author}"). */
  author: string;
  /** Primeira linha da headline (peso 600 forest). */
  headline: string;
  /** Segunda linha em itálico terracota (opcional). */
  headlineItalic?: string;
  /** Parágrafos do "lead" da carta. Renderizados como HTML; o chamador
   *  controla ênfase e quebras. Cada item vira um `<p>` separado. */
  paragraphs: string[];
  /** URL do post completo. */
  ctaUrl: string;
  /** Trilha relacionada exibida no rodapé (opcional). */
  related?: { title: string; meta: string; href: string };
  /** Texto fallback opcional. Se omitido, é montado a partir das
   *  paragraphs (HTML stripped). */
  textFallback?: string;
}

export async function sendCartaSemanalEmail(opts: CartaSemanalOptions): Promise<SendResult> {
  const ed = String(opts.edition).padStart(3, "0");
  const subject = `Carta RAYO · N° ${ed} — ${opts.headline}`;
  const paragraphsHtml = opts.paragraphs
    .map((html, i) =>
      paragraphRow(html, i === 0 ? "24px 40px 0" : "16px 40px 0"),
    )
    .join("");
  const cardBody = [
    editorialCoverBand({ edition: opts.edition, readingMinutes: opts.readingMinutes }),
    eyebrowRow(`Editorial · ${opts.author}`),
    headlineRow(opts.headline, opts.headlineItalic),
    paragraphsHtml,
    ctaRow("Ler carta completa", opts.ctaUrl, "32px 40px 8px"),
    ...(opts.related
      ? [dividerRow("24px 40px 0"), relatedTrailRow({ label: "Para continuar lendo", ...opts.related })]
      : [`<tr><td style="padding:0 0 24px 0;"></td></tr>`]),
  ].join("");
  const html = editorialLayout({
    title: `RAYO — Carta · N° ${ed}`,
    preheaderHidden: opts.headlineItalic
      ? `${opts.headline} ${opts.headlineItalic}`
      : opts.headline,
    preheaderLeft: `Carta · ed. ${ed}`,
    preheaderRight: opts.dateLabel,
    cardBody,
  });
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const text =
    opts.textFallback ??
    `RAYO · Carta N° ${ed} (${opts.dateLabel})\n\n${opts.headline}${opts.headlineItalic ? ` ${opts.headlineItalic}` : ""}\nEditorial · ${opts.author} · ${opts.readingMinutes} min de leitura\n\n${opts.paragraphs.map(stripHtml).join("\n\n")}\n\nLer carta completa: ${opts.ctaUrl}${opts.related ? `\n\nPara continuar lendo:\n— ${opts.related.title} (${opts.related.meta}) — ${opts.related.href}` : ""}`;
  return sendEmail({ to: opts.email, subject, html, text });
}

export interface TrilhaConcluidaOptions {
  /** Endereço do destinatário. */
  email: string;
  /** Primeiro nome do usuário — aparece em itálico terracota no headline. */
  recipientName: string;
  /** Nome da trilha que acabou de ser concluída. */
  trilhaName: string;
  /** Posição da conquista no catálogo (ex: 7 de 17). */
  achievementIndex: number;
  /** Total de conquistas disponíveis no catálogo. */
  achievementTotal: number;
  /** Nome curto da conquista — exibido no card forest. */
  achievementTitle: string;
  /** Descritor da trilha sob o título (ex: "4 itens · 2h 40min · Dra. Ana Costa"). */
  achievementMeta: string;
  /** XP ganho — aparece tanto no preheader quanto no badge. */
  xp: number;
  /** Nome da próxima trilha sugerida (opcional, renderizada na quote). */
  nextTrilhaName?: string;
  /** URL para iniciar a próxima trilha (ou voltar à academia). */
  ctaUrl: string;
  /** URL pra compartilhar a conquista — opcional. */
  shareUrl?: string;
}

export async function sendTrilhaConcluidaEmail(opts: TrilhaConcluidaOptions): Promise<SendResult> {
  const subject = `Você concluiu "${opts.trilhaName}" — +${opts.xp} XP`;
  const quoteHtml = opts.nextTrilhaName
    ? `A próxima parada é <em style="color:${T.terra500};font-style:italic;font-weight:500;">${escapeHtml(opts.nextTrilhaName)}</em>. Você não precisa começar hoje — mas ela já está te esperando.`
    : `Respira fundo. <em style="color:${T.terra500};font-style:italic;font-weight:500;">Esse passo é seu</em> — quando estiver pronto, a próxima trilha estará aqui.`;
  const cardBody = [
    eyebrowCenteredRow("Trilha concluída"),
    headlineCenteredRow("Você chegou,", `${opts.recipientName}.`),
    paragraphCenteredRow(
      `Você acaba de concluir a trilha <strong style="color:${T.forest900};font-weight:600;">${escapeHtml(opts.trilhaName)}</strong>.`,
    ),
    achievementCardRow({
      index: opts.achievementIndex,
      total: opts.achievementTotal,
      title: opts.achievementTitle,
      meta: opts.achievementMeta,
      xp: opts.xp,
    }),
    quoteRow(quoteHtml, "32px 40px 0"),
    ctaRow(opts.nextTrilhaName ? "Iniciar próxima trilha" : "Voltar à academia", opts.ctaUrl, "32px 40px 8px"),
    ...(opts.shareUrl ? [secondaryLinkRow("Compartilhar com seu par", opts.shareUrl, "0 40px 36px")] : [`<tr><td style="padding:0 0 24px;"></td></tr>`]),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Trilha concluída",
    preheaderHidden: `Você concluiu "${opts.trilhaName}" e desbloqueou ${opts.achievementTitle} (+${opts.xp} XP).`,
    preheaderLeft: "Conquista desbloqueada",
    preheaderRight: `+${opts.xp} XP`,
    cardBody,
  });
  const text = `Você chegou, ${opts.recipientName}.\n\nVocê acaba de concluir a trilha "${opts.trilhaName}".\n\nConquista ${String(opts.achievementIndex).padStart(2, "0")} / ${String(opts.achievementTotal).padStart(2, "0")} — ${opts.achievementTitle} (+${opts.xp} XP)\n${opts.achievementMeta}\n\n${opts.nextTrilhaName ? `Próxima parada: ${opts.nextTrilhaName}\n\n` : ""}${opts.nextTrilhaName ? "Iniciar próxima trilha" : "Voltar à academia"}: ${opts.ctaUrl}${opts.shareUrl ? `\nCompartilhar com seu par: ${opts.shareUrl}` : ""}`;
  return sendEmail({ to: opts.email, subject, html, text });
}

export interface MissaoDoDiaOptions {
  /** Endereço do destinatário. */
  email: string;
  /** Label da data + horário no eyebrow (ex: "Terça · 13 maio · 19h"). */
  dateLabel: string;
  /** Primeira linha do headline (peso 600 forest). */
  headline: string;
  /** Segunda linha em itálico terracota. */
  headlineItalic?: string;
  /** Descrição/contexto da missão — HTML controlado pelo chamador. */
  description: string;
  /** Título curto da missão dentro do card sage. */
  missionTitle: string;
  /** XP que será ganho ao concluir a missão. */
  missionXp: number;
  /** Sequência atual em dias (antes desta missão). */
  currentStreak: number;
  /** Meta de dias até o próximo milestone (opcional, default 15). */
  streakTarget?: number;
  /** URL para marcar a missão como concluída. */
  ctaUrl: string;
  /** URL opcional pra trocar a missão do dia. */
  swapUrl?: string;
}

export async function sendMissaoDoDiaEmail(opts: MissaoDoDiaOptions): Promise<SendResult> {
  const subject = `Sua missão de hoje · ${opts.missionTitle}`;
  const cardBody = [
    eyebrowRow(opts.dateLabel),
    headlineRow(opts.headline, opts.headlineItalic),
    paragraphRow(opts.description),
    missionCardRow({ title: opts.missionTitle, xp: opts.missionXp }),
    streakProgressRow({ streakDays: opts.currentStreak, targetDays: opts.streakTarget }),
    ctaRow("Marcar como feito", opts.ctaUrl, "36px 40px 0"),
    ...(opts.swapUrl
      ? [secondaryLinkRow("Trocar missão de hoje", opts.swapUrl, "14px 40px 36px")]
      : [`<tr><td style="padding:0 0 24px;"></td></tr>`]),
  ].join("");
  const html = editorialLayout({
    title: "RAYO — Missão do dia",
    preheaderHidden: `${opts.missionTitle} · +${opts.missionXp} XP · sequência ${opts.currentStreak} dias`,
    preheaderLeft: "Missão do dia",
    preheaderRight: `Sequência · ${opts.currentStreak} dias`,
    cardBody,
    unsubscribeLabel: "Pausar notificações diárias",
  });
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const text = `RAYO · Missão do dia (${opts.dateLabel})\n\n${opts.headline}${opts.headlineItalic ? ` ${opts.headlineItalic}` : ""}\n\n${stripHtml(opts.description)}\n\nMissão: ${opts.missionTitle} (+${opts.missionXp} XP)\nSequência atual: ${opts.currentStreak} dias → ${opts.currentStreak + 1}\n\nMarcar como feito: ${opts.ctaUrl}${opts.swapUrl ? `\nTrocar missão de hoje: ${opts.swapUrl}` : ""}`;
  return sendEmail({ to: opts.email, subject, html, text });
}
