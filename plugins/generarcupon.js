import { cleanNumber, toJid } from "../utils/helpers.js";

export default {
  name: "generarcupon",
  command: ["generarcupon", "cupon"],
  owner: true,

  async run({ sock, from, msg, config }) {
    // 1. Extraemos el texto completo después del comando
    const text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || "";
    
    // Quitamos el comando (ej: /cupon) para quedarnos solo con los datos
    const fullArgs = text.split(/\s+/).slice(1).join(" ").trim();

    if (!fullArgs || !fullArgs.includes("|")) {
      await sock.sendMessage(from, { 
        text: "❌ *Faltan datos o formato incorrecto*\nUso: /cupon Nombre | Numero | Tipo\n\n*Ejemplo:* /cupon Ana | 5575210273 | contado" 
      });
      return;
    }

    const parts = fullArgs.split("|").map(x => x.trim());
    const nombre = parts[0];
    const numeroRaw = parts[1];
    const tipo = parts[2] ? parts[2].toLowerCase() : "otros";

    const numero = cleanNumber(numeroRaw);
    const jid = toJid(numero);

    if (!nombre || !numero || !jid) {
      await sock.sendMessage(from, { text: "⚠️ Error: No se pudo procesar el nombre o el número." });
      return;
    }

    // Lógica de porcentaje
    let porcentaje;
    if (tipo === "contado" || tipo === "registro") {
      porcentaje = Math.floor(Math.random() * (10 - 7 + 1)) + 7;
    } else {
      porcentaje = Math.floor(Math.random() * (7 - 5 + 1)) + 5;
    }

    const codigoCupon = `GMLUX-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    try {
      await sock.sendMessage(jid, {
        text: `¡Felicidades, *${nombre.toUpperCase()}*! 🎁✨\n\nEn *GM LUXURY* valoramos tu preferencia. Por liquidar tu compra, te hemos generado un beneficio exclusivo:\n\n🎟️ *CUPÓN:* \`${codigoCupon}\`\n💰 *VALOR:* ${porcentaje}% de descuento\n\nÚsalo en tu próxima compra de contado. ¡Aprovéchalo! 💎🛍️`
      });

      await sock.sendMessage(from, { 
        text: `✅ *Cupón Enviado*\n\n👤 Cliente: ${nombre}\n📉 Descuento: ${porcentaje}%\n🎫 Código: ${codigoCupon}` 
      });

    } catch (err) {
      console.error("Error en Cupón:", err);
      await sock.sendMessage(from, { text: `❌ Hubo un fallo al enviar el mensaje al cliente.` });
    }
  }
};
