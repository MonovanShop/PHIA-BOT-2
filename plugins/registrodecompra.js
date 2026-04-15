import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { cleanNumber, toJid } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const clientesFile = path.join(rootDir, "database", "clientes.json");
const comprasFile = path.join(rootDir, "database", "compras.json");
const ticketsDir = path.join(rootDir, "tickets");

/**
 * Lee un archivo JSON y asegura que devuelva un Array.
 * Corrige automáticamente el error EISDIR si se creó una carpeta por error.
 */
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
  name: "registrodecompra",
  command: ["registrodecompra", "registrarcompra"],
  owner: true,

  async run({ sock, from, msg, ownerData, config }, args) {
    ensureDir(ticketsDir);

    const raw = args.join(" ").trim();
    if (!raw.includes("|")) {
      await sock.sendMessage(from, { 
        text: "❌ *Formato incorrecto*\nUso: /registrarcompra Nombre | Numero (adjuntando PDF)" 
      });
      return;
    }

    const [nombre, numeroRaw] = raw.split("|").map(x => x.trim());
    const numero = cleanNumber(numeroRaw);
    const jid = toJid(numero);

    if (!nombre || !numero || !jid) {
      await sock.sendMessage(from, { text: "⚠️ Datos inválidos. Verifica el nombre y número." });
      return;
    }

    const doc = msg.message?.documentMessage || msg.message?.viewOnceMessageV2?.message?.documentMessage;
    if (!doc) {
      await sock.sendMessage(from, { text: "📎 Debes adjuntar el ticket PDF al comando." });
      return;
    }

    const safeName = `${Date.now()}_ticket_${nombre.replace(/\s+/g, '_')}.pdf`;
    const savePath = path.join(ticketsDir, safeName);

    await sock.sendMessage(from, { text: `⏳ Procesando registro para *${nombre}*...` });

    try {
      // 1. Descargar el archivo
      const stream = await downloadContentFromMessage(doc, "document");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      fs.writeFileSync(savePath, buffer);

      // 2. Cargar bases de datos
      let clientes = readJson(clientesFile, []);
      let compras = readJson(comprasFile, []);

      // 3. Registrar Cliente si es nuevo
      const clienteExistente = clientes.find(c => c.numero === numero);
      if (!clienteExistente) {
        clientes.push({
          nombre,
          numero,
          jid,
          creadoEn: new Date().toISOString()
        });
        writeJson(clientesFile, clientes);
      }

      // 4. Registrar Compra
      const nuevaCompra = {
        id: `COMPRA-${Date.now()}`,
        nombre,
        numero,
        jid,
        pdf: safeName,
        registradaPor: ownerData?.name || "Admin",
        registradaEn: new Date().toISOString(),
        tienda: "GM LUXURY"
      };

      compras.push(nuevaCompra);
      writeJson(comprasFile, compras);

      // 5. Enviar mensaje de agradecimiento profesional PRIMERO
      await sock.sendMessage(jid, {
        text: `Hola, *${nombre}* 👋\n\nMuchas gracias por tu compra en *GM LUXURY* ✨\n\nEsperamos que tu experiencia haya sido excelente y que disfrutes mucho tu producto. Será un gusto atenderte nuevamente muy pronto 💎\n\nRecuerda seguirnos y agregarnos para que no te pierdas nuestras novedades, promociones exclusivas e historias 🛍️🔥\n\nCualquier duda, estamos para ayudarte 😊`
      });

      // 6. Enviar el Ticket (PDF) DESPUÉS
      await sock.sendMessage(jid, {
        document: fs.readFileSync(savePath),
        mimetype: "application/pdf",
        fileName: doc.fileName || "Ticket_GM_Luxury.pdf",
        caption: `Aquí te dejamos tu ticket de compra 📄`
      });

      // 7. Confirmación al Owner (Tú)
      await sock.sendMessage(from, { 
        text: `✅ *Venta al Contado Registrada*\n\n👤 Cliente: ${nombre}\n📱 Envío: Exitoso\n💎 Tienda: GM LUXURY` 
      });

    } catch (err) {
      console.error("Error en registrodecompra:", err);
      await sock.sendMessage(from, { text: `❌ Error crítico: ${err.message}` });
    }
  }
};
