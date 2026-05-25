import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporter = null;

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePath(pathname = "/") {
  if (!pathname) {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function buildEmailLayout({ eyebrow, title, intro, bodyHtml, ctaLabel, ctaUrl, outro }) {
  const safeEyebrow = escapeHtml(eyebrow);
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeOutro = outro ? `<p style="margin:0;color:#475569;line-height:1.7;">${escapeHtml(outro)}</p>` : "";
  const actionBlock = ctaLabel && ctaUrl
    ? `
      <div style="margin:28px 0;">
        <a
          href="${escapeHtml(ctaUrl)}"
          style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:600;"
        >
          ${escapeHtml(ctaLabel)}
        </a>
      </div>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.7;">
        Jika tombol tidak bisa dibuka, gunakan tautan ini:
        <br />
        <a href="${escapeHtml(ctaUrl)}" style="color:#0f766e;">${escapeHtml(ctaUrl)}</a>
      </p>
    `
    : "";

  return `
    <!doctype html>
    <html lang="id">
      <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 12px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
            ${safeEyebrow}
          </p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">${safeTitle}</h1>
          <p style="margin:0;color:#334155;line-height:1.8;">${safeIntro}</p>
          <div style="margin:24px 0;color:#334155;line-height:1.8;">
            ${bodyHtml}
          </div>
          ${actionBlock}
          ${safeOutro}
          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;line-height:1.7;">
            Email otomatis dari ${escapeHtml(config.appName)}.
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildFromAddress() {
  return {
    name: config.mailFromName || config.appName,
    address: config.mailFromEmail,
  };
}

function buildReplyToAddress() {
  if (!config.mailReplyToEmail) {
    return undefined;
  }

  return {
    name: config.mailReplyToName || config.mailFromName || config.appName,
    address: config.mailReplyToEmail,
  };
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.brevoSmtpHost,
      port: config.brevoSmtpPort,
      secure: config.brevoSmtpSecure,
      auth: {
        user: config.brevoSmtpLogin,
        pass: config.brevoSmtpKey,
      },
    });
  }

  return transporter;
}

function normalizeMailError(error) {
  const rawMessage = String(error?.response || error?.message || "");

  if (rawMessage.includes("Your SMTP account is not yet activated")) {
    const friendlyError = new Error(
      "SMTP Brevo terhubung, tetapi akun SMTP Anda belum diaktivasi. Aktifkan SMTP account di Brevo atau hubungi support Brevo terlebih dahulu.",
    );
    friendlyError.cause = error;
    return friendlyError;
  }

  return error instanceof Error ? error : new Error("Gagal mengirim email.");
}

export function isMailDeliveryConfigured() {
  return Boolean(config.brevoSmtpLogin && config.brevoSmtpKey && config.mailFromEmail);
}

export function assertMailDeliveryConfigured() {
  if (isMailDeliveryConfigured()) {
    return;
  }

  throw new Error(
    "SMTP Brevo belum dikonfigurasi. Lengkapi BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, dan MAIL_FROM_EMAIL di backend/.env.",
  );
}

export function buildFrontendUrl(pathname = "/") {
  return `${config.frontendAppUrl}${normalizePath(pathname)}`;
}

function buildTicketPath(role, ticketId) {
  if (!ticketId) {
    return "/login";
  }

  if (role === "technician") {
    return `/technician/tickets/${ticketId}`;
  }

  if (role === "admin" || role === "super_admin") {
    return `/admin/tickets/${ticketId}`;
  }

  return `/user/tickets/${ticketId}`;
}

export async function sendMailMessage({ to, subject, html, text }) {
  assertMailDeliveryConfigured();

  try {
    return await getTransporter().sendMail({
      from: buildFromAddress(),
      to: [
        {
          name: to.name || "",
          address: to.email,
        },
      ],
      replyTo: buildReplyToAddress(),
      subject,
      text,
      html,
    });
  } catch (error) {
    throw normalizeMailError(error);
  }
}

export async function sendAccountActivationEmail({ recipientName, recipientEmail, activationUrl }) {
  const subject = `[${config.appName}] Aktivasi akun Anda`;
  const html = buildEmailLayout({
    eyebrow: "Aktivasi Akun",
    title: "Selesaikan pendaftaran akun",
    intro: `Halo ${recipientName || recipientEmail}, akun Anda sudah dibuat dan tinggal diaktifkan.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        Klik tombol di bawah untuk mengaktifkan akun dan mulai menggunakan ${escapeHtml(config.appName)}.
      </p>
      <p style="margin:0;color:#475569;">
        Link aktivasi berlaku selama ${escapeHtml(String(config.accountActivationTtlHours))} jam.
      </p>
    `,
    ctaLabel: "Aktifkan Akun",
    ctaUrl: activationUrl,
    outro: "Jika Anda tidak merasa mendaftar, abaikan email ini.",
  });
  const text = [
    `Halo ${recipientName || recipientEmail},`,
    "",
    `Akun Anda di ${config.appName} sudah dibuat.`,
    `Aktifkan akun melalui tautan berikut: ${activationUrl}`,
    `Link ini berlaku selama ${config.accountActivationTtlHours} jam.`,
  ].join("\n");

  return sendMailMessage({
    to: {
      name: recipientName,
      email: recipientEmail,
    },
    subject,
    html,
    text,
  });
}

export async function sendPasswordResetEmail({ recipientName, recipientEmail, resetUrl }) {
  const subject = `[${config.appName}] Reset password`;
  const html = buildEmailLayout({
    eyebrow: "Reset Password",
    title: "Atur password baru Anda",
    intro: `Halo ${recipientName || recipientEmail}, kami menerima permintaan reset password untuk akun Anda.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        Gunakan tombol di bawah untuk membuat password baru.
      </p>
      <p style="margin:0;color:#475569;">
        Link reset berlaku selama ${escapeHtml(String(config.passwordResetTtlMinutes))} menit.
      </p>
    `,
    ctaLabel: "Reset Password",
    ctaUrl: resetUrl,
    outro: "Jika Anda tidak meminta reset password, abaikan email ini dan password lama tetap aman.",
  });
  const text = [
    `Halo ${recipientName || recipientEmail},`,
    "",
    `Kami menerima permintaan reset password untuk akun ${config.appName}.`,
    `Atur password baru melalui tautan berikut: ${resetUrl}`,
    `Link ini berlaku selama ${config.passwordResetTtlMinutes} menit.`,
  ].join("\n");

  return sendMailMessage({
    to: {
      name: recipientName,
      email: recipientEmail,
    },
    subject,
    html,
    text,
  });
}

export async function sendTicketNotificationEmail({ recipient, title, message, ticketId, ticketNumber }) {
  if (!recipient?.email) {
    return null;
  }

  const ticketUrl = buildFrontendUrl(buildTicketPath(recipient.role, ticketId));
  const subjectSuffix = ticketNumber ? ` - ${ticketNumber}` : "";
  const subject = `[${config.appName}] ${title}${subjectSuffix}`;
  const html = buildEmailLayout({
    eyebrow: "Notifikasi Tiket",
    title,
    intro: `Halo ${recipient.full_name || recipient.email}, ada pembaruan tiket yang perlu Anda lihat.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(message)}</p>
      ${ticketNumber ? `<p style="margin:0;color:#475569;">Nomor tiket: <strong>${escapeHtml(ticketNumber)}</strong></p>` : ""}
    `,
    ctaLabel: "Buka Detail Tiket",
    ctaUrl: ticketUrl,
    outro: "Anda menerima email ini karena terlibat pada tiket terkait di sistem.",
  });
  const text = [
    `Halo ${recipient.full_name || recipient.email},`,
    "",
    message,
    ticketNumber ? `Nomor tiket: ${ticketNumber}` : null,
    `Buka detail tiket: ${ticketUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendMailMessage({
    to: {
      name: recipient.full_name,
      email: recipient.email,
    },
    subject,
    html,
    text,
  });
}
