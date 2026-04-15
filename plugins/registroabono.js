import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { cleanNumber, toJid } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const clientesFile = path.join(rootDir, "database", "clientes.json");
const abonosFile = path.join(rootDir, "database", "abonos.json");
const ticketsDir = path.join(rootDir, "tickets_abonos");

function readJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const stats = fs.lstatSync(filePath);
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : fallback;
  } catch (err) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export default {
  name: "registroabono",
  command: ["abono", "registrarabono"],
  owner: true,

  async run({ sock, from, msg, ownerData, config }, args) {
    ensureDir(ticketsDir);

    const raw = args.join(" ").trim();
    if (!raw.includes("|")) {
      await sock.sendMessage(from, { 
        text: "❌ *Formato incorrecto*\nUso: /abono Nombre | Numero (adjuntando PDF)" 
      });
      return;
    }

    const [nombre, numeroRaw] = raw.split("|").map(x => x.trim());
    const numero = cleanNumber(numeroRaw);
    const jid = toJid(numero);

    if (!nombre || !numero || !jid) {
      await sock.sendMessage(from, { text: "⚠️ Datos inválidos." });
      return;
    }

    const doc = msg.message?.documentMessage || msg.message?.viewOnceMessageV2?.message?.documentMessage;
    if (!doc) {
      await sock.sendMessage(from, { text: "📎 Adjunta el ticket de abono en PDF." });
      return;
    }

    const safeName = `${Date.now()}_abono_${nombre.replace(/\s+/g, '_')}.pdf`;
    const savePath = path.join(ticketsDir, safeName);

    await sock.sendMessage(from, { text: `⏳ Registrando abono para *${nombre}*...` });

    try {
      const stream = await downloadContentFromMessage(doc, "document");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      fs.writeFileSync(savePath, buffer);

      let clientes = readJson(clientesFile, []);
      let abonos = readJson(abonosFile, []);

      if (!clientes.find(c => c.numero === numero)) {
        clientes.push({ nombre, numero, jid, creadoEn: new Date().toISOString() });
        writeJson(clientesFile, clientes);
      }

      abonos.push({
        id: `ABONO-${Date.now()}`,
        nombre,
        numero,
        pdf: safeName,
        fecha: new Date().toISOString()
      });
      writeJson(abonosFile, abonos);

      // 1. Mensaje de texto profesional
      await sock.sendMessage(jid, {
        text: `Hola, *${nombre}* 👋\n\nGracias por tu compra en *GM LUXURY* ✨\n\nTe recordamos que tu producto se está manejando en modalidad de abonos a 3 quincenas 💳\n\nPuedes ir realizando tus pagos de manera puntual para completar tu compra sin inconvenientes 🙌\n\nCualquier duda sobre tus pagos o fechas, con gusto estamos para ayudarte 😊\n\nNo olvides seguirnos para ver nuestras novedades, promociones y nuevos productos 🛍️🔥`
      });

      // 2. Envío del ticket de abono
      await sock.sendMessage(jid, {
        document: fs.readFileSync(savePath),
        mimetype: "application/pdf",
        fileName: doc.fileName || "Ticket_Abono.pdf",
        caption: `Aquí tienes tu comprobante de abono 📄`
      });

      await sock.sendMessage(from, { 
        text: `✅ *Abono Registrado*\n\n👤 Cliente: ${nombre}\n📈 Estado: Modalidad 3 quincenas\n💎 Tienda: GM LUXURY` 
      });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: `❌ Error: ${err.message}` });
    }
  }
};
