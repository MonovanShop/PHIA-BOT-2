const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");

const config = require("./config");
const handler = require("./handler");
const logger = require("./utils/logger");
const { getText } = require("./utils/helpers");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./sessions");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("Escanea el QR:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      logger.info("Bot conectado");
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        logger.warn("Reconectando...");
        startBot();
      } else {
        logger.error("Sesion cerrada");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = getText(msg.message);
    if (!text) return;

    const context = {
      sock,
      msg,
      text,
      from: msg.key.remoteJid,
      sender: msg.key.participant || msg.key.remoteJid
    };

    handler(context);
  });
}

startBot();
