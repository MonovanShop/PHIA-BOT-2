import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import pino from "pino";

import handler from "./handler.js";
import logger from "./utils/logger.js";
import { getText } from "./utils/helpers.js";

let isStarting = false;

async function startBot() {
  if (isStarting) return;
  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState("./sessions");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: ["TiendaBot", "Chrome", "1.0.0"],
      syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        console.clear();
        console.log(`
╔════════════════════════════════════════════╗
║              ESCANEA ESTE QR              ║
╚════════════════════════════════════════════╝
`);
        qrcode.generate(qr, { small: true });
        console.log("\n");
      }

      if (connection === "open") {
        logger.banner();
        logger.ok("Bot conectado correctamente");
        isStarting = false;
      }

      if (connection === "close") {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        logger.warn(`Conexión cerrada. Código: ${code}`);

        isStarting = false;

        if (code !== DisconnectReason.loggedOut) {
          logger.warn("Reconectando en 5 segundos...");
          setTimeout(() => startBot(), 5000);
        } else {
          logger.error("Sesión cerrada. Borra la carpeta sessions para vincular otra vez.");
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      try {
        if (type !== "notify") return;
        if (!messages || !messages.length) return;

        const msg = messages[0];
        if (!msg?.message) return;
        if (msg.key?.remoteJid === "status@broadcast") return;
        if (msg.key?.fromMe) return;

        const sender =
          msg.key?.participant ||
          msg.key?.remoteJid ||
          "";

        const from = msg.key?.remoteJid || "";
        const text = getText(msg.message)?.trim() || "";
        const messageType = Object.keys(msg.message || {})[0] || "desconocido";

        console.log("========== MENSAJE ==========");
        console.log("FROM:", from);
        console.log("SENDER:", sender);
        console.log("PUSH NAME:", msg.pushName || "(sin nombre)");
        console.log("TIPO:", messageType);
        console.log("TEXTO:", text || "(sin texto)");
        console.log("=============================");

        const context = {
          sock,
          msg,
          text,
          from,
          sender
        };

        await handler(context);
      } catch (err) {
        logger.error(`Error en messages.upsert: ${err?.message || err}`);
      }
    });

  } catch (err) {
    isStarting = false;
    logger.error(`Error iniciando bot: ${err?.message || err}`);
    setTimeout(() => startBot(), 5000);
  }
}

startBot();
