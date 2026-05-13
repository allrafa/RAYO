import { Resend } from "resend";
import { logger } from "../utils/logger.js";

const RESEND_API_KEY = process.env.resend_api_key || process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "RAYO <onboarding@resend.dev>";
const APP_URL =
  process.env.APP_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new Resend(RESEND_API_KEY);
  }
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

const RAYO_ACCENT = "#FFB300";
const RAYO_BG = "#0F172A";
const RAYO_TEXT = "#F8FAFC";
const RAYO_MUTED = "#94A3B8";

function layout(body: string, preheader: string): string {
  const privacyUrl = `${APP_URL}/?tab=privacy`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RAYO</title>
</head>
<body style="margin:0;padding:0;background:${RAYO_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${RAYO_TEXT};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${RAYO_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#1E293B;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px 32px;text-align:center;">
              <div style="display:inline-block;padding:8px 16px;border-radius:8px;background:${RAYO_ACCENT};color:${RAYO_BG};font-weight:700;font-size:20px;letter-spacing:1px;">RAYO</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;color:${RAYO_TEXT};font-size:16px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #334155;color:${RAYO_MUTED};font-size:12px;line-height:1.5;text-align:center;">
              Você está recebendo este e-mail porque utiliza a plataforma RAYO.<br>
              <a href="${privacyUrl}" style="color:${RAYO_MUTED};text-decoration:underline;">Política de Privacidade</a>
              · &copy; ${new Date().getFullYear()} RAYO
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  magicLinkUrl?: string,
): Promise<SendResult> {
  const subject = `Seu código de verificação RAYO: ${code}`;
  const preheader = `Use o código ${code} ou toque em "Confirmar agora" para continuar.`;
  const magicButton = magicLinkUrl
    ? `
      <div style="text-align:center;margin:0 0 24px 0;">
        <a href="${magicLinkUrl}" style="display:inline-block;padding:14px 28px;background:${RAYO_ACCENT};color:${RAYO_BG};text-decoration:none;border-radius:8px;font-weight:600;">Confirmar agora</a>
      </div>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:13px;text-align:center;">Toque no botão acima pra confirmar pelo celular sem digitar nada.</p>
      <p style="margin:0 0 16px 0;color:${RAYO_MUTED};font-size:12px;text-align:center;">Ou use o código de 6 dígitos abaixo:</p>
    `
    : "";
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Confirme seu e-mail</h1>
      <p style="margin:0 0 24px 0;color:${RAYO_TEXT};">Pra continuar na RAYO, confirme que esse e-mail é seu. O código e o link expiram em <strong>10 minutos</strong>.</p>
      ${magicButton}
      <div style="text-align:center;margin:16px 0 32px 0;">
        <div style="display:inline-block;padding:18px 32px;border-radius:12px;background:${RAYO_BG};color:${RAYO_ACCENT};font-size:32px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;">${code}</div>
      </div>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Se você não solicitou este e-mail, pode ignorá-lo com segurança.</p>
    `,
    preheader,
  );
  const text = magicLinkUrl
    ? `Confirme seu e-mail RAYO.\n\nToque no link abaixo pra confirmar direto pelo celular (válido por 10 minutos):\n${magicLinkUrl}\n\nOu use o código de 6 dígitos: ${code}\n\nSe você não solicitou este e-mail, pode ignorá-lo.`
    : `Seu código de verificação RAYO é: ${code}\n\nO código expira em 10 minutos.\n\nSe você não solicitou este código, pode ignorar este e-mail.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Bem-vindo(a) à RAYO!";
  const preheader = "Sua jornada de transformação familiar começa agora.";
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Olá, ${escapeHtml(name)}!</h1>
      <p style="margin:0 0 16px 0;">Que alegria ter você na <strong>RAYO</strong>. Sua jornada de transformação familiar começa agora.</p>
      <p style="margin:0 0 16px 0;">Aqui você encontra:</p>
      <ul style="margin:0 0 24px 20px;padding:0;color:${RAYO_TEXT};">
        <li style="margin-bottom:8px;">Cursos e livros sobre relacionamento, fé e propósito</li>
        <li style="margin-bottom:8px;">Uma comunidade engajada de pessoas como você</li>
        <li style="margin-bottom:8px;">Missões diárias para fortalecer hábitos saudáveis</li>
        <li style="margin-bottom:8px;">Conselheiro IA para te apoiar quando precisar</li>
      </ul>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;background:${RAYO_ACCENT};color:${RAYO_BG};text-decoration:none;border-radius:8px;font-weight:600;">Acessar a plataforma</a>
      </div>
    `,
    preheader,
  );
  const text = `Olá, ${name}!\n\nQue alegria ter você na RAYO. Sua jornada de transformação familiar começa agora.\n\nAcesse: ${APP_URL}`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
): Promise<SendResult> {
  const subject = "Redefina sua senha RAYO";
  const preheader = "Recebemos uma solicitação para redefinir a senha da sua conta RAYO.";
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Redefinir senha</h1>
      <p style="margin:0 0 16px 0;">Olá, ${escapeHtml(name)}.</p>
      <p style="margin:0 0 16px 0;">Recebemos uma solicitação para redefinir a senha da sua conta RAYO. Clique no botão abaixo para escolher uma nova senha. O link é válido por <strong>30 minutos</strong> e pode ser usado uma única vez.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:${RAYO_ACCENT};color:${RAYO_BG};text-decoration:none;border-radius:8px;font-weight:600;">Redefinir minha senha</a>
      </div>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Se o botão não funcionar, copie e cole este link no seu navegador:</p>
      <p style="margin:0 0 24px 0;word-break:break-all;color:${RAYO_ACCENT};font-size:13px;">${resetUrl}</p>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Se você não solicitou esta redefinição, pode ignorar este e-mail com segurança — sua senha atual continua válida.</p>
    `,
    preheader,
  );
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
  const preheader = `${senderName} te enviou uma mensagem no RAYO.`;
  const safePreview = preview.length > 240 ? `${preview.slice(0, 237)}…` : preview;
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Nova mensagem</h1>
      <p style="margin:0 0 16px 0;">Olá, ${escapeHtml(recipientName)}.</p>
      <p style="margin:0 0 16px 0;"><strong>${escapeHtml(senderName)}</strong> te enviou uma mensagem no RAYO:</p>
      <blockquote style="margin:0 0 24px 0;padding:12px 16px;border-left:3px solid ${RAYO_ACCENT};background:${RAYO_BG};color:${RAYO_TEXT};font-style:italic;border-radius:6px;">${escapeHtml(safePreview)}</blockquote>
      <div style="text-align:center;margin:32px 0;">
        <a href="${conversationLink}" style="display:inline-block;padding:14px 28px;background:${RAYO_ACCENT};color:${RAYO_BG};text-decoration:none;border-radius:8px;font-weight:600;">Abrir conversa</a>
      </div>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Você está recebendo este aviso porque estava offline quando a mensagem chegou. Para evitar floods, enviamos no máximo um e-mail por hora por conversa.</p>
    `,
    preheader,
  );
  const text = `Olá, ${recipientName}.\n\n${senderName} te enviou uma mensagem no RAYO:\n\n"${safePreview}"\n\nAbra a conversa: ${conversationLink}`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendDataExportEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Seus dados foram exportados (LGPD)";
  const preheader = "Sua solicitação de exportação de dados foi processada com sucesso.";
  const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Solicitação de exportação concluída</h1>
      <p style="margin:0 0 16px 0;">Olá, ${escapeHtml(name)}.</p>
      <p style="margin:0 0 16px 0;">Confirmamos que sua solicitação de exportação de dados foi processada em <strong>${date}</strong>, conforme previsto na LGPD (Lei Geral de Proteção de Dados).</p>
      <p style="margin:0 0 16px 0;">O arquivo JSON com todos os seus dados foi disponibilizado para download diretamente no aplicativo no momento da solicitação.</p>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Se você não fez essa solicitação, entre em contato com nosso DPO em <a href="mailto:dpo@rayo.app.br" style="color:${RAYO_ACCENT};">dpo@rayo.app.br</a>.</p>
    `,
    preheader,
  );
  const text = `Olá, ${name}.\n\nSua solicitação de exportação de dados foi processada em ${date} conforme a LGPD.\n\nO arquivo JSON foi disponibilizado para download diretamente no aplicativo.\n\nSe você não fez essa solicitação, contate dpo@rayo.app.br.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendAccountDeletionEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Sua conta RAYO foi removida (LGPD)";
  const preheader = "Confirmamos a exclusão da sua conta e a anonimização dos seus dados pessoais.";
  const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Conta removida</h1>
      <p style="margin:0 0 16px 0;">Olá, ${escapeHtml(name)}.</p>
      <p style="margin:0 0 16px 0;">Confirmamos que sua conta RAYO foi removida em <strong>${date}</strong> e seus dados pessoais foram anonimizados, conforme previsto na LGPD.</p>
      <p style="margin:0 0 16px 0;">Conteúdos públicos que você havia compartilhado na comunidade foram desvinculados da sua identidade.</p>
      <p style="margin:0 0 16px 0;">Sentiremos sua falta. Se mudar de ideia, será sempre bem-vindo(a) de volta — basta criar uma nova conta.</p>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Se você não solicitou esta exclusão, entre em contato com nosso DPO em <a href="mailto:dpo@rayo.app.br" style="color:${RAYO_ACCENT};">dpo@rayo.app.br</a> imediatamente.</p>
    `,
    preheader,
  );
  const text = `Olá, ${name}.\n\nSua conta RAYO foi removida em ${date} e seus dados pessoais foram anonimizados conforme a LGPD.\n\nSentiremos sua falta. Se não foi você, contate dpo@rayo.app.br imediatamente.`;
  return sendEmail({ to: email, subject, html, text });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
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
  const preheader = `Resumo de novos interessados em "${courseTitle}".`;
  const samplesHtml = latestSamples
    .map((s) => {
      const dateStr = new Date(s.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const msg = s.message
        ? `<div style="margin-top:6px;color:${RAYO_TEXT};font-size:14px;">"${escapeHtml(s.message)}"</div>`
        : "";
      return `
        <li style="margin-bottom:12px;padding:12px 14px;background:${RAYO_BG};border-radius:8px;list-style:none;">
          <div style="color:${RAYO_TEXT};font-weight:600;">${escapeHtml(s.name)}</div>
          <div style="color:${RAYO_MUTED};font-size:13px;"><a href="mailto:${escapeHtml(s.email)}" style="color:${RAYO_ACCENT};">${escapeHtml(s.email)}</a> · ${escapeHtml(dateStr)}</div>
          ${msg}
        </li>`;
    })
    .join("");
  const samplesText = latestSamples
    .map((s) => `- ${s.name} <${s.email}>${s.message ? `\n  "${s.message}"` : ""}`)
    .join("\n");
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Novos interessados na sua turma</h1>
      <p style="margin:0 0 16px 0;">Olá, ${escapeHtml(recipientName)}.</p>
      <p style="margin:0 0 16px 0;">Você recebeu <strong>${newInterestCount}</strong> ${newInterestCount === 1 ? "novo interesse" : "novos interesses"} na sua turma <strong>${escapeHtml(courseTitle)}</strong> nas últimas 24 horas.</p>
      <ul style="margin:0 0 24px 0;padding:0;">${samplesHtml}</ul>
      <div style="text-align:center;margin:32px 0;">
        <a href="${courseLink}" style="display:inline-block;padding:14px 28px;background:${RAYO_ACCENT};color:${RAYO_BG};text-decoration:none;border-radius:8px;font-weight:600;">Abrir turma</a>
      </div>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Você está recebendo este resumo porque é o líder desta turma. Para evitar floods, enviamos no máximo um e-mail por dia por turma.</p>
    `,
    preheader,
  );
  const text = `Olá, ${recipientName}.\n\n${newInterestCount} ${newInterestCount === 1 ? "novo interesse" : "novos interesses"} na sua turma "${courseTitle}" nas últimas 24 horas:\n\n${samplesText}\n\nAbrir turma: ${courseLink}`;
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
  const preheader = `A turma "${courseTitle}" que você queria está com matrículas abertas.`;
  const safeName = escapeHtml(recipientName || "olá");
  const safeTitle = escapeHtml(courseTitle);
  const customHtml =
    customMessage && customMessage.trim()
      ? `<div style="margin:16px 0;padding:14px 16px;border-left:3px solid ${RAYO_ACCENT};background:${RAYO_BG};color:${RAYO_TEXT};border-radius:6px;">${escapeHtml(customMessage).replace(/\n/g, "<br>")}</div>`
      : "";
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">As matrículas abriram</h1>
      <p style="margin:0 0 16px 0;">Olá, ${safeName}.</p>
      <p style="margin:0 0 16px 0;">Você pediu pra ser avisado(a) quando a turma <strong>${safeTitle}</strong> abrisse — e o dia chegou! As matrículas estão abertas a partir de agora.</p>
      ${customHtml}
      <div style="text-align:center;margin:32px 0;">
        <a href="${courseLink}" style="display:inline-block;padding:14px 28px;background:${RAYO_ACCENT};color:${RAYO_BG};text-decoration:none;border-radius:8px;font-weight:600;">Garantir minha vaga</a>
      </div>
      <p style="margin:0 0 8px 0;color:${RAYO_MUTED};font-size:14px;">Se você não se inscreveu pra esse aviso, pode ignorar este e-mail com segurança.</p>
    `,
    preheader,
  );
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
  const preheader = `${p.nome} <${p.email}> via formulário /contato`;
  const safeNome = escapeHtml(p.nome);
  const safeEmail = escapeHtml(p.email);
  const safeAssunto = escapeHtml(p.assunto);
  const safeMsg = escapeHtml(p.mensagem).replace(/\n/g, "<br>");
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAYO_TEXT};">Nova mensagem em /contato</h1>
      <p style="margin:0 0 8px 0;color:${RAYO_TEXT};"><strong>Nome:</strong> ${safeNome}</p>
      <p style="margin:0 0 8px 0;color:${RAYO_TEXT};"><strong>E-mail:</strong> <a href="mailto:${safeEmail}" style="color:${RAYO_ACCENT};">${safeEmail}</a></p>
      <p style="margin:0 0 16px 0;color:${RAYO_TEXT};"><strong>Assunto:</strong> ${safeAssunto}</p>
      <div style="margin:0 0 16px 0;padding:16px;border-left:3px solid ${RAYO_ACCENT};background:${RAYO_BG};color:${RAYO_TEXT};border-radius:6px;">${safeMsg}</div>
      <p style="margin:0;color:${RAYO_MUTED};font-size:13px;">Responda diretamente a este e-mail para falar com a pessoa.</p>
    `,
    preheader,
  );
  const text = `Nova mensagem em /contato\n\nNome: ${p.nome}\nE-mail: ${p.email}\nAssunto: ${p.assunto}\n\n${p.mensagem}\n`;
  return sendEmail({ to: CONTATO_TO_EMAIL, subject, html, text });
}
