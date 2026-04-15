import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { cleanNumber, toJid } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const clientesFile = path.join(rootDir, "database", "clientes.json");
const mixtosFile = path.join(rootDir, "database", "mixtos.json");
const ticketsDir = path.join(rootDir, "tickets_mixtos");

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
  name: "registromixto",
  command: ["mixto", "pedidoyadeudo"],
  owner: true,

  async run({ sock, from, msg, ownerData, config }, args) {
    ensureDir(ticketsDir);

    const raw = args.join(" ").trim();
    if (!raw.includes("|")) {
      await sock.sendMessage(from, { 
        text: "❌ *Formato incorrecto*\nUso: /mixto Nombre | Numero (adjuntando PDF)" 
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
      await sock.sendMessage(from, { text: "📎 Adjunta el ticket o comprobante en PDF." });
      return;
    }

    const safeName = `${Date.now()}_mixto_${nombre.replace(/\s+/g, '_')}.pdf`;
    const savePath = path.join(ticketsDir, safeName);

    await sock.sendMessage(from, { text: `⏳ Registrando estado mixto para *${nombre}*...` });

    try {
      const stream = await downloadContentFromMessage(doc, "document");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      fs.writeFileSync(savePath, buffer);

      let clientes = readJson(clientesFile, []);
      let mixtos = readJson(mixtosFile, []);

      if (!clientes.find(c => c.numero === numero)) {
        clientes.push({ nombre, numero, jid, creadoEn: new Date().toISOString() });
        writeJson(clientesFile, clientes);
      }

      mixtos.push({
        id: `MIX-${Date.now()}`,
        nombre,
        numero,
        pdf: safeName,
        tipo: "Pedido con Adeudo Anterior",
        fecha: new Date().toISOString()
      });
      writeJson(mixtosFile, mixtos);

      // 1. Mensaje de texto profesional (Estatus Mixto)
      await sock.sendMessage(jid, {
        text: `Hola, *${nombre}* 👋\n\nGracias por tu confianza en *GM LUXURY* ✨\n\nTe recordamos que actualmente cuentas con un saldo pendiente de tu compra anterior 💳, y además tienes un producto sobre pedido en proceso 🛍️\n\nPuedes seguir realizando abonos en cualquier momento para ir cubriendo ambos pagos 🙌\n\nEs importante mantener tus pagos al corriente para evitar retrasos en la entrega de tu pedido.\n\nUna vez que tu producto llegue, tendrás un plazo máximo de 3 semanas para liquidar el total.\n\nCualquier duda, estamos para apoyarte 😊\n\nNo olvides seguirnos para ver novedades y promociones 🔥`
      });

      // 2. Envío del PDF
      await sock.sendMessage(jid, {
        document: fs.readFileSync(savePath),
        mimetype: "application/pdf",
        fileName: doc.fileName || "Estatus_Cuenta.pdf",
        caption: `Aquí tienes tu comprobante actualizado 📄`
      });

      await sock.sendMessage(from, { 
        text: `✅ *Registro Mixto Exitoso*\n\n👤 Cliente: ${nombre}\n⚠️ Nota: Adeudo + Pedido\n💎 Tienda: GM LUXURY` 
      });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: `❌ Error: ${err.message}` });
    }
  }
};
