const net = require("node:net");
const tls = require("node:tls");
const os = require("node:os");

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function smtpSettings() {
  const host = process.env.SMTP_HOST || "";
  const user = process.env.SMTP_USER || "";
  const from = process.env.SMTP_FROM || user || "";
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: boolEnv("SMTP_SECURE", false),
    user,
    password: process.env.SMTP_PASSWORD || "",
    from,
    configured: Boolean(host && from),
  };
}

function isEmailConfigured() {
  return smtpSettings().configured;
}

function extractEmailAddress(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/<([^>]+)>/);
  return (match ? match[1] : text).trim();
}

function encodeHeader(value = "") {
  const text = String(value || "");
  if (/^[\x00-\x7F]*$/.test(text)) return text;
  return `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function normalizeBody(value = "") {
  return String(value || "")
    .replace(/\r?\n/g, "\r\n")
    .replace(/^\./gm, "..");
}

function connect(settings) {
  return new Promise((resolve, reject) => {
    const socket = settings.secure
      ? tls.connect({ host: settings.host, port: settings.port, servername: settings.host })
      : net.connect({ host: settings.host, port: settings.port });
    socket.setTimeout(Number(process.env.SMTP_TIMEOUT_MS || 15000));
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timeout"));
    });
    if (settings.secure) {
      socket.once("secureConnect", () => resolve(socket));
    } else {
      socket.once("connect", () => resolve(socket));
    }
  });
}

function createSmtpClient(socket) {
  let buffer = "";
  const waiters = [];

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    flushWaiters();
  });

  function flushWaiters() {
    while (waiters.length) {
      const response = readCompleteResponse();
      if (!response) return;
      waiters.shift().resolve(response);
    }
  }

  function readCompleteResponse() {
    const lines = buffer.split(/\r?\n/);
    if (!buffer.endsWith("\n")) return null;
    const completeIndex = lines.findIndex((line) => /^\d{3} /.test(line));
    if (completeIndex === -1) return null;
    const responseLines = lines.slice(0, completeIndex + 1);
    buffer = lines.slice(completeIndex + 1).join("\r\n");
    return responseLines.join("\n");
  }

  function readResponse() {
    const immediate = readCompleteResponse();
    if (immediate) return Promise.resolve(immediate);
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  }

  async function command(line, expectedCodes = [250]) {
    socket.write(`${line}\r\n`);
    const response = await readResponse();
    const code = Number(response.slice(0, 3));
    if (!expectedCodes.includes(code)) throw new Error(`SMTP error ${response.replace(/\s+/g, " ").trim()}`);
    return response;
  }

  return { command, readResponse };
}

async function sendMail({ to, subject, text }) {
  const settings = smtpSettings();
  if (!settings.configured) {
    return { sent: false, configured: false, reason: "smtp_not_configured" };
  }
  const socket = await connect(settings);
  const client = createSmtpClient(socket);
  try {
    await client.readResponse();
    await client.command(`EHLO ${os.hostname() || "localhost"}`, [250]);
    if (!settings.secure && boolEnv("SMTP_STARTTLS", settings.port === 587)) {
      await client.command("STARTTLS", [220]);
      socket.removeAllListeners("data");
      const upgraded = tls.connect({ socket, servername: settings.host });
      await new Promise((resolve, reject) => {
        upgraded.once("secureConnect", resolve);
        upgraded.once("error", reject);
      });
      const secureClient = createSmtpClient(upgraded);
      await secureClient.command(`EHLO ${os.hostname() || "localhost"}`, [250]);
      await sendMailCommands(secureClient, settings, to, subject, text);
      upgraded.end();
      return { sent: true, configured: true };
    }
    await sendMailCommands(client, settings, to, subject, text);
    return { sent: true, configured: true };
  } finally {
    socket.end();
  }
}

async function sendMailCommands(client, settings, to, subject, text) {
  if (settings.user && settings.password) {
    await client.command("AUTH LOGIN", [334]);
    await client.command(Buffer.from(settings.user).toString("base64"), [334]);
    await client.command(Buffer.from(settings.password).toString("base64"), [235]);
  }
  const fromAddress = extractEmailAddress(settings.from);
  await client.command(`MAIL FROM:<${fromAddress}>`, [250]);
  await client.command(`RCPT TO:<${extractEmailAddress(to)}>`, [250, 251]);
  await client.command("DATA", [354]);
  const message = [
    `From: ${settings.from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeBody(text),
    ".",
  ].join("\r\n");
  await client.command(message, [250]);
  await client.command("QUIT", [221, 250]);
}

async function sendPasswordResetEmail({ to, username, resetLink, expiresMinutes = 60 }) {
  return sendMail({
    to,
    subject: "ตั้งรหัสผ่านใหม่ GasFlow",
    text: [
      `สวัสดี ${username || ""}`,
      "",
      "ระบบได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี GasFlow ของคุณ",
      `กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ภายใน ${expiresMinutes} นาที:`,
      resetLink,
      "",
      "ถ้าคุณไม่ได้เป็นคนขอ สามารถละเว้นอีเมลนี้ได้",
    ].join("\n"),
  });
}

module.exports = {
  isEmailConfigured,
  sendMail,
  sendPasswordResetEmail,
};
