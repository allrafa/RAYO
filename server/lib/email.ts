import { Resend } from "resend";
import { logger } from "../utils/logger.js";

const RESEND_API_KEY = process.env.resend_api_key || process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "RAIO <onboarding@resend.dev>";
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

const RAIO_ACCENT = "#FFB300";
const RAIO_BG = "#0F172A";
const RAIO_TEXT = "#F8FAFC";
const RAIO_MUTED = "#94A3B8";

function layout(body: string, preheader: string): string {
  const privacyUrl = `${APP_URL}/?tab=privacy`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RAIO</title>
</head>
<body style="margin:0;padding:0;background:${RAIO_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${RAIO_TEXT};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${RAIO_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#1E293B;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px 32px;text-align:center;">
              <div style="display:inline-block;padding:8px 16px;border-radius:8px;background:${RAIO_ACCENT};color:${RAIO_BG};font-weight:700;font-size:20px;letter-spacing:1px;">RAIO</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;color:${RAIO_TEXT};font-size:16px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #334155;color:${RAIO_MUTED};font-size:12px;line-height:1.5;text-align:center;">
              Você está recebendo este e-mail porque utiliza a plataforma RAIO.<br>
              <a href="${privacyUrl}" style="color:${RAIO_MUTED};text-decoration:underline;">Política de Privacidade</a>
              · &copy; ${new Date().getFullYear()} RAIO
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationCodeEmail(email: string, code: string): Promise<SendResult> {
  const subject = `Seu código de verificação RAIO: ${code}`;
  const preheader = `Use o código ${code} para continuar seu cadastro na RAIO.`;
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAIO_TEXT};">Confirme seu e-mail</h1>
      <p style="margin:0 0 24px 0;color:${RAIO_TEXT};">Use o código abaixo para continuar seu cadastro na RAIO. Ele expira em <strong>10 minutos</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <div style="display:inline-block;padding:18px 32px;border-radius:12px;background:${RAIO_BG};color:${RAIO_ACCENT};font-size:32px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;">${code}</div>
      </div>
      <p style="margin:0 0 8px 0;color:${RAIO_MUTED};font-size:14px;">Se você não solicitou este código, pode ignorar este e-mail com segurança.</p>
    `,
    preheader,
  );
  const text = `Seu código de verificação RAIO é: ${code}\n\nO código expira em 10 minutos.\n\nSe você não solicitou este código, pode ignorar este e-mail.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Bem-vindo(a) à RAIO!";
  const preheader = "Sua jornada de transformação familiar começa agora.";
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAIO_TEXT};">Olá, ${escapeHtml(name)}!</h1>
      <p style="margin:0 0 16px 0;">Que alegria ter você na <strong>RAIO</strong>. Sua jornada de transformação familiar começa agora.</p>
      <p style="margin:0 0 16px 0;">Aqui você encontra:</p>
      <ul style="margin:0 0 24px 20px;padding:0;color:${RAIO_TEXT};">
        <li style="margin-bottom:8px;">Cursos e livros sobre relacionamento, fé e propósito</li>
        <li style="margin-bottom:8px;">Uma comunidade engajada de pessoas como você</li>
        <li style="margin-bottom:8px;">Missões diárias para fortalecer hábitos saudáveis</li>
        <li style="margin-bottom:8px;">Conselheiro IA para te apoiar quando precisar</li>
      </ul>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;background:${RAIO_ACCENT};color:${RAIO_BG};text-decoration:none;border-radius:8px;font-weight:600;">Acessar a plataforma</a>
      </div>
    `,
    preheader,
  );
  const text = `Olá, ${name}!\n\nQue alegria ter você na RAIO. Sua jornada de transformação familiar começa agora.\n\nAcesse: ${APP_URL}`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendDataExportEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Seus dados foram exportados (LGPD)";
  const preheader = "Sua solicitação de exportação de dados foi processada com sucesso.";
  const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAIO_TEXT};">Solicitação de exportação concluída</h1>
      <p style="margin:0 0 16px 0;">Olá, ${escapeHtml(name)}.</p>
      <p style="margin:0 0 16px 0;">Confirmamos que sua solicitação de exportação de dados foi processada em <strong>${date}</strong>, conforme previsto na LGPD (Lei Geral de Proteção de Dados).</p>
      <p style="margin:0 0 16px 0;">O arquivo JSON com todos os seus dados foi disponibilizado para download diretamente no aplicativo no momento da solicitação.</p>
      <p style="margin:0 0 8px 0;color:${RAIO_MUTED};font-size:14px;">Se você não fez essa solicitação, entre em contato com nosso DPO em <a href="mailto:dpo@raio.app" style="color:${RAIO_ACCENT};">dpo@raio.app</a>.</p>
    `,
    preheader,
  );
  const text = `Olá, ${name}.\n\nSua solicitação de exportação de dados foi processada em ${date} conforme a LGPD.\n\nO arquivo JSON foi disponibilizado para download diretamente no aplicativo.\n\nSe você não fez essa solicitação, contate dpo@raio.app.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendAccountDeletionEmail(email: string, name: string): Promise<SendResult> {
  const subject = "Sua conta RAIO foi removida (LGPD)";
  const preheader = "Confirmamos a exclusão da sua conta e a anonimização dos seus dados pessoais.";
  const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const html = layout(
    `
      <h1 style="margin:0 0 16px 0;font-size:22px;color:${RAIO_TEXT};">Conta removida</h1>
      <p style="margin:0 0 16px 0;">Olá, ${escapeHtml(name)}.</p>
      <p style="margin:0 0 16px 0;">Confirmamos que sua conta RAIO foi removida em <strong>${date}</strong> e seus dados pessoais foram anonimizados, conforme previsto na LGPD.</p>
      <p style="margin:0 0 16px 0;">Conteúdos públicos que você havia compartilhado na comunidade foram desvinculados da sua identidade.</p>
      <p style="margin:0 0 16px 0;">Sentiremos sua falta. Se mudar de ideia, será sempre bem-vindo(a) de volta — basta criar uma nova conta.</p>
      <p style="margin:0 0 8px 0;color:${RAIO_MUTED};font-size:14px;">Se você não solicitou esta exclusão, entre em contato com nosso DPO em <a href="mailto:dpo@raio.app" style="color:${RAIO_ACCENT};">dpo@raio.app</a> imediatamente.</p>
    `,
    preheader,
  );
  const text = `Olá, ${name}.\n\nSua conta RAIO foi removida em ${date} e seus dados pessoais foram anonimizados conforme a LGPD.\n\nSentiremos sua falta. Se não foi você, contate dpo@raio.app imediatamente.`;
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
