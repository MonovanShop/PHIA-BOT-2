import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { cleanNumber, toJid } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const clientesFile = path.join(rootDir, "database", "clientes.json");
const pedidosFile = path.join(rootDir, "database", "pedidos.json");
const ticketsDir = path.join(rootDir, "tickets_pedidos");

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
  name: "registropedido",
  command: ["pedido", "registrarpedido"],
  owner: true,

  async run({ sock, from, msg, ownerData, config }, args) {
    ensureDir(ticketsDir);

    const raw = args.join(" ").trim();
    if (!raw.includes("|")) {
      await sock.sendMessage(from, { 
        text: "❌ *Formato incorrecto*\nUso: /pedido Nombre | Numero (adjuntando PDF)" 
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
      await sock.sendMessage(from, { text: "📎 Adjunta el comprobante del pedido en PDF." });
      return;
    }

    const safeName = `${Date.now()}_pedido_${nombre.replace(/\s+/g, '_')}.pdf`;
    const savePath = path.join(ticketsDir, safeName);

    await sock.sendMessage(from, { text: `⏳ Registrando pedido para *${nombre}*...` });

    try {
      const stream = await downloadContentFromMessage(doc, "document");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      fs.writeFileSync(savePath, buffer);

      let clientes = readJson(clientesFile, []);
      let pedidos = readJson(pedidosFile, []);

      if (!clientes.find(c => c.numero === numero)) {
        clientes.push({ nombre, numero, jid, creadoEn: new Date().toISOString() });
        writeJson(clientesFile, clientes);
      }

      pedidos.push({
        id: `PEDIDO-${Date.now()}`,
        nombre,
        numero,
        pdf: safeName,
        estado: "Sobre Pedido",
        fecha: new Date().toISOString()
      });
      writeJson(pedidosFile, pedidos);

      // 1. Mensaje de texto profesional (Sobre Pedido)
      await sock.sendMessage(jid, {
        text: `Hola, *${nombre}* 👋\n\nGracias por tu confianza en *GM LUXURY* ✨\n\nTu producto se encuentra en modalidad sobre pedido 🛍️\n\nMientras llega, puedes ir realizando abonos en cualquier momento para avanzar con tu pago 💳\n\nUna vez entregado tu producto, contarás con un plazo máximo de 3 semanas para liquidarlo 🙌\n\nSi tienes alguna duda sobre tus pagos, con gusto estamos para ayudarte 😊\n\nNo olvides seguirnos para mantenerte al tanto de nuestras novedades y promociones 🔥`
      });

      // 2. Envío del ticket de pedido
      await sock.sendMessage(jid, {
        document: fs.readFileSync(savePath),
        mimetype: "application/pdf",
        fileName: doc.fileName || "Comprobante_Pedido.pdf",
        caption: `Aquí tienes el comprobante de tu pedido 📄`
      });

      await sock.sendMessage(from, { 
        text: `✅ *Pedido Registrado*\n\n👤 Cliente: ${nombre}\n📦 Modalidad: Sobre pedido\n💎 Tienda: GM LUXURY` 
      });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: `❌ Error: ${err.message}` });
    }
  }
};
