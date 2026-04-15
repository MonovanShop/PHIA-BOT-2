import { jidDecode } from "@whiskeysockets/baileys";

export function getText(message = {}) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ""
  );
}

export function cleanNumber(number = "") {
  if (!number) return "";
  // Extraemos solo los números del JID o string
  const rawNumber = number.split("@")[0];
  return String(rawNumber).replace(/\D/g, "");
}

/**
 * Normaliza para COMPARACIONES (isOwner).
 * Mantiene el estándar de 12 dígitos (52...) para que coincida con lo que WhatsApp
 * reporta en los mensajes entrantes.
 */
export function normalizeWhatsAppNumber(number = "") {
  let cleaned = cleanNumber(number);
  if (!cleaned) return "";

  if (cleaned.length === 10) {
    cleaned = `52${cleaned}`;
  }

  // Si tiene el '1' de México (13 dígitos), se lo quitamos para comparar contra el config.js
  if (cleaned.startsWith("521") && cleaned.length === 13) {
    cleaned = "52" + cleaned.substring(3);
  }

  return cleaned;
}

/**
 * Crea el JID para ENVÍO de mensajes.
 * Para México (52), DEBE incluir el '1' (521) si es un número móvil,
 * de lo contrario el mensaje nunca sale.
 */
export function toJid(number = "") {
  let cleaned = cleanNumber(number);
  if (!cleaned) return null;

  // Si solo pasas 10 dígitos (ej: 5575...), le ponemos el prefijo completo
  if (cleaned.length === 10) {
    cleaned = `521${cleaned}`;
  } 
  // Si pasaste 12 dígitos (ej: 5255...) y es de México, le insertamos el '1'
  else if (cleaned.startsWith("52") && !cleaned.startsWith("521") && cleaned.length === 12) {
    cleaned = "521" + cleaned.substring(2);
  }

  return `${cleaned}@s.whatsapp.net`;
}

export function isOwner(sender = "", owners = []) {
  if (!sender) return false;
  
  // Si el remitente es un LID (el ID largo que vimos en consola), comparamos directo
  if (sender.includes("@lid")) {
    const lidRaw = sender.split("@")[0];
    return owners.some(owner => owner.number === lidRaw);
  }

  const senderClean = normalizeWhatsAppNumber(sender);
  return owners.some(owner => {
    const ownerClean = normalizeWhatsAppNumber(owner.number);
    return senderClean === ownerClean;
  });
}

export function getOwnerData(sender = "", owners = []) {
  if (!sender) return null;

  if (sender.includes("@lid")) {
    const lidRaw = sender.split("@")[0];
    return owners.find(owner => owner.number === lidRaw) || null;
  }

  const senderClean = normalizeWhatsAppNumber(sender);
  return owners.find(owner => {
    const ownerClean = normalizeWhatsAppNumber(owner.number);
    return senderClean === ownerClean;
  }) || null;
}
