import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import config from "./config.js";
import logger from "./utils/logger.js";
import { isOwner, getOwnerData } from "./utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.join(__dirname, "plugins");

let plugins = [];

/**
 * Carga todos los plugins de la carpeta /plugins de forma dinámica
 */
async function loadPlugins() {
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir);
    return;
  }

  const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith(".js"));
  const loaded = [];

  for (const file of files) {
    try {
      const filePath = path.join(pluginsDir, file);
      const fileUrl = `${pathToFileURL(filePath).href}?update=${Date.now()}`;
      const mod = await import(fileUrl);
      const plugin = mod.default;

      if (!plugin) {
        logger.warn(`Plugin sin export default: ${file}`);
        continue;
      }

      loaded.push(plugin);
      logger.plugin(`${plugin.name || file} cargado`);
    } catch (err) {
      logger.error(`Error cargando plugin ${file}: ${err.message}`);
    }
  }

  plugins = loaded;
}

// Cargar plugins al iniciar
await loadPlugins();

export default async function handler(ctx) {
  const { text, sock, from, sender, msg } = ctx;

  // 1. REGISTRO UNIVERSAL (Muestra todo en consola)
  // Usamos una validación para 'text' por si es un mensaje multimedia sin subtítulo
  const messageContent = text || (msg.message?.stickerMessage ? "[Sticker]" : "[Multimedia/Sistema]");
  
  console.log("--------------------------------------------");
  console.log(`📩 MENSAJE: ${messageContent}`);
  console.log(`👤 DE: ${sender}`);
  console.log(`📍 ID: ${from}`);
  console.log("--------------------------------------------");

  logger.msg(sender, messageContent);

  // 2. CONTEXTO DE AUTENTICACIÓN
  const ctxWithAuth = {
    ...ctx,
    isOwner: isOwner(sender, config.owners),
    ownerData: getOwnerData(sender, config.owners),
    config
  };

  // 3. DEBUG OWNER (Para detectar LIDs y JIDs)
  if (ctxWithAuth.isOwner) {
    console.log(`⭐ OWNER DETECTADO: ${ctxWithAuth.ownerData?.name || 'Admin'}`);
  }

  // 4. EJECUCIÓN GLOBAL (.all)
  // Se ejecuta para CUALQUIER mensaje (sea comando o no)
  for (const plugin of plugins) {
    try {
      if (typeof plugin.all === "function") {
        await plugin.all(ctxWithAuth);
      }
    } catch (err) {
      logger.error(`Error en all() de ${plugin.name}: ${err?.message || err}`);
    }
  }

  // 5. VALIDACIÓN DE PREFIJO
  // Si no hay texto o no empieza con prefijo, aquí se detiene el flujo de comandos
  const usedPrefix = config.prefixes.find(prefix => text && text.startsWith(prefix));
  if (!usedPrefix) return;

  // 6. PARSEO DE COMANDO
  const args = text.slice(usedPrefix.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();

  logger.cmd(command);

  // 7. BÚSQUEDA DEL PLUGIN
  const plugin = plugins.find(p =>
    Array.isArray(p.command)
      ? p.command.map(x => x.toLowerCase()).includes(command)
      : String(p.command).toLowerCase() === command
  );

  // Si no existe el comando, ignoramos silenciosamente
  if (!plugin) return;

  // 8. VERIFICACIÓN DE PERMISOS
  if (plugin.owner && !ctxWithAuth.isOwner) {
    await sock.sendMessage(from, {
      text: "❌ Este comando es exclusivo para el Dueño del Bot."
    });
    return;
  }

  // 9. EJECUCIÓN DEL PLUGIN (.run)
  try {
    await plugin.run(ctxWithAuth, args, usedPrefix);
  } catch (err) {
    logger.error(`Error en ejecución de ${plugin.name}: ${err?.message || err}`);
    await sock.sendMessage(from, {
      text: "⚠️ Ocurrió un error al procesar el comando."
    });
  }
}
