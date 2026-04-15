import { cleanNumber, toJid } from "../utils/helpers.js";

export default {
  name: "enviarmensaje",
  command: ["enviarmensaje", "mensaje", "sendmsg"],
  owner: true,

  async run({ sock, from }, args) {
    const raw = args.join(" ").trim();

    if (!raw) {
      await sock.sendMessage(from, {
        text: "❌ *Formato incorrecto*\n\nUso:\n/enviarmensaje Nombre Numero Mensaje\n\nEjemplo:\n/enviarmensaje Alexa 5555555555 hola cómo estás"
      });
      return;
    }

    const parts = raw.split(" ");

    if (parts.length < 3) {
      await sock.sendMessage(from, {
        text: "⚠️ Debes escribir:\n/enviarmensaje Nombre Numero Mensaje"
      });
      return;
    }

    const nombre = parts[0];
    const numeroRaw = parts[1];
    const mensaje = parts.slice(2).join(" ").trim();

    const numero = cleanNumber(numeroRaw);
    const jid = toJid(numero);

    if (!nombre || !numero || !mensaje || !jid) {
      await sock.sendMessage(from, {
        text: "⚠️ Datos inválidos.\nVerifica nombre, número y mensaje."
      });
      return;
    }

    try {
      await sock.sendMessage(from, {
        text: `⏳ Enviando mensaje a *${nombre}*...`
      });

      await sock.sendMessage(jid, {
        text: `Hola, *${nombre}* 👋\n\n${mensaje}`
      });

      await sock.sendMessage(from, {
        text: `✅ *Mensaje enviado*\n\n👤 Nombre: ${nombre}\n📱 Número: ${numero}\n💬 Mensaje: ${mensaje}`
      });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, {
        text: `❌ Error al enviar el mensaje:\n${err.message}`
      });
    }
  }
};
