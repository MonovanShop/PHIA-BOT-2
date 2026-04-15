import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const folders = ["sessions", "logs", "database"];

for (const folder of folders) {
  const fullPath = path.join(__dirname, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

process.on("uncaughtException", (err) => {
  logger.error(`uncaughtException: ${err?.message || err}`);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`unhandledRejection: ${reason?.message || reason}`);
});

console.clear();
console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║            INICIANDO TIENDA BOT            ║
║                                            ║
╚════════════════════════════════════════════╝
`);

await import("./main.js");
